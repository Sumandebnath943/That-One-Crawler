export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST JSON to one of our API routes. Retries network errors, 429s and 5xx responses. */
export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal, retries = 0): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
        throw new ApiError(message, res.status);
      }
      return data as T;
    } catch (err) {
      const retryable = !(err instanceof ApiError) || err.status === 429 || err.status >= 500;
      if (signal?.aborted || attempt >= retries || !retryable) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
}
