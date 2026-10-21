import { buildRows, summarize } from "@/lib/seo/report";
import type { CrawlMethod, ScanPhase, ScanState } from "./crawl";

// Scans live in the visitor's own browser (IndexedDB). No database, no accounts.

const DB_NAME = "that-one-crawler";
const DB_VERSION = 1;
const SCANS = "scans";
const SUMMARIES = "summaries";
const MAX_SAVED = 25;

export interface ScanSummary {
  id: string;
  startUrl: string;
  domain: string;
  startedAt: number;
  finishedAt: number | null;
  phase: ScanPhase;
  method: CrawlMethod | null;
  pageCount: number;
  avgScore: number | null;
  critical: number;
}

export function summarizeScan(state: ScanState): ScanSummary {
  const summary = summarize(buildRows(state.pages, state.robots));
  return {
    id: state.id,
    startUrl: state.startUrl,
    domain: `${state.domain}${state.scope ?? ""}`,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    phase: state.phase,
    method: state.method,
    pageCount: summary.total,
    avgScore: summary.avgScore,
    critical: summary.severityCounts.critical,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SCANS)) db.createObjectStore(SCANS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SUMMARIES)) db.createObjectStore(SUMMARIES, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listScans(): Promise<ScanSummary[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(SUMMARIES, "readonly");
    const all = await result(tx.objectStore(SUMMARIES).getAll() as IDBRequest<ScanSummary[]>);
    db.close();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function loadScan(id: string): Promise<ScanState | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(SCANS, "readonly");
    const scan = await result(tx.objectStore(SCANS).get(id) as IDBRequest<ScanState | undefined>);
    db.close();
    return scan ?? null;
  } catch {
    return null;
  }
}

/** Save a finished (or stopped) scan. Returns false when storage isn't available. */
export async function saveScan(state: ScanState): Promise<boolean> {
  try {
    const db = await openDb();
    const tx = db.transaction([SCANS, SUMMARIES], "readwrite");
    tx.objectStore(SCANS).put({ ...state, active: [] });
    tx.objectStore(SUMMARIES).put(summarizeScan(state));
    await done(tx);
    db.close();
    const all = await listScans();
    await Promise.all(all.slice(MAX_SAVED).map((old) => deleteScan(old.id)));
    return true;
  } catch {
    return false;
  }
}

export async function deleteScan(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([SCANS, SUMMARIES], "readwrite");
    tx.objectStore(SCANS).delete(id);
    tx.objectStore(SUMMARIES).delete(id);
    await done(tx);
    db.close();
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
