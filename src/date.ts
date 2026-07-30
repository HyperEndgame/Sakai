// ponytail: no date library — Intl covers "Aug 10" formatting. The only real work is
// avoiding the UTC-midnight day-shift bug when parsing a plain YYYY-MM-DD string, and
// falling back to the raw string on bad input instead of "Invalid Date".
export function formatDue(due: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  if (!m) return due;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d)); // local midnight, not UTC
  if (isNaN(date.getTime())) return due;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

if (import.meta.env.DEV) {
  const expected = new Date(2026, 7, 10).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  console.assert(formatDue("2026-08-10") === expected, "formatDue: wrong day, UTC-shift bug?", formatDue("2026-08-10"));
  console.assert(formatDue("not-a-date") === "not-a-date", "formatDue: should fall back on bad input");
  console.assert(formatDue("") === "", "formatDue: should fall back on empty input");
}
