import csv
import io
import json
import logging
import os
import queue
import re
import shutil
import subprocess
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

import psutil
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


def _parse_env_line(line: str):
    stripped = line.strip()
    if not stripped or stripped.startswith('#') or '=' not in stripped:
        return None

    key, value = stripped.split('=', 1)
    key = key.strip()
    value = value.strip()

    if not key:
        return None

    if value[:1] == value[-1:] and value.startswith(("'", '"')):
        value = value[1:-1]
    else:
        value = value.split(' #', 1)[0].rstrip()

    return key, value


def load_dotenv_files() -> None:
    app_dir = Path(__file__).resolve().parent
    repo_root = app_dir.parent.parent
    dotenv_paths = [
        repo_root / '.env',
        app_dir / '.env',
    ]

    for dotenv_path in dotenv_paths:
        if not dotenv_path.exists():
            continue

        for raw_line in dotenv_path.read_text(encoding='utf-8').splitlines():
            parsed = _parse_env_line(raw_line)
            if parsed is None:
                continue

            key, value = parsed
            os.environ.setdefault(key, value)


load_dotenv_files()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'crawl-daddy-secret')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SSE queues (kept for backward-compat with any SSE clients): scan_id -> queue.Queue
_progress_queues: dict = {}
_progress_lock = threading.Lock()

# Polling state store: scan_id -> state dict
_scan_states: dict = {}
_scan_state_lock = threading.Lock()
_STATE_TTL = 3600  # seconds before a finished scan is eligible for cleanup

# Concurrency guard — only 1 scan at a time to stay within thread/memory limits
_active_scans: int = 0
_active_scans_lock = threading.Lock()
_scan_started_at: float | None = None        # wall time when the current scan began
_active_scan_id: str | None = None           # scan_id of the currently running scan
_current_scan_cancel: threading.Event | None = None  # set to abort the running scan
MAX_SCAN_DURATION = 900                      # 15 min hard ceiling — after this a new scan may start
MAX_CONSECUTIVE_PS_ERRORS = 5               # abort PageSpeed phase after this many consecutive failures

# Scan history (tracked since server startup)
_startup_time: float = time.time()
_total_scans_completed: int = 0
_last_scan_time: float | None = None
_recent_scan_urls: list = []   # last 10 individual page URLs scanned
_history_lock = threading.Lock()


def _cleanup_scan_states() -> None:
    """Remove finished states older than _STATE_TTL (called opportunistically)."""
    cutoff = time.time() - _STATE_TTL
    with _scan_state_lock:
        expired = [
            sid for sid, s in _scan_states.items()
            if s.get('status') in ('done', 'error') and s.get('_ts', 0) < cutoff
        ]
        for sid in expired:
            del _scan_states[sid]


class _ProgressProxy:
    """Drop-in replacement for a raw queue that also writes to _scan_states.

    All crawl helpers call proxy.put(event_dict) exactly as they would call
    queue.put().  The proxy forwards the call to the real SSE queue (if one is
    connected) AND mirrors every event into _scan_states[scan_id] so the
    polling endpoint always has fresh data.
    """

    def __init__(self, real_q, scan_id: str):
        self._q = real_q
        self._sid = scan_id

    def put(self, item) -> None:
        # Forward to SSE queue if a client is listening
        if self._q is not None:
            self._q.put(item)
        self._update(item)

    # crawl_with_playwright's push() helper calls put_nowait on the queue.
    # Queue.put_nowait() is identical to put() on an unbounded queue, so we
    # alias it here so the proxy behaves identically to a real queue.
    put_nowait = put

    def _update(self, item) -> None:
        if not self._sid or item is None:
            return
        with _scan_state_lock:
            state = _scan_states.get(self._sid)
            if state is None:
                return
            t = item.get('type')
            if t == 'discovered':
                state['discovered'] = item.get('n', 0)
                state['total'] = item.get('total')
            elif t == 'page':
                state['scanned'] = item.get('scanned', 0)
                state['total'] = item.get('total', state.get('total'))
                state['current_url'] = item.get('url', '')
            elif t == 'pagespeed':
                state['phase'] = 'pagespeed'
                state['ps_total'] = item.get('total', 0)
                state['ps_done'] = 0
            elif t == 'pagespeed_progress':
                state['ps_done'] = item.get('done', 0)
                state['ps_total'] = item.get('total', state.get('ps_total', 0))
            elif t == 'result':
                state['status'] = 'done'
                state['phase'] = 'done'
                state['pages'] = item.get('pages', [])
                state['total'] = item.get('total', 0)
                state['method'] = item.get('method', '')
                state['domain'] = item.get('domain', '')
                state['_ts'] = time.time()
            elif t == 'error':
                state['status'] = 'error'
                state['error'] = item.get('message', 'Unknown error')
                state['_ts'] = time.time()

HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; CrawlDaddy/1.0)'}
REQUEST_TIMEOUT = 15
MAX_PAGES = 300
CRAWL_DELAY = 0.3
MAX_WORKERS = 2          # tuned lower to avoid Playwright heap crashes on large crawls
MAX_SITEMAP_URLS = 500
MAX_LINKS_PER_PAGE = 250
MAX_HEADING_TAGS = 6
PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
PAGESPEED_WORKERS = 3    # keep some parallelism without saturating memory
PAGESPEED_RESULT_FIELDS = (
    'ps_performance',
    'ps_seo',
    'ps_accessibility',
    'ps_lcp',
    'ps_cls',
)
GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile'


class BrowserUnavailableError(RuntimeError):
    """Raised when Playwright cannot launch a working browser runtime."""


def fetch_pagespeed(url, api_key):
    """Call Google PageSpeed Insights v5 (mobile strategy) for one URL.

    Returns a dict with ps_performance, ps_seo, ps_accessibility, ps_lcp, ps_cls.
    All values default to 'N/A' on any error so callers never need to guard.
    """
    na = {
        'ps_performance': 'N/A',
        'ps_seo': 'N/A',
        'ps_accessibility': 'N/A',
        'ps_lcp': 'N/A',
        'ps_cls': 'N/A',
    }
    try:
        params = {
            'url': url,
            'strategy': 'mobile',
            'key': api_key,
            'category': ['performance', 'seo', 'accessibility'],
        }
        resp = requests.get(PAGESPEED_API_URL, params=params, timeout=60)
        resp.raise_for_status()
        d = resp.json()
        lr = d.get('lighthouseResult', {})
        cats = lr.get('categories', {})
        audits = lr.get('audits', {})

        def _score(cat):
            raw = cats.get(cat, {}).get('score')
            return round(raw * 100) if raw is not None else 'N/A'

        lcp_raw = audits.get('largest-contentful-paint', {}).get('numericValue')
        lcp = round(lcp_raw / 1000, 2) if lcp_raw is not None else 'N/A'

        cls_raw = audits.get('cumulative-layout-shift', {}).get('numericValue')
        cls_val = round(cls_raw, 3) if cls_raw is not None else 'N/A'

        return {
            'ps_performance': _score('performance'),
            'ps_seo': _score('seo'),
            'ps_accessibility': _score('accessibility'),
            'ps_lcp': lcp,
            'ps_cls': cls_val,
        }
    except Exception as exc:
        logger.warning('PageSpeed error for %s: %s', url, exc)
        return na


def is_pagespeed_error(result):
    return all(result.get(field) == 'N/A' for field in PAGESPEED_RESULT_FIELDS)

def find_chromium_path():
    env_path = (
        os.environ.get('REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        or os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH')
        or os.environ.get('CHROMIUM_PATH')
    )
    if env_path and os.path.exists(env_path) and os.access(env_path, os.X_OK):
        return env_path
    return (
        shutil.which('chromium') or
        shutil.which('chromium-browser') or
        shutil.which('google-chrome')
    )


CHROMIUM_PATH = find_chromium_path()
PLAYWRIGHT_ARGS = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-zygote',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
]


def ensure_chromium_installed():
    global CHROMIUM_PATH
    CHROMIUM_PATH = find_chromium_path()
    if CHROMIUM_PATH:
        logger.info("Using system Chromium at %s", CHROMIUM_PATH)
        return CHROMIUM_PATH

    if os.environ.get('CRAWLDADDY_AUTO_INSTALL_CHROMIUM', '').lower() not in ('1', 'true', 'yes'):
        logger.info(
            "Chromium was not found on PATH; continuing without browser install "
            "and using the static crawl fallback when needed."
        )
        return None

    try:
        result = subprocess.run(
            ['playwright', 'install', 'chromium'],
            capture_output=True, text=True, timeout=120,
        )
        logger.info("playwright install: %s", (result.stdout or '')[-200:])
        CHROMIUM_PATH = find_chromium_path()
        return CHROMIUM_PATH
    except Exception as e:
        logger.warning("Could not run playwright install chromium: %s", e)
        return None


def normalize_url(url):
    url, _ = urldefrag(url)
    return url.rstrip('/').lower()


def is_same_domain(url, base_domain):
    netloc = urlparse(url).netloc.replace('www.', '')
    return netloc == base_domain


def clean_text(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def _get_meta_content(soup, attr_name, attr_value):
    tag = soup.find('meta', attrs={attr_name: re.compile(f'^{re.escape(attr_value)}$', re.I)})
    return clean_text(tag.get('content', '')) if tag else ''


def _extract_jsonld_fields(soup):
    schema_types = set()
    date_published = ''
    author_name = ''

    def extract_author(author):
        if not author:
            return ''
        if isinstance(author, list):
            for item in author:
                found = extract_author(item)
                if found:
                    return found
            return ''
        if isinstance(author, dict):
            return clean_text(author.get('name', ''))
        return clean_text(str(author))

    def visit(node):
        nonlocal date_published, author_name
        if not node:
            return
        if isinstance(node, list):
            for item in node:
                visit(item)
            return
        if not isinstance(node, dict):
            return

        type_value = node.get('@type')
        if isinstance(type_value, list):
            for value in type_value:
                schema_types.add(str(value))
        elif type_value:
            schema_types.add(str(type_value))

        if not date_published and node.get('datePublished'):
            date_published = str(node['datePublished'])
        if not author_name and node.get('author'):
            author_name = extract_author(node.get('author'))

        if isinstance(node.get('@graph'), list):
            for item in node['@graph']:
                visit(item)

    for script in soup.find_all('script', attrs={'type': re.compile(r'^application/ld\+json$', re.I)}):
        raw = script.string or script.get_text()
        raw = clean_text(raw)
        if not raw:
            continue
        try:
            visit(json.loads(raw))
        except Exception:
            continue

    return sorted(schema_types), date_published, author_name


def extract_seo_from_html(html, url, base_domain='', status_code=200, load_time_ms=0):
    soup = BeautifulSoup(html, 'lxml')

    title = clean_text(soup.title.string if soup.title and soup.title.string else '')
    h1_tags = [clean_text(tag.get_text(' ', strip=True)) for tag in soup.find_all('h1')][:MAX_HEADING_TAGS]
    h1_tags = [tag for tag in h1_tags if tag]
    h2_tags = [clean_text(tag.get_text(' ', strip=True)) for tag in soup.find_all('h2')][:MAX_HEADING_TAGS]
    h2_tags = [tag for tag in h2_tags if tag]
    h3_tags = [clean_text(tag.get_text(' ', strip=True)) for tag in soup.find_all('h3')][:MAX_HEADING_TAGS]
    h3_tags = [tag for tag in h3_tags if tag]

    meta_desc = _get_meta_content(soup, 'name', 'description')
    meta_keywords = _get_meta_content(soup, 'name', 'keywords')
    robots_meta = _get_meta_content(soup, 'name', 'robots')
    og_title = _get_meta_content(soup, 'property', 'og:title')
    og_description = _get_meta_content(soup, 'property', 'og:description')
    og_image = _get_meta_content(soup, 'property', 'og:image')
    twitter_card = _get_meta_content(soup, 'name', 'twitter:card')

    canonical = ''
    canonical_tag = soup.find(
        'link',
        attrs={'rel': lambda value: value and 'canonical' in [str(item).lower() for item in (value if isinstance(value, list) else [value])]},
    )
    if canonical_tag and canonical_tag.get('href'):
        canonical = urljoin(url, clean_text(canonical_tag.get('href')))

    hreflang_langs = []
    for tag in soup.find_all('link', attrs={'hreflang': True}):
        rel = tag.get('rel') or []
        rel_values = [str(item).lower() for item in (rel if isinstance(rel, list) else [rel])]
        if 'alternate' not in rel_values:
            continue
        lang = clean_text(tag.get('hreflang'))
        if lang:
            hreflang_langs.append(lang)

    image_tags = soup.find_all('img')
    image_count = len(image_tags)
    images_missing_alt = sum(1 for tag in image_tags if not clean_text(tag.get('alt', '')))

    text_soup = BeautifulSoup(html, 'lxml')
    for tag_name in ('script', 'style', 'nav', 'footer', 'aside', 'header'):
        for tag in text_soup.find_all(tag_name):
            tag.decompose()
    body = text_soup.body or text_soup
    body_text = clean_text(body.get_text(' ', strip=True))
    word_count = len(re.findall(r'\b\w+\b', body_text)) if body_text else 0

    links = []
    seen_links = set()
    internal_links = 0
    external_links = 0
    for anchor in soup.find_all('a', href=True):
        raw_href = clean_text(anchor.get('href'))
        if not raw_href or raw_href.startswith(('mailto:', 'tel:', 'javascript:')):
            continue
        resolved = urljoin(url, raw_href)
        parsed = urlparse(resolved)
        if parsed.scheme not in ('http', 'https'):
            continue
        normalized = normalize_url(resolved)
        if normalized not in seen_links:
            seen_links.add(normalized)
            if len(links) < MAX_LINKS_PER_PAGE:
                links.append(resolved)
        netloc = parsed.netloc.replace('www.', '')
        if netloc == base_domain:
            internal_links += 1
        elif netloc:
            external_links += 1

    schema_types, date_published, author_name = _extract_jsonld_fields(soup)

    canonical_matches = ''
    if canonical:
        canonical_matches = 'Yes' if normalize_url(canonical) == normalize_url(url) else 'No'

    reading_time = round(word_count / 238, 1)
    title_length = len(title)
    meta_desc_length = len(meta_desc)
    jsonld_types_str = ', '.join(schema_types)

    seo_score = 0
    if h1_tags:
        seo_score += 20
    if 30 <= title_length <= 60:
        seo_score += 15
    if 120 <= meta_desc_length <= 160:
        seo_score += 15
    if word_count >= 900:
        seo_score += 20
    elif word_count >= 300:
        seo_score += 10
    if canonical:
        seo_score += 10
    if og_title:
        seo_score += 5
    if images_missing_alt == 0:
        seo_score += 5
    if jsonld_types_str:
        seo_score += 10

    issues_list = []
    if not h1_tags:
        issues_list.append('No H1')
    if not (30 <= title_length <= 60):
        issues_list.append('Short title')
    if not (120 <= meta_desc_length <= 160):
        issues_list.append('Bad meta desc')
    if word_count < 300:
        issues_list.append('Thin content')
    if canonical_matches == 'No':
        issues_list.append('Not self-canonical')
    if not og_title:
        issues_list.append('No OG tags')
    if not jsonld_types_str:
        issues_list.append('No structured data')
    if images_missing_alt > 0:
        issues_list.append('Missing alt tags')

    return {
        'url': url,
        'status_code': status_code,
        'seo_score': seo_score,
        'issues': ', '.join(issues_list),
        'title': title,
        'title_length': title_length,
        'h1_tags': h1_tags,
        'h2_tags': h2_tags,
        'h3_tags': h3_tags,
        'meta_description': meta_desc,
        'meta_description_length': meta_desc_length,
        'meta_keywords': meta_keywords,
        'robots_meta': robots_meta,
        'og_title': og_title,
        'og_description': og_description,
        'og_image': og_image,
        'twitter_card': twitter_card,
        'canonical_url': canonical,
        'canonical_matches': canonical_matches,
        'jsonld_schema_types': jsonld_types_str,
        'date_published': date_published,
        'author': author_name,
        'hreflang_languages': ', '.join(hreflang_langs),
        'word_count': word_count,
        'reading_time': reading_time,
        'internal_links': internal_links,
        'external_links': external_links,
        'image_count': image_count,
        'images_missing_alt': images_missing_alt,
        'load_time_ms': load_time_ms,
        'links': links,
    }


# ---------------------------------------------------------------------------
# SEO extraction (sync)
# ---------------------------------------------------------------------------

def extract_seo_from_page(pw_page, url, base_domain='', status_code=200, load_time_ms=0):
    title = pw_page.title() or ''

    h1_tags = [el.inner_text().strip() for el in pw_page.query_selector_all('h1') if el.inner_text().strip()]
    h2_tags = [el.inner_text().strip() for el in pw_page.query_selector_all('h2') if el.inner_text().strip()][:6]
    h3_tags = [el.inner_text().strip() for el in pw_page.query_selector_all('h3') if el.inner_text().strip()][:6]

    # Batch all remaining DOM queries into one JS evaluate call
    page_data = pw_page.evaluate('''() => {
        function getMeta(sel) {
            const el = document.querySelector(sel);
            return el ? (el.getAttribute('content') || '').trim() : '';
        }
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script,style,nav,footer,aside,header').forEach(t => t.remove());
        const imgs = Array.from(document.querySelectorAll('img'));
        const jsonldRaw = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => { try { return JSON.parse(s.textContent); } catch(e) { return null; } })
            .filter(Boolean);
        return {
            meta_description:        getMeta('meta[name="description" i]'),
            meta_keywords:           getMeta('meta[name="keywords" i]'),
            og_title:                getMeta('meta[property="og:title"]'),
            og_description:          getMeta('meta[property="og:description"]'),
            og_image:                getMeta('meta[property="og:image"]'),
            twitter_card:            getMeta('meta[name="twitter:card" i]'),
            robots_meta:             getMeta('meta[name="robots" i]'),
            canonical:               canonicalEl ? (canonicalEl.getAttribute('href') || '').trim() : '',
            body_text:               clone.innerText || clone.textContent || '',
            links:                   Array.from(document.querySelectorAll('a[href]'))
                                         .map(a => a.href)
                                         .filter(h => h && !h.startsWith('mailto:')
                                                         && !h.startsWith('tel:')
                                                         && !h.startsWith('javascript:')),
            hreflang:                Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
                                         .map(l => l.getAttribute('hreflang')).filter(Boolean),
            image_count:             imgs.length,
            images_missing_alt:      imgs.filter(i => !(i.getAttribute('alt') || '').trim()).length,
            jsonld:                  jsonldRaw,
        };
    }''')

    meta_desc     = page_data['meta_description']
    meta_keywords = page_data['meta_keywords']
    og_title      = page_data['og_title']
    og_description= page_data['og_description']
    og_image      = page_data['og_image']
    twitter_card  = page_data['twitter_card']
    robots_meta   = page_data['robots_meta']
    canonical     = page_data['canonical']
    body_text     = page_data['body_text']
    links         = page_data['links']
    hreflang_langs= page_data['hreflang']
    image_count   = page_data['image_count']
    images_missing_alt = page_data['images_missing_alt']
    jsonld_data   = page_data['jsonld']

    word_count = len(re.findall(r'\b\w+\b', body_text)) if body_text else 0

    # --- Parse JSON-LD (handles @graph and nested lists) ---
    schema_types  = []
    date_published= ''
    author_name   = ''

    def parse_jsonld_node(node):
        nonlocal date_published, author_name
        if not isinstance(node, dict):
            return
        t = node.get('@type')
        if t:
            schema_types.extend(t if isinstance(t, list) else [str(t)])
        if not date_published and node.get('datePublished'):
            date_published = str(node['datePublished'])
        if not author_name and node.get('author'):
            a = node['author']
            if isinstance(a, dict):
                author_name = a.get('name', '') or str(a)
            elif isinstance(a, list) and a:
                first = a[0]
                author_name = (first.get('name', '') if isinstance(first, dict) else str(first))
            else:
                author_name = str(a)
        for sub in node.get('@graph', []):
            parse_jsonld_node(sub)

    for item in jsonld_data:
        if isinstance(item, list):
            for sub in item:
                parse_jsonld_node(sub)
        else:
            parse_jsonld_node(item)

    # --- Derived fields ---
    canonical_matches = ''
    if canonical:
        canonical_matches = 'Yes' if normalize_url(canonical) == normalize_url(url) else 'No'

    internal_links = external_links = 0
    for link in links:
        netloc = urlparse(link).netloc.replace('www.', '')
        if netloc == base_domain:
            internal_links += 1
        elif netloc:
            external_links += 1

    reading_time = round(word_count / 238, 1)

    # --- SEO Score (0–100) ---
    title_length      = len(title)
    meta_desc_length  = len(meta_desc)
    jsonld_types_str  = ', '.join(sorted(set(schema_types)))

    seo_score = 0
    if h1_tags:                              seo_score += 20
    if 30 <= title_length <= 60:             seo_score += 15
    if 120 <= meta_desc_length <= 160:       seo_score += 15
    if word_count >= 900:                    seo_score += 20
    elif word_count >= 300:                  seo_score += 10
    if canonical:                            seo_score += 10
    if og_title:                             seo_score += 5
    if images_missing_alt == 0:              seo_score += 5
    if jsonld_types_str:                     seo_score += 10

    # --- Issues flags ---
    issues_list = []
    if not h1_tags:                          issues_list.append('🔴 No H1')
    if not (30 <= title_length <= 60):       issues_list.append('🟡 Short title')
    if not (120 <= meta_desc_length <= 160): issues_list.append('🟡 Bad meta desc')
    if word_count < 300:                     issues_list.append('⚪ Thin content')
    if canonical_matches == 'No':            issues_list.append('🔵 Not self-canonical')
    if not og_title:                         issues_list.append('🟠 No OG tags')
    if not jsonld_types_str:                 issues_list.append('⚫ No structured data')
    if images_missing_alt > 0:              issues_list.append('🖼️ Missing alt tags')
    issues_str = ', '.join(issues_list)

    return {
        'url':                    url,
        'status_code':            status_code,
        'seo_score':              seo_score,
        'issues':                 issues_str,
        'title':                  title,
        'title_length':           title_length,
        'h1_tags':                h1_tags,
        'h2_tags':                h2_tags,
        'h3_tags':                h3_tags,
        'meta_description':       meta_desc,
        'meta_description_length':meta_desc_length,
        'meta_keywords':          meta_keywords,
        'robots_meta':            robots_meta,
        'og_title':               og_title,
        'og_description':         og_description,
        'og_image':               og_image,
        'twitter_card':           twitter_card,
        'canonical_url':          canonical,
        'canonical_matches':      canonical_matches,
        'jsonld_schema_types':    jsonld_types_str,
        'date_published':         date_published,
        'author':                 author_name,
        'hreflang_languages':     ', '.join(hreflang_langs),
        'word_count':             word_count,
        'reading_time':           reading_time,
        'internal_links':         internal_links,
        'external_links':         external_links,
        'image_count':            image_count,
        'images_missing_alt':     images_missing_alt,
        'load_time_ms':           load_time_ms,
        'links':                  links,
    }


def extract_seo_from_page_compact(pw_page, url, base_domain='', status_code=200, load_time_ms=0):
    page_data = pw_page.evaluate(
        '''({ baseDomain, headingLimit, linkLimit }) => {
            function trimText(value) {
                return (value || '').replace(/\\s+/g, ' ').trim();
            }

            function getMeta(sel) {
                const el = document.querySelector(sel);
                return el ? trimText(el.getAttribute('content')) : '';
            }

            function collectHeadings(selector) {
                return Array.from(document.querySelectorAll(selector))
                    .map((el) => trimText(el.innerText || el.textContent))
                    .filter(Boolean)
                    .slice(0, headingLimit);
            }

            function extractAuthorName(author) {
                if (!author) return '';
                if (Array.isArray(author)) {
                    for (const item of author) {
                        const found = extractAuthorName(item);
                        if (found) return found;
                    }
                    return '';
                }
                if (typeof author === 'object') {
                    return trimText(author.name || '');
                }
                return trimText(String(author));
            }

            const canonicalEl = document.querySelector('link[rel="canonical"]');
            const imgs = Array.from(document.querySelectorAll('img'));
            const bodyText = trimText(document.body?.innerText || document.body?.textContent || '');
            const wordCount = bodyText ? (bodyText.match(/\\b\\w+\\b/g) || []).length : 0;

            const crawlLinks = [];
            const seenLinks = new Set();
            let internalLinks = 0;
            let externalLinks = 0;

            for (const href of Array.from(document.querySelectorAll('a[href]'), (a) => a.href)) {
                if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
                    continue;
                }

                try {
                    const parsed = new URL(href, window.location.href);
                    const normalizedHref = parsed.href.split('#')[0];
                    const hostname = parsed.hostname.replace(/^www\\./i, '');

                    if (hostname === baseDomain) {
                        internalLinks += 1;
                        if (crawlLinks.length < linkLimit && !seenLinks.has(normalizedHref)) {
                            seenLinks.add(normalizedHref);
                            crawlLinks.push(normalizedHref);
                        }
                    } else if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                        externalLinks += 1;
                    }
                } catch (_) {
                    // Ignore malformed links.
                }
            }

            const schemaTypes = new Set();
            let datePublished = '';
            let authorName = '';

            function visitJsonLd(node) {
                if (!node) return;
                if (Array.isArray(node)) {
                    node.forEach(visitJsonLd);
                    return;
                }
                if (typeof node !== 'object') return;

                const typeValue = node['@type'];
                if (Array.isArray(typeValue)) {
                    typeValue.forEach((value) => schemaTypes.add(String(value)));
                } else if (typeValue) {
                    schemaTypes.add(String(typeValue));
                }

                if (!datePublished && node.datePublished) {
                    datePublished = String(node.datePublished);
                }
                if (!authorName && node.author) {
                    authorName = extractAuthorName(node.author);
                }

                if (Array.isArray(node['@graph'])) {
                    node['@graph'].forEach(visitJsonLd);
                }
            }

            for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
                const raw = trimText(script.textContent || '');
                if (!raw) continue;
                try {
                    visitJsonLd(JSON.parse(raw));
                } catch (_) {
                    // Ignore invalid JSON-LD blocks.
                }
            }

            return {
                title: trimText(document.title),
                h1_tags: collectHeadings('h1'),
                h2_tags: collectHeadings('h2'),
                h3_tags: collectHeadings('h3'),
                meta_description: getMeta('meta[name="description" i]'),
                meta_keywords: getMeta('meta[name="keywords" i]'),
                og_title: getMeta('meta[property="og:title"]'),
                og_description: getMeta('meta[property="og:description"]'),
                og_image: getMeta('meta[property="og:image"]'),
                twitter_card: getMeta('meta[name="twitter:card" i]'),
                robots_meta: getMeta('meta[name="robots" i]'),
                canonical: canonicalEl ? trimText(canonicalEl.getAttribute('href')) : '',
                hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
                    .map((el) => trimText(el.getAttribute('hreflang')))
                    .filter(Boolean),
                image_count: imgs.length,
                images_missing_alt: imgs.filter((img) => !trimText(img.getAttribute('alt'))).length,
                word_count: wordCount,
                internal_links: internalLinks,
                external_links: externalLinks,
                crawl_links: crawlLinks,
                schema_types: Array.from(schemaTypes),
                date_published: datePublished,
                author: authorName,
            };
        }''',
        {
            'baseDomain': base_domain,
            'headingLimit': MAX_HEADING_TAGS,
            'linkLimit': MAX_LINKS_PER_PAGE,
        },
    )

    title = page_data['title']
    h1_tags = page_data['h1_tags']
    h2_tags = page_data['h2_tags']
    h3_tags = page_data['h3_tags']
    meta_desc = page_data['meta_description']
    meta_keywords = page_data['meta_keywords']
    og_title = page_data['og_title']
    og_description = page_data['og_description']
    og_image = page_data['og_image']
    twitter_card = page_data['twitter_card']
    robots_meta = page_data['robots_meta']
    canonical = page_data['canonical']
    hreflang_langs = page_data['hreflang']
    image_count = page_data['image_count']
    images_missing_alt = page_data['images_missing_alt']
    word_count = page_data['word_count']
    internal_links = page_data['internal_links']
    external_links = page_data['external_links']
    links = page_data['crawl_links']
    date_published = page_data['date_published']
    author_name = page_data['author']
    schema_types = page_data['schema_types']

    canonical_matches = ''
    if canonical:
        canonical_matches = 'Yes' if normalize_url(canonical) == normalize_url(url) else 'No'

    reading_time = round(word_count / 238, 1)
    title_length = len(title)
    meta_desc_length = len(meta_desc)
    jsonld_types_str = ', '.join(sorted(set(schema_types)))

    seo_score = 0
    if h1_tags:
        seo_score += 20
    if 30 <= title_length <= 60:
        seo_score += 15
    if 120 <= meta_desc_length <= 160:
        seo_score += 15
    if word_count >= 900:
        seo_score += 20
    elif word_count >= 300:
        seo_score += 10
    if canonical:
        seo_score += 10
    if og_title:
        seo_score += 5
    if images_missing_alt == 0:
        seo_score += 5
    if jsonld_types_str:
        seo_score += 10

    issues_list = []
    if not h1_tags:
        issues_list.append('No H1')
    if not (30 <= title_length <= 60):
        issues_list.append('Short title')
    if not (120 <= meta_desc_length <= 160):
        issues_list.append('Bad meta desc')
    if word_count < 300:
        issues_list.append('Thin content')
    if canonical_matches == 'No':
        issues_list.append('Not self-canonical')
    if not og_title:
        issues_list.append('No OG tags')
    if not jsonld_types_str:
        issues_list.append('No structured data')
    if images_missing_alt > 0:
        issues_list.append('Missing alt tags')

    return {
        'url': url,
        'status_code': status_code,
        'seo_score': seo_score,
        'issues': ', '.join(issues_list),
        'title': title,
        'title_length': title_length,
        'h1_tags': h1_tags,
        'h2_tags': h2_tags,
        'h3_tags': h3_tags,
        'meta_description': meta_desc,
        'meta_description_length': meta_desc_length,
        'meta_keywords': meta_keywords,
        'robots_meta': robots_meta,
        'og_title': og_title,
        'og_description': og_description,
        'og_image': og_image,
        'twitter_card': twitter_card,
        'canonical_url': canonical,
        'canonical_matches': canonical_matches,
        'jsonld_schema_types': jsonld_types_str,
        'date_published': date_published,
        'author': author_name,
        'hreflang_languages': ', '.join(hreflang_langs),
        'word_count': word_count,
        'reading_time': reading_time,
        'internal_links': internal_links,
        'external_links': external_links,
        'image_count': image_count,
        'images_missing_alt': images_missing_alt,
        'load_time_ms': load_time_ms,
        'links': links,
    }


# ---------------------------------------------------------------------------
# Sitemap fetching (plain requests, no browser needed)
# ---------------------------------------------------------------------------

def _is_xml_response(resp):
    ct = resp.headers.get('content-type', '')
    return (
        'xml' in ct or
        '<urlset' in resp.text[:2000] or
        '<sitemapindex' in resp.text[:2000]
    )


def _fetch_xml(url):
    """Fetch a URL and return the response if it looks like a sitemap, else None."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        if resp.status_code == 200 and _is_xml_response(resp):
            return resp
    except Exception:
        pass
    return None


def _parse_locs(content):
    """Return all <loc> text values from a sitemap XML string."""
    try:
        soup = BeautifulSoup(content, 'lxml-xml')
        return [loc.get_text(strip=True) for loc in soup.find_all('loc') if loc.get_text(strip=True)]
    except Exception:
        return []


def _is_sitemap_index(content):
    return '<sitemapindex' in content[:4000]


def _collect_urls_from_sitemap(sitemap_url, collected, visited_sitemaps, depth=0):
    """
    Recursively resolve a sitemap URL into page URLs.
    - If the document is a <sitemapindex>, fetch each child sitemap.
    - If the document is a <urlset>, harvest the <loc> entries.
    Stops early once collected reaches MAX_SITEMAP_URLS.
    """
    if depth > 5 or sitemap_url in visited_sitemaps or len(collected) >= MAX_SITEMAP_URLS:
        return
    visited_sitemaps.add(sitemap_url)

    resp = _fetch_xml(sitemap_url)
    if not resp:
        return

    locs = _parse_locs(resp.text)

    if _is_sitemap_index(resp.text):
        # Each <loc> is a child sitemap — recurse into them
        for child_url in locs:
            if len(collected) >= MAX_SITEMAP_URLS:
                break
            _collect_urls_from_sitemap(child_url, collected, visited_sitemaps, depth + 1)
    else:
        # Regular <urlset> — each <loc> is a page URL
        for loc in locs:
            if len(collected) >= MAX_SITEMAP_URLS:
                break
            if loc not in collected:
                collected.append(loc)


def fetch_sitemap_urls(base_url):
    base = base_url.rstrip('/')
    candidates = [
        base + '/sitemap.xml',
        base + '/sitemap_index.xml',
        base + '/sitemap/',
        base + '/news-sitemap.xml',
        base + '/post-sitemap.xml',
        base + '/page-sitemap.xml',
    ]

    collected = []
    visited_sitemaps = set()

    for candidate in candidates:
        if len(collected) >= MAX_SITEMAP_URLS:
            break
        _collect_urls_from_sitemap(candidate, collected, visited_sitemaps)
        if collected:
            # Found a working sitemap — no need to try further candidates
            break

    seen = set()
    deduped = []
    for u in collected:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped[:MAX_SITEMAP_URLS]


# ---------------------------------------------------------------------------
# Crawler: one Playwright + browser per worker thread (thread-local)
# ---------------------------------------------------------------------------

def crawl_with_playwright(start_url, base_domain, sitemap_urls=None, max_pages=MAX_PAGES, progress_q=None):
    pages = []
    visited = set()
    browser_error = None

    def push(event):
        if progress_q is not None:
            try:
                progress_q.put_nowait(event)
            except Exception:
                pass

    launch_kwargs = {'headless': True, 'args': PLAYWRIGHT_ARGS}
    if CHROMIUM_PATH:
        launch_kwargs['executable_path'] = CHROMIUM_PATH

    # Each worker thread owns its own Playwright instance and browser.
    # We track them so we can clean up after the executor shuts down.
    _local = threading.local()
    _thread_resources = []          # list of (pw, browser) — appended under lock
    _resources_lock = threading.Lock()

    def remember_browser_error(exc):
        nonlocal browser_error
        with _resources_lock:
            if browser_error is None:
                browser_error = exc

    def get_browser():
        """Return this thread's browser, lazily creating it on first call."""
        if not hasattr(_local, 'browser'):
            pw = sync_playwright().start()
            try:
                browser = pw.chromium.launch(**launch_kwargs)
            except Exception as exc:
                remember_browser_error(exc)
                try:
                    pw.stop()
                except Exception:
                    pass
                raise BrowserUnavailableError(str(exc)) from exc
            _local.pw = pw
            _local.browser = browser
            with _resources_lock:
                _thread_resources.append((pw, browser))
        return _local.browser

    def fetch_one(url):
        """
        Runs in a worker thread.
        Uses the thread's own browser; creates a fresh context per URL call.
        """
        browser = get_browser()
        context = browser.new_context(
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            java_script_enabled=True,
            ignore_https_errors=True,
        )
        context.set_default_timeout(REQUEST_TIMEOUT * 1000)
        try:
            page = context.new_page()
            time.sleep(CRAWL_DELAY)
            t0 = time.time()
            resp = page.goto(url, wait_until='domcontentloaded', timeout=REQUEST_TIMEOUT * 1000)
            load_time_ms = int((time.time() - t0) * 1000)
            if not resp or resp.status >= 400:
                return None, []
            try:
                page.wait_for_load_state('networkidle', timeout=5000)
            except Exception:
                pass
            data = extract_seo_from_page_compact(
                page, page.url,
                base_domain=base_domain,
                status_code=resp.status,
                load_time_ms=load_time_ms,
            )
            links = data.pop('links', [])
            return data, links
        except PlaywrightTimeout:
            logger.warning("Timeout: %s", url)
            return None, []
        except Exception as e:
            logger.warning("Error %s: %s", url, e)
            return None, []
        finally:
            context.close()

    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:

            # --- Sitemap mode: all URLs known upfront ---
            if sitemap_urls:
                mode = 'sitemap'
                to_crawl = []
                for u in sitemap_urls:
                    norm = normalize_url(u)
                    if norm not in visited and is_same_domain(u, base_domain):
                        visited.add(norm)
                        to_crawl.append(u)
                    if len(to_crawl) >= max_pages:
                        break

                push({'type': 'discovered', 'n': len(to_crawl), 'total': len(to_crawl)})

                futures = {executor.submit(fetch_one, u): u for u in to_crawl}
                for fut in as_completed(futures):
                    try:
                        data, _ = fut.result()
                    except Exception as exc:
                        logger.warning("Worker failed for %s: %s", futures[fut], exc)
                        continue
                    if data:
                        pages.append(data)
                        push({'type': 'page', 'scanned': len(pages),
                              'total': len(to_crawl), 'url': data['url']})

            # --- BFS mode: discover URLs level by level ---
            else:
                mode = 'bfs'
                visited.add(normalize_url(start_url))
                bfs_queue = [start_url]

                while bfs_queue and len(pages) < max_pages:
                    remaining = max_pages - len(pages)
                    batch, bfs_queue = bfs_queue[:remaining], bfs_queue[remaining:]

                    futures = {executor.submit(fetch_one, u): u for u in batch}
                    for fut in as_completed(futures):
                        try:
                            data, links = fut.result()
                        except Exception as exc:
                            logger.warning("Worker failed for %s: %s", futures[fut], exc)
                            continue
                        if data and len(pages) < max_pages:
                            pages.append(data)
                            push({'type': 'page', 'scanned': len(pages),
                                  'total': None, 'url': data['url']})
                            for link in links:
                                ln = normalize_url(link)
                                if ln not in visited and is_same_domain(link, base_domain):
                                    visited.add(ln)
                                    bfs_queue.append(link)

    finally:
        # Shut down every thread's browser + playwright, regardless of errors.
        for pw, browser in _thread_resources:
            try:
                browser.close()
            except Exception:
                pass
            try:
                pw.stop()
            except Exception:
                pass

    if not pages and browser_error is not None:
        raise BrowserUnavailableError(str(browser_error))

    return pages[:max_pages], mode


def _is_html_response(resp):
    content_type = resp.headers.get('content-type', '').lower()
    return 'html' in content_type or '<html' in resp.text[:1000].lower()


def crawl_with_requests(start_url, base_domain, sitemap_urls=None, max_pages=MAX_PAGES, progress_q=None):
    pages = []
    visited = set()
    session = requests.Session()
    session.headers.update(HEADERS)

    def push(event):
        if progress_q is not None:
            try:
                progress_q.put_nowait(event)
            except Exception:
                pass

    def fetch_one(url):
        try:
            t0 = time.time()
            resp = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            load_time_ms = int((time.time() - t0) * 1000)
            if resp.status_code >= 400 or not _is_html_response(resp):
                return None, []
            data = extract_seo_from_html(
                resp.text,
                resp.url,
                base_domain=base_domain,
                status_code=resp.status_code,
                load_time_ms=load_time_ms,
            )
            links = data.pop('links', [])
            return data, links
        except Exception as exc:
            logger.warning("Static crawl error %s: %s", url, exc)
            return None, []

    if sitemap_urls:
        mode = 'sitemap-requests'
        to_crawl = []
        for url in sitemap_urls:
            norm = normalize_url(url)
            if norm not in visited and is_same_domain(url, base_domain):
                visited.add(norm)
                to_crawl.append(url)
            if len(to_crawl) >= max_pages:
                break

        push({'type': 'discovered', 'n': len(to_crawl), 'total': len(to_crawl)})

        for url in to_crawl:
            data, _ = fetch_one(url)
            if data:
                pages.append(data)
                push({'type': 'page', 'scanned': len(pages), 'total': len(to_crawl), 'url': data['url']})
    else:
        mode = 'bfs-requests'
        visited.add(normalize_url(start_url))
        bfs_queue = [start_url]

        while bfs_queue and len(pages) < max_pages:
            url = bfs_queue.pop(0)
            data, links = fetch_one(url)
            if not data:
                continue

            pages.append(data)
            push({'type': 'page', 'scanned': len(pages), 'total': None, 'url': data['url']})

            for link in links:
                norm = normalize_url(link)
                if norm not in visited and is_same_domain(link, base_domain):
                    visited.add(norm)
                    bfs_queue.append(link)
                    if len(visited) >= max_pages * 3:
                        break

    return pages[:max_pages], mode


def crawl_site(start_url, base_domain, progress_q=None):
    sitemap_urls = fetch_sitemap_urls(start_url)

    def crawl_with_browser():
        if sitemap_urls:
            pages, method_used = crawl_with_playwright(
                start_url,
                base_domain,
                sitemap_urls=sitemap_urls,
                progress_q=progress_q,
            )
            if not pages:
                pages, method_used = crawl_with_playwright(
                    start_url,
                    base_domain,
                    progress_q=progress_q,
                )
        else:
            pages, method_used = crawl_with_playwright(
                start_url,
                base_domain,
                progress_q=progress_q,
            )
        return pages, method_used

    try:
        pages, method_used = crawl_with_browser()
        if pages:
            return pages, method_used
        logger.warning("Browser crawl returned no pages for %s; using static fallback.", start_url)
    except BrowserUnavailableError as exc:
        logger.warning("Browser crawl unavailable for %s: %s", start_url, exc)
    except Exception as exc:
        logger.warning("Browser crawl failed for %s: %s", start_url, exc)

    if sitemap_urls:
        pages, method_used = crawl_with_requests(
            start_url,
            base_domain,
            sitemap_urls=sitemap_urls,
            progress_q=progress_q,
        )
        if not pages:
            pages, method_used = crawl_with_requests(
                start_url,
                base_domain,
                progress_q=progress_q,
            )
    else:
        pages, method_used = crawl_with_requests(
            start_url,
            base_domain,
            progress_q=progress_q,
        )

    return pages, method_used


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/progress/<scan_id>')
def progress_stream(scan_id):
    """SSE endpoint — client subscribes before starting /scan."""
    q: queue.Queue = queue.Queue()
    with _progress_lock:
        _progress_queues[scan_id] = q

    def generate():
        try:
            while True:
                try:
                    event = q.get(timeout=90)
                    if event is None:          # sentinel — scan finished
                        yield 'data: {"type":"done"}\n\n'
                        break
                    yield f'data: {json.dumps(event)}\n\n'
                except queue.Empty:
                    yield ': keepalive\n\n'   # prevent proxy timeout
        finally:
            with _progress_lock:
                _progress_queues.pop(scan_id, None)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    )


@app.route('/scan', methods=['POST'])
def scan():
    """Start a scan and return a scan_id immediately.

    The actual crawl runs in a background thread.  Clients poll
    GET /result/<scan_id> every few seconds to receive progress and the
    final results.  The SSE /progress/<scan_id> stream is kept for any
    legacy clients that still connect to it.
    """
    try:
        data = request.get_json(silent=True) or {}
        raw_url = data.get('url')
        if not isinstance(raw_url, str) or not raw_url.strip():
            return jsonify({'error': 'No URL provided'}), 400

        raw_url = raw_url.strip()
        if not raw_url.startswith(('http://', 'https://')):
            raw_url = 'https://' + raw_url

        parsed = urlparse(raw_url)
        base_domain = parsed.netloc.replace('www.', '')
        if not base_domain:
            return jsonify({'error': 'Invalid URL'}), 400

        # Reject concurrent scans — only 1 scan at a time.
        # Exception: if the running scan has exceeded MAX_SCAN_DURATION it is
        # considered stale and we let the new one through (the old thread will
        # eventually decrement the counter itself when it finishes).
        global _active_scans, _scan_started_at, _active_scan_id, _current_scan_cancel
        with _active_scans_lock:
            scan_age = (time.time() - _scan_started_at) if _scan_started_at else 0
            if _active_scans >= 1 and scan_age < MAX_SCAN_DURATION:
                return jsonify({
                    'error': 'A scan is already running. Please wait for it to '
                             'finish before starting a new one.',
                    'busy': True,
                    'active_scan_id': _active_scan_id,
                }), 429
            # Signal any stale scan to abort its PageSpeed pool immediately
            if _current_scan_cancel:
                _current_scan_cancel.set()
            my_cancel = threading.Event()
            _current_scan_cancel = my_cancel
            _active_scans = 1
            _scan_started_at = time.time()

        # Generate scan_id server-side so the client can start polling immediately
        scan_id = str(uuid.uuid4())
        with _active_scans_lock:
            _active_scan_id = scan_id

        # Initialise the state entry so polls during the first few seconds get
        # a sensible 'running' response rather than a 404.
        with _scan_state_lock:
            _scan_states[scan_id] = {
                'status': 'running',
                'phase': 'crawling',
                'discovered': 0,
                'scanned': 0,
                'total': None,
                'current_url': '',
                'ps_total': 0,
                'ps_done': 0,
                '_ts': time.time(),
            }

        def run_scan():
            # SSE queue is optional — only present if an SSE client connects
            sse_q = None
            for _ in range(10):
                with _progress_lock:
                    sse_q = _progress_queues.get(scan_id)
                if sse_q:
                    break
                time.sleep(0.1)

            proxy = _ProgressProxy(sse_q, scan_id)

            def _push_error(msg):
                proxy.put({'type': 'error', 'message': msg})
                if sse_q:
                    try:
                        sse_q.put(None)
                    except Exception:
                        pass

            try:
                pages, method_used = crawl_site(raw_url, base_domain, progress_q=proxy)

                for p in pages:
                    p['h1_tags'] = ' | '.join(p.get('h1_tags', []))
                    p['h2_tags'] = ' | '.join(p.get('h2_tags', []))
                    p['h3_tags'] = ' | '.join(p.get('h3_tags', []))

                # ── PageSpeed Insights enrichment ──────────────────────────
                api_key = os.environ.get('PAGESPEED_KEY', '')
                if api_key and pages:
                    total_ps = len(pages)
                    proxy.put({'type': 'pagespeed', 'total': total_ps})
                    idx_map = {i: p for i, p in enumerate(pages)}
                    done_ps = 0
                    with ThreadPoolExecutor(max_workers=PAGESPEED_WORKERS) as ps_pool:
                        futures = {
                            ps_pool.submit(fetch_pagespeed, p['url'], api_key): i
                            for i, p in enumerate(pages)
                        }
                        consecutive_ps_errors = 0
                        ps_aborted = False
                        for fut in as_completed(futures):
                            # Abort immediately if this scan was evicted by a newer one
                            if my_cancel.is_set():
                                logger.info("PageSpeed phase cancelled (scan evicted)")
                                ps_pool.shutdown(wait=False, cancel_futures=True)
                                ps_aborted = True
                                break
                            i = futures[fut]
                            result = fut.result()
                            idx_map[i].update(result)
                            # Track consecutive failures to detect an unreachable API
                            if is_pagespeed_error(result):
                                consecutive_ps_errors += 1
                                if consecutive_ps_errors >= MAX_CONSECUTIVE_PS_ERRORS:
                                    logger.warning(
                                        "PageSpeed API unreachable (%d consecutive failures) — "
                                        "skipping remaining pages", consecutive_ps_errors
                                    )
                                    ps_pool.shutdown(wait=False, cancel_futures=True)
                                    ps_aborted = True
                                    break
                            else:
                                consecutive_ps_errors = 0
                            done_ps += 1
                            proxy.put({
                                'type': 'pagespeed_progress',
                                'done': done_ps,
                                'total': total_ps,
                            })

                proxy.put({
                    'type': 'result',
                    'pages': pages,
                    'total': len(pages),
                    'method': method_used,
                    'domain': base_domain,
                })
                if sse_q:
                    sse_q.put(None)   # SSE sentinel

            except Exception as exc:
                logger.error("Scan thread error: %s", exc, exc_info=True)
                _push_error(f'Scan failed: {exc}')

            finally:
                global _active_scans, _scan_started_at, _active_scan_id, _current_scan_cancel, _total_scans_completed, _last_scan_time, _recent_scan_urls
                with _active_scans_lock:
                    _active_scans = max(0, _active_scans - 1)
                    _scan_started_at = None
                    _active_scan_id = None
                    # Only clear our cancel event — a new scan may have already claimed the slot
                    if _current_scan_cancel is my_cancel:
                        _current_scan_cancel = None
                # Record history
                with _history_lock:
                    _total_scans_completed += 1
                    _last_scan_time = time.time()
                    with _scan_state_lock:
                        state = _scan_states.get(scan_id, {})
                    new_urls = [p['url'] for p in state.get('pages', []) if p.get('url')]
                    _recent_scan_urls = (new_urls + _recent_scan_urls)[:10]
                _cleanup_scan_states()

        threading.Thread(target=run_scan, daemon=True).start()
        return jsonify({'started': True, 'scan_id': scan_id})

    except Exception as e:
        logger.error("Scan route error: %s", e, exc_info=True)
        return jsonify({'error': f'Could not start scan: {str(e)}'}), 500


@app.route('/result/<scan_id>')
def get_result(scan_id):
    """Polling endpoint — returns the current state of a running or completed scan.

    Response shape:
      { status: 'running'|'done'|'error',
        phase: 'crawling'|'pagespeed'|'done',
        discovered: int, scanned: int, total: int|null,
        current_url: str, ps_total: int, ps_done: int,
        pages: [...],   # only when status=='done'
        method: str, domain: str,
        error: str }    # only when status=='error'
    """
    with _scan_state_lock:
        state = _scan_states.get(scan_id)
    if state is None:
        return jsonify({'status': 'not_found'}), 404
    # Strip internal bookkeeping keys before sending to client
    return jsonify({k: v for k, v in state.items() if not k.startswith('_')})


@app.route('/busy_status')
def busy_status():
    """Return real-time progress of the currently running scan (if any).

    Used by blocked users to show estimated wait time without knowing the
    active scan_id themselves.

    Returns
    -------
    {busy: false}                          — no scan running
    {busy: true, elapsed, est_remaining,   — scan in progress
     phase, scanned, total, ps_done, ps_total, current_url}
    """
    with _active_scans_lock:
        is_busy = _active_scans >= 1
        sid = _active_scan_id
        started = _scan_started_at

    if not is_busy or sid is None:
        return jsonify({'busy': False})

    elapsed = int(time.time() - started) if started else 0

    with _scan_state_lock:
        state = _scan_states.get(sid, {})

    phase    = state.get('phase', 'crawling')
    scanned  = state.get('scanned', 0) or 0
    total    = state.get('total') or 0
    ps_done  = state.get('ps_done', 0) or 0
    ps_total = state.get('ps_total', 0) or 0
    current  = state.get('current_url', '')

    # Estimate remaining seconds based on current throughput
    est_remaining: int | None = None
    if phase == 'crawling' and scanned > 0 and total > scanned and elapsed > 0:
        rate = scanned / elapsed          # pages per second
        est_remaining = int((total - scanned) / rate)
    elif phase == 'pagespeed' and ps_done > 0 and ps_total > ps_done and elapsed > 0:
        rate = ps_done / elapsed
        est_remaining = int((ps_total - ps_done) / rate)

    return jsonify({
        'busy': True,
        'phase': phase,
        'elapsed': elapsed,
        'est_remaining': est_remaining,
        'scanned': scanned,
        'total': total,
        'ps_done': ps_done,
        'ps_total': ps_total,
        'current_url': current,
    })


@app.route('/health')
def health():
    """Dark-themed system health dashboard, auto-refreshing every 10 seconds."""
    mem  = psutil.virtual_memory()
    cpu  = psutil.cpu_percent(interval=0.2)
    uptime_s = int(time.time() - _startup_time)
    h, rem   = divmod(uptime_s, 3600)
    m, s     = divmod(rem, 60)
    uptime_str = f'{h}h {m}m {s}s'

    mem_used_mb  = round(mem.used  / 1024 / 1024, 1)
    mem_total_mb = round(mem.total / 1024 / 1024, 1)
    mem_pct      = mem.percent

    with _active_scans_lock:
        active = _active_scans
    with _history_lock:
        total_done   = _total_scans_completed
        last_ts      = _last_scan_time
        recent_urls  = list(_recent_scan_urls)

    last_scan_str = (
        time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_ts))
        if last_ts else 'Never'
    )

    def pct_color(p):
        if p < 60:  return '#4ade80'   # green
        if p < 85:  return '#facc15'   # yellow
        return '#f87171'               # red

    mem_col = pct_color(mem_pct)
    cpu_col = pct_color(cpu)

    stat_cards = [
        ('Memory Used',    f'{mem_used_mb} MB',  '#818cf8'),
        ('Total Memory',   f'{mem_total_mb} MB', '#818cf8'),
        ('Memory %',       f'{mem_pct}%',        mem_col),
        ('CPU %',          f'{cpu}%',            cpu_col),
        ('Uptime',         uptime_str,            '#38bdf8'),
        ('Active Scans',   str(active),           '#f472b6' if active else '#4ade80'),
        ('Scans Done',     str(total_done),       '#a78bfa'),
        ('Last Scan',      last_scan_str,         '#94a3b8'),
    ]

    cards_html = ''.join(f'''
        <div class="card">
          <div class="card-label">{label}</div>
          <div class="card-value" style="color:{color}">{value}</div>
        </div>''' for label, value, color in stat_cards)

    urls_html = ''.join(
        f'<li><a href="{u}" target="_blank" rel="noopener">{u}</a></li>'
        for u in recent_urls
    ) or '<li class="dim">No pages scanned yet.</li>'

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="10">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crawl Daddy — Health</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem 1.5rem;
    }}
    header {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }}
    header h1 {{ font-size: 1.5rem; font-weight: 700; letter-spacing: -0.5px; }}
    header .badge {{
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: #1e293b;
      color: #94a3b8;
      margin-left: auto;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }}
    .card {{
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.2rem 1rem;
    }}
    .card-label {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.5rem;
    }}
    .card-value {{
      font-size: 1.35rem;
      font-weight: 700;
      word-break: break-word;
    }}
    section h2 {{
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.75rem;
    }}
    ul {{
      list-style: none;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
    }}
    li {{
      padding: 0.65rem 1rem;
      font-size: 0.82rem;
      border-bottom: 1px solid #334155;
    }}
    li:last-child {{ border-bottom: none; }}
    li a {{ color: #818cf8; text-decoration: none; word-break: break-all; }}
    li a:hover {{ text-decoration: underline; }}
    li.dim {{ color: #475569; font-style: italic; }}
    footer {{
      margin-top: 2rem;
      font-size: 0.7rem;
      color: #334155;
      text-align: center;
    }}
  </style>
</head>
<body>
  <header>
    <h1>🕷 Crawl Daddy</h1>
    <span>Health Dashboard</span>
    <span class="badge">auto-refreshes every 10 s</span>
  </header>

  <div class="grid">
    {cards_html}
  </div>

  <section>
    <h2>10 Most Recently Scanned URLs</h2>
    <ul>{urls_html}</ul>
  </section>

  <footer>Generated at {time.strftime('%Y-%m-%d %H:%M:%S')} UTC</footer>
</body>
</html>'''
    return Response(html, mimetype='text/html')


@app.route('/ai-analyze', methods=['POST'])
def ai_analyze():
    """Call an LLM provider to produce an SEO analysis for one page."""
    data = request.get_json(silent=True) or {}
    page = data.get('page', {})
    if not isinstance(page, dict):
        return jsonify({'error': 'Invalid page payload.'}), 400

    groq_key = os.environ.get('GROQ_API_KEY', '')
    groq_model = os.environ.get('GROQ_MODEL', GROQ_DEFAULT_MODEL)

    # Preserve existing Gemini support as a fallback, but prefer Groq when
    # a Groq key is configured.
    integration_base = os.environ.get('AI_INTEGRATIONS_GEMINI_BASE_URL', '').rstrip('/')
    integration_key  = os.environ.get('AI_INTEGRATIONS_GEMINI_API_KEY', '')
    user_key         = os.environ.get('GEMINI_KEY', '')

    provider = ''
    model_name = ''
    if groq_key:
        provider = 'Groq'
        model_name = groq_model
    elif integration_base and integration_key:
        provider = 'Gemini'
        gemini_base = integration_base
        api_key     = integration_key
        model_name  = 'gemini-2.5-flash'
    elif user_key:
        provider = 'Gemini'
        gemini_base = 'https://generativelanguage.googleapis.com'
        api_key     = user_key
        model_name  = 'gemini-2.0-flash'
    else:
        return jsonify({
            'error': 'No AI API key configured. Set GROQ_API_KEY to use Groq.'
        }), 500

    url       = page.get('url', 'Unknown')
    title     = page.get('title') or 'Missing'
    meta      = page.get('meta_description') or 'Missing'
    h1        = page.get('h1_tags') or 'Missing'
    words     = page.get('word_count', 0)
    seo_score = page.get('seo_score', 'N/A')
    issues    = page.get('issues') or 'None detected'
    ps_perf   = page.get('ps_performance', 'N/A')
    ps_seo    = page.get('ps_seo', 'N/A')
    ps_lcp    = page.get('ps_lcp', 'N/A')
    ps_cls    = page.get('ps_cls', 'N/A')

    prompt = f"""You are an expert SEO consultant. Analyze the following blog page SEO data and provide concise, actionable feedback.

URL: {url}
Title: {title}
Meta Description: {meta}
H1 Tags: {h1}
Word Count: {words}
SEO Score: {seo_score}/100
Issues Detected: {issues}
PageSpeed Performance: {ps_perf}/100
PageSpeed SEO: {ps_seo}/100
LCP: {ps_lcp}s | CLS: {ps_cls}

Respond using EXACTLY these four headers (do not add any other text outside these sections):

ASSESSMENT:
[Write exactly 2 sentences assessing the overall content quality and SEO effectiveness of this page.]

TITLE SUGGESTION:
[Write one improved title tag between 50–60 characters. No quotes.]

META DESCRIPTION SUGGESTION:
[Write one improved meta description between 150–160 characters. No quotes.]

    PRIORITY FIXES:
1. [Most impactful fix with a brief explanation]
2. [Second most impactful fix with a brief explanation]
3. [Third most impactful fix with a brief explanation]"""

    try:
        if provider == 'Groq':
            resp = requests.post(
                GROQ_CHAT_COMPLETIONS_URL,
                headers={
                    'Authorization': f'Bearer {groq_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': model_name,
                    'messages': [
                        {
                            'role': 'system',
                            'content': (
                                'You are an expert SEO consultant. '
                                'Follow the requested output format exactly.'
                            ),
                        },
                        {
                            'role': 'user',
                            'content': prompt,
                        },
                    ],
                    'temperature': 0.4,
                    'max_tokens': 1024,
                },
                timeout=30,
            )
            resp.raise_for_status()
            d = resp.json()
            text = d['choices'][0]['message']['content']
        else:
            # Integration proxy uses no version prefix (apiVersion=""); direct
            # API uses /v1beta/
            if integration_base:
                gemini_url = f'{gemini_base}/models/{model_name}:generateContent?key={api_key}'
            else:
                gemini_url = f'{gemini_base}/v1beta/models/{model_name}:generateContent?key={api_key}'
            resp = requests.post(
                gemini_url,
                json={
                    'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.4, 'maxOutputTokens': 1024},
                },
                timeout=30,
            )
            resp.raise_for_status()
            d = resp.json()
            text = d['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'result': text, 'provider': provider, 'model': model_name})
    except Exception as exc:
        logger.error('AI provider error (%s): %s', provider or 'unknown', exc, exc_info=True)
        return jsonify({'error': f'AI analysis failed: {exc}'}), 500


@app.route('/download-csv', methods=['POST'])
def download_csv():
    data = request.get_json(silent=True) or {}
    pages = data.get('pages', [])

    if not isinstance(pages, list):
        return jsonify({'error': 'Invalid pages payload'}), 400

    if not pages:
        return jsonify({'error': 'No data to export'}), 400

    fields = [
        'url', 'status_code', 'seo_score', 'issues',
        'title', 'title_length',
        'h1_tags', 'h2_tags', 'h3_tags',
        'meta_description', 'meta_description_length', 'meta_keywords', 'robots_meta',
        'og_title', 'og_description', 'og_image', 'twitter_card',
        'canonical_url', 'canonical_matches',
        'jsonld_schema_types', 'date_published', 'author', 'hreflang_languages',
        'word_count', 'reading_time',
        'internal_links', 'external_links',
        'image_count', 'images_missing_alt',
        'load_time_ms',
        'ps_performance', 'ps_seo', 'ps_accessibility', 'ps_lcp', 'ps_cls',
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for page in pages:
        writer.writerow({k: page.get(k, '') for k in fields})

    csv_bytes = output.getvalue().encode('utf-8-sig')
    return Response(
        csv_bytes,
        mimetype='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename=seo-scan-results.csv',
            'Content-Type': 'text/csv; charset=utf-8',
        }
    )


if __name__ == '__main__':
    ensure_chromium_installed()
    port = int(os.environ.get('PORT', 5000))
    # Use waitress instead of Flask's dev server.
    # Flask's dev server spawns a new OS thread per request — with 3-second
    # polling from the browser, a 5-minute scan generates 100+ threads on top
    # of Playwright and PageSpeed workers, hitting Python's thread limit and
    # crashing Chromium. Waitress uses a fixed pool (threads=) so the total
    # thread count is always bounded.
    from waitress import serve
    logger.info("Starting on port %d via waitress (threads=12)", port)
    serve(app, host='0.0.0.0', port=port, threads=12)
