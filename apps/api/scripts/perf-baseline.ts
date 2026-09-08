/**
 * Lightweight MVP performance baseline (local).
 * Measures a few critical endpoints; does NOT claim production capacity.
 *
 *   API_BASE_URL=http://127.0.0.1:4000 npx tsx apps/api/scripts/perf-baseline.ts
 */
const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
const samples = Number(process.env.PERF_SAMPLES ?? "5");

async function measure(path: string): Promise<{
  path: string;
  statuses: number[];
  timesMs: number[];
  p50: number;
  p95: number;
  errors: number;
}> {
  const timesMs: number[] = [];
  const statuses: number[] = [];
  let errors = 0;
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}${path}`);
      statuses.push(res.status);
      timesMs.push(Date.now() - t0);
      await res.arrayBuffer();
    } catch {
      errors += 1;
      timesMs.push(Date.now() - t0);
    }
  }
  const sorted = [...timesMs].sort((a, b) => a - b);
  const p50 = sorted[Math.floor((sorted.length - 1) * 0.5)] ?? 0;
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;
  return { path, statuses, timesMs, p50, p95, errors };
}

async function main(): Promise<void> {
  console.log(
    JSON.stringify(
      {
        environment: process.env.NODE_ENV ?? "development",
        base,
        samples,
        methodology:
          "Sequential local HTTP samples; not a load test; not production-scale capacity.",
        endpoints: [
          await measure("/health"),
          await measure("/ready"),
          await measure("/api/v1/intelligence/overview"),
        ],
      },
      null,
      2,
    ),
  );
}

void main();
