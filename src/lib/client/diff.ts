export interface DiffPart {
  type: "same" | "add" | "del";
  text: string;
}

const MAX_TOKENS = 2500;

/** Curly vs straight quotes and dash styles aren't edits worth highlighting. */
const comparable = (word: string) => word.replace(/[“”„"]/g, '"').replace(/[‘’']/g, "'").replace(/[–—]/g, "-");

/** Word-level diff (longest common subsequence) for before/after views. Whitespace is kept. */
export function diffWords(before: string, after: string): DiffPart[] | null {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return null;
  const ka = a.map(comparable);
  const kb = b.map(comparable);

  const width = b.length + 1;
  const lcs = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] = ka[i] === kb[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (ka[i] === kb[j]) {
      // Show the new spelling: it's the text that will be copied.
      push("same", b[j]);
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      push("del", a[i]);
      i += 1;
    } else {
      push("add", b[j]);
      j += 1;
    }
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);
  return parts;
}
