// Minimal placeholder mark: two offset rings, echoes the Insights "orbit" icon.
// ponytail: in-app header only — regenerating the Android launcher icon set is a
// separate image-asset task, not wired up here.
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
      <circle cx="15" cy="15" r="3.4" fill="var(--accent)" />
    </svg>
  );
}
