export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** CHF-Format mit Apostroph-Tausendertrennung (Schweizer Schreibweise). */
export function chf(v: number, digits = 0): string {
  return v.toLocaleString('de-CH', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Datum «Mo 24.08.» aus ISO-String. */
export function shortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()];
  return `${wd} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/**
 * Zeitpunkt eines Wandtag/-zeit-Paars in einer IANA-Zeitzone als UTC-Timestamp.
 * Iterativ über Intl aufgelöst, damit DST stimmt (Countdown Europe/Zurich).
 */
export function zonedTime(dateStr: string, timeStr: string, timeZone: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  let ts = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(ts).map((p) => [p.type, p.value]));
    const got = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +(parts.hour === '24' ? 0 : parts.hour), +parts.minute, +parts.second);
    const want = Date.UTC(y, mo - 1, d, h, mi);
    const diff = want - got;
    if (diff === 0) break;
    ts += diff;
  }
  return ts;
}

/** Einmaliger Reveal, wenn ein Element in den Viewport scrollt. */
export function onEnter(el: Element, cb: () => void, margin = '-10% 0px') {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { cb(); io.disconnect(); }
  }, { rootMargin: margin });
  io.observe(el);
}
