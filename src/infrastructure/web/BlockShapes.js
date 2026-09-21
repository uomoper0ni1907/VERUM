/** Infrastruttura · Web · disegno dei solidi. Pura presentazione. */
const PIXELS = { 1: 26, 2: 36, 3: 48 };
const FILL = '#FBFBF8', SIDE = '#E1E3DA', TOP = '#F1F2EB', STROKE = '#16181A';

export function blockSvg({ shape, size }) {
  const px = PIXELS[size];
  let inner;
  if (shape === 'Cube') {
    const d = px * 0.26, s = px * 0.68;
    inner = `<g class="body" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round">
      <polygon points="0,${d} ${d},0 ${s + d},0 ${s},${d}" fill="${TOP}"/>
      <polygon points="${s},${d} ${s + d},0 ${s + d},${s} ${s},${s + d}" fill="${SIDE}"/>
      <rect x="0" y="${d}" width="${s}" height="${s}" fill="${FILL}"/></g>`;
  } else if (shape === 'Tet') {
    const s = px * 0.9, d = px * 0.22;
    inner = `<g class="body" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round">
      <polygon points="${s / 2},0 0,${s} ${s},${s}" fill="${FILL}"/>
      <polygon points="${s / 2},0 ${s},${s} ${s * 0.78},${s - d}" fill="${SIDE}"/></g>`;
  } else {
    const r = px * 0.46, cx = px * 0.5, cy = px * 0.5;
    const points = [...Array(6).keys()].map(i => {
      const a = Math.PI / 6 + i * Math.PI / 3;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    inner = `<g class="body" stroke="${STROKE}" stroke-width="1.2" stroke-linejoin="round">
      <polygon points="${points}" fill="${FILL}"/>
      <polygon points="${cx},${cy - r} ${cx + r * 0.87},${cy - r * 0.5} ${cx},${cy} ${cx - r * 0.87},${cy - r * 0.5}" fill="${TOP}"/>
      <polygon points="${cx + r * 0.87},${cy - r * 0.5} ${cx + r * 0.87},${cy + r * 0.5} ${cx},${cy}" fill="${SIDE}"/></g>`;
  }
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${inner}</svg>`;
}
