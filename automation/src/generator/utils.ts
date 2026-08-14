/** Small formatting / math helpers shared by the card generators. */

/** 950 -> "950", 1200 -> "1.2k", 1500000 -> "1.5m". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return String(n);
  const units = ["k", "m", "b"];
  let unit = -1;
  let num = n;
  while (num >= 1000 && unit < units.length - 1) {
    num /= 1000;
    unit++;
  }
  const s = num >= 100 ? String(Math.round(num)) : num.toFixed(1).replace(/\.0$/, "");
  return s + units[unit];
}

/** "2026-08-14" -> "Aug 14, 2026". Accepts YYYY-MM-DD (UTC-safe). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Round to `dp` decimal places. */
export function round(v: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
