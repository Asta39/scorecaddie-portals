// ScoreCaddie achievement outlines, drawn in the bot-avatars 100×100 body box.
// Each shape: d (body outline), optional parts (thin pieces drawn behind),
// and where the face sits. Subpaths are all wound clockwise so overlapping
// pieces fill as one body (nonzero).

const f = (n) => +n.toFixed(2);

function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return a; }
const cw = (pts) => (area(pts) < 0 ? pts.slice().reverse() : pts);

/** A polygon with every corner rounded by r (clamped to half each edge). */
export function rpoly(points, r = 4) {
  const p = cw(points), n = p.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = p[(i - 1 + n) % n], cur = p[i], next = p[(i + 1) % n];
    const v1 = [prev[0] - cur[0], prev[1] - cur[1]], v2 = [next[0] - cur[0], next[1] - cur[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [cur[0] + (v1[0] / l1) * rr, cur[1] + (v1[1] / l1) * rr];
    const b = [cur[0] + (v2[0] / l2) * rr, cur[1] + (v2[1] / l2) * rr];
    d += (i === 0 ? `M${f(a[0])} ${f(a[1])}` : `L${f(a[0])} ${f(a[1])}`) + `Q${f(cur[0])} ${f(cur[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return d + 'Z';
}

/** A smooth closed curve through the points (Catmull-Rom). */
export function blob(points, tension = 1) {
  const p = cw(points), n = p.length;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

export const circle = (cx, cy, r) => `M${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx + r)} ${f(cy)}Z`;
export const ellipse = (cx, cy, rx, ry, rot = 0) => {
  const pts = [];
  for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; pts.push(rotate([cx + rx * Math.cos(t), cy + ry * Math.sin(t)], cx, cy, rot)); }
  return blob(pts);
};
export const rrect = (x1, y1, x2, y2, r) => rpoly([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], r);
/** A bar with round ends between two points. */
export function capsule(x1, y1, x2, y2, w) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = w / 2, nx = -Math.sin(a) * h, ny = Math.cos(a) * h;
  return rpoly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], h);
}
export function rotate([x, y], cx, cy, deg) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
const rot = (pts, deg, cx = 50, cy = 50) => pts.map((p) => rotate(p, cx, cy, deg));
const mirror = (pts) => pts.map(([x, y]) => [100 - x, y]);
const arcPts = (cx, cy, r, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
const join = (...ds) => ds.join('');

export const SHAPES = {
  trophy: {
    d: 'M18 12 H82 C82 44 70 58 57 62 V72 H68 C73 72 76 76 76 81 V88 H24 V81 C24 76 27 72 32 72 H43 V62 C30 58 18 44 18 12 Z',
    parts: 'M18 18 C4 18 4 42 22 44 L23 38 C12 37 12 24 19 24 Z M82 18 C96 18 96 42 78 44 L77 38 C88 37 88 24 81 24 Z',
    faceY: 34, faceScale: 0.78,
  },
  birdie: {
    d: join(ellipse(44, 62, 32, 24, -8), circle(64, 38, 20), rpoly([[78, 32], [96, 40], [78, 47]], 3), rpoly([[18, 58], [2, 44], [6, 70], [22, 72]], 4)),
    faceX: 64, faceY: 37, faceScale: 0.56,
  },
  eagle: (() => {
    const wing = [[42, 40], [28, 26], [4, 20], [10, 34], [2, 42], [12, 48], [6, 58], [24, 60], [42, 62]];
    return { d: join(blob(wing, 0.6), blob(mirror(wing), 0.6), ellipse(50, 56, 15, 26), circle(50, 28, 13), rpoly([[40, 76], [60, 76], [50, 94]], 4)), faceY: 30, faceScale: 0.5 };
  })(),
  albatross: {
    d: join(blob([[46, 44], [28, 36], [4, 38], [2, 44], [28, 52], [46, 56]], 0.7), blob(mirror([[46, 44], [28, 36], [4, 38], [2, 44], [28, 52], [46, 56]]), 0.7), ellipse(50, 54, 20, 14), circle(50, 42, 12)),
    faceY: 46, faceScale: 0.52,
  },
  cog: {
    d: join(circle(50, 50, 32), ...Array.from({ length: 8 }, (_, i) => rpoly(rot([[42, 8], [58, 8], [58, 24], [42, 24]], i * 45), 3))),
    faceScale: 0.72,
  },
  gem: { d: rpoly([[28, 18], [72, 18], [92, 40], [50, 90], [8, 40]], 5), faceY: 42, faceScale: 0.72 },
  sparkle: {
    d: 'M50 4 C54 32 60 44 96 50 C60 56 54 68 50 96 C46 68 40 56 4 50 C40 44 46 32 50 4 Z',
    faceScale: 0.5,
  },
  minus: { d: rrect(8, 34, 92, 66, 16), faceScale: 0.62 },
  rocket: {
    d: join(blob([[50, 4], [64, 18], [68, 40], [66, 70], [34, 70], [32, 40], [36, 18]], 0.9),
      rpoly([[34, 52], [18, 72], [16, 88], [36, 76]], 4), rpoly([[66, 52], [82, 72], [84, 88], [64, 76]], 4), rrect(40, 66, 60, 86, 6)),
    faceY: 40, faceScale: 0.6,
  },
  driver: {
    d: blob([[10, 54], [18, 34], [44, 26], [76, 30], [92, 44], [90, 64], [68, 76], [30, 76]]),
    parts: capsule(22, 36, 10, 2, 6),
    faceX: 56, faceY: 52, faceScale: 0.7,
  },
  caterpillar: {
    d: join(circle(18, 66, 13), circle(38, 62, 15), circle(58, 64, 15), circle(78, 48, 19)),
    parts: join(capsule(72, 32, 66, 12, 4), capsule(84, 32, 92, 12, 4)),
    faceX: 78, faceY: 48, faceScale: 0.58,
  },
  turkey: {
    d: join(...[-165, -140, -115, -90, -65, -40, -15].map((a) => { const [x, y] = rotate([50 + 30, 62], 50, 62, a); return ellipse(x, y, 9, 19, a + 90); }), ellipse(50, 68, 24, 24), circle(50, 44, 12)),
    faceY: 68, faceScale: 0.62,
  },
  king: {
    d: join(rpoly([[26, 92], [74, 92], [74, 80], [64, 74], [66, 46], [74, 36], [26, 36], [34, 46], [36, 74], [26, 80]], 5), rrect(44, 6, 56, 30, 4), rrect(36, 12, 64, 22, 4)),
    faceY: 56, faceScale: 0.55,
  },
  flag: {
    d: 'M30 8 C30 5 34 4 36 6 L84 26 C88 28 88 32 84 34 L38 52 V90 C38 94 30 94 30 90 Z',
    faceX: 55, faceY: 29, faceScale: 0.6,
  },
  shovel: {
    d: rpoly([[28, 44], [72, 44], [72, 70], [50, 94], [28, 70]], 8),
    parts: join(capsule(50, 46, 50, 12, 8), rrect(36, 4, 64, 14, 4)),
    faceY: 64, faceScale: 0.62,
  },
  shield: { d: blob([[50, 6], [70, 10], [86, 18], [84, 52], [70, 78], [50, 94], [30, 78], [16, 52], [14, 18], [30, 10]]), faceY: 44, faceScale: 0.76 },
  mallet: {
    d: 'M10 52 H90 V68 C90 84 70 92 50 92 C30 92 10 84 10 68 Z',
    parts: capsule(62, 54, 74, 4, 6),
    faceY: 70, faceScale: 0.62,
  },
  boomerang: { d: blob([[12, 28], [28, 18], [54, 44], [84, 30], [94, 44], [60, 80], [46, 80], [36, 60]], 0.9), faceX: 52, faceY: 58, faceScale: 0.5 },
  horseshoe: {
    d: rpoly([...arcPts(50, 44, 42, -25, 205, 20), ...arcPts(50, 44, 20, 205, -25, 14)], 8),
    faceY: 76, faceScale: 0.46,
  },
  glove: {
    d: join(blob([[24, 36], [30, 14], [58, 8], [82, 18], [88, 44], [80, 66], [70, 72], [30, 72], [24, 58]]), circle(22, 50, 13), rrect(30, 66, 70, 92, 8)),
    faceX: 58, faceY: 40, faceScale: 0.62,
  },
  palm: {
    d: join(...[-70, -35, 0, 35, 70, 180].map((a) => ellipse(...rotate([50, 10], 50, 32, a), 11, 22, a)), circle(50, 32, 16), rpoly([[44, 40], [56, 40], [62, 94], [40, 94]], 5)),
    faceY: 30, faceScale: 0.5,
  },
  flame: { d: blob([[50, 4], [64, 24], [78, 40], [84, 62], [76, 84], [58, 94], [42, 94], [24, 84], [16, 62], [24, 44], [34, 54], [38, 30]]), faceY: 68, faceScale: 0.68 },
  iron: {
    d: rpoly([[16, 42], [62, 34], [84, 42], [88, 70], [26, 88], [12, 74]], 9),
    parts: capsule(76, 38, 88, 4, 7),
    faceX: 50, faceY: 60, faceScale: 0.62,
  },
  tee: {
    d: 'M8 16 C8 2 92 2 92 16 C92 30 66 34 58 38 L55 86 C54 94 46 94 45 86 L42 38 C34 34 8 30 8 16 Z',
    faceY: 17, faceScale: 0.64,
  },
  acacia: {
    d: join(blob([[6, 40], [14, 24], [34, 14], [66, 14], [86, 24], [94, 40], [78, 48], [22, 48]]), rpoly([[45, 44], [55, 44], [58, 92], [42, 92]], 4), capsule(47, 58, 28, 44, 7), capsule(53, 58, 72, 44, 7)),
    faceY: 31, faceScale: 0.62,
  },
  medal: {
    d: join(rpoly([[36, 56], [52, 60], [42, 96], [28, 88]], 4), rpoly([[64, 56], [48, 60], [58, 96], [72, 88]], 4), circle(50, 40, 32)),
    faceY: 40, faceScale: 0.74,
  },
  crown: {
    d: join(rpoly([[10, 84], [10, 32], [30, 52], [50, 22], [70, 52], [90, 32], [90, 84]], 6), circle(10, 28, 7), circle(50, 18, 8), circle(90, 28, 7)),
    faceY: 66, faceScale: 0.62,
  },
  calendar: { d: rrect(12, 20, 88, 90, 14), parts: join(capsule(32, 8, 32, 28, 8), capsule(68, 8, 68, 28, 8)), faceY: 56, faceScale: 0.74 },
  sunrise: {
    d: join('M14 72 A36 36 0 0 1 86 72 Z', rrect(4, 66, 96, 82, 8), ...[-150, -120, -90, -60, -30].map((a) => { const [x, y] = rotate([98, 72], 50, 72, a).map((v) => v); const [x2, y2] = rotate([88, 72], 50, 72, a); return capsule(x2, y2, x, y, 9); })),
    faceY: 62, faceScale: 0.6,
  },
  owl: { d: blob([[22, 26], [30, 8], [42, 20], [58, 20], [70, 8], [78, 26], [86, 52], [78, 80], [62, 92], [38, 92], [22, 80], [14, 52]], 0.9), faceY: 46, faceScale: 0.86 },
  sneaker: {
    d: join(circle(50, 58, 34), rrect(42, 8, 58, 24, 4), capsule(72, 30, 80, 22, 9)),
    faceY: 58, faceScale: 0.76,
  },
  padlock: {
    d: rrect(16, 44, 84, 92, 14),
    parts: rpoly([...arcPts(50, 44, 26, 180, 360, 14), [76, 50], [66, 50], ...arcPts(50, 44, 16, 360, 180, 10), [34, 50], [24, 50]], 3),
    faceY: 68, faceScale: 0.72,
  },
  umbrella: {
    d: 'M6 54 A44 44 0 0 1 94 54 A11 11 0 0 0 72 54 A11 11 0 0 0 50 54 A11 11 0 0 0 28 54 A11 11 0 0 0 6 54 Z',
    parts: 'M47 50 H53 V84 C53 94 38 94 38 84 H44 C44 88 47 88 47 84 Z',
    faceY: 34, faceScale: 0.62,
  },
  bag: {
    d: rpoly([[22, 30], [78, 30], [72, 94], [28, 94]], 10),
    parts: join(capsule(34, 32, 30, 10, 6), capsule(50, 32, 50, 6, 6), capsule(66, 32, 72, 12, 6), circle(30, 10, 8), circle(50, 6, 8), circle(72, 12, 7)),
    faceY: 58, faceScale: 0.66,
  },
  snowflake: { d: join(circle(50, 50, 20), ...[0, 60, 120].map((a) => { const [x1, y1] = rotate([50, 6], 50, 50, a), [x2, y2] = rotate([50, 94], 50, 50, a); return capsule(x1, y1, x2, y2, 15); })), faceScale: 0.52 },
  gift: { d: join(rrect(14, 42, 86, 92, 10), rrect(8, 30, 92, 48, 8), circle(38, 22, 11), circle(62, 22, 11)), faceY: 68, faceScale: 0.72 },
  hourglass: { d: rpoly([[18, 6], [82, 6], [82, 18], [60, 50], [82, 82], [82, 94], [18, 94], [18, 82], [40, 50], [18, 18]], 7), faceY: 24, faceScale: 0.52 },
  phone: { d: rrect(24, 6, 76, 94, 14), faceY: 46, faceScale: 0.72 },
  pin: { d: 'M50 94 C30 70 16 56 16 38 A34 34 0 0 1 84 38 C84 56 70 70 50 94 Z', faceY: 38, faceScale: 0.72 },
  maasai: {
    d: rpoly([[50, 4], [66, 12], [76, 30], [78, 50], [76, 70], [66, 88], [50, 96], [34, 88], [24, 70], [22, 50], [24, 30], [34, 12]], 7),
    parts: join(capsule(12, 94, 88, 6, 5), capsule(88, 94, 12, 6, 5)),
    faceScale: 0.66,
  },
  lighthouse: {
    d: join(rpoly([[38, 26], [62, 26], [68, 90], [32, 90]], 4), rrect(34, 14, 66, 30, 4), rpoly([[30, 16], [50, 2], [70, 16]], 3), rrect(22, 84, 78, 96, 5)),
    faceY: 56, faceScale: 0.52,
  },
  mountain: { d: rpoly([[4, 88], [34, 26], [44, 40], [60, 12], [96, 88]], 7), faceX: 52, faceY: 66, faceScale: 0.66 },
  suitcase: { d: rrect(8, 30, 92, 88, 12), parts: rpoly([[36, 32], [36, 16], [64, 16], [64, 32], [58, 32], [58, 22], [42, 22], [42, 32]], 3), faceY: 60, faceScale: 0.76 },
  butterfly: {
    d: join(ellipse(29, 34, 25, 22, -20), ellipse(71, 34, 25, 22, 20), ellipse(33, 68, 18, 16, 20), ellipse(67, 68, 18, 16, -20), capsule(50, 22, 50, 84, 14)),
    parts: join(capsule(48, 22, 40, 4, 3), capsule(52, 22, 60, 4, 3)),
    faceY: 46, faceScale: 0.56,
  },
  megaphone: {
    d: rpoly([[10, 38], [38, 38], [82, 14], [94, 18], [94, 82], [82, 86], [38, 62], [10, 62]], 7),
    parts: rpoly([[30, 60], [42, 60], [40, 84], [30, 84]], 4),
    faceX: 62, faceY: 50, faceScale: 0.56,
  },
  hand: {
    d: join(rrect(26, 42, 76, 92, 16), capsule(32, 46, 30, 14, 12), capsule(45, 44, 45, 8, 12), capsule(58, 44, 60, 10, 12), capsule(70, 48, 74, 20, 11), capsule(28, 70, 10, 48, 13)),
    faceX: 52, faceY: 66, faceScale: 0.6,
  },
  camera: { d: join(rrect(8, 32, 92, 86, 14), rrect(30, 20, 62, 38, 6)), faceY: 59, faceScale: 0.72 },
  mic: {
    d: rrect(32, 6, 68, 60, 18),
    parts: join('M22 44 H28 C28 60 38 68 50 68 C62 68 72 60 72 44 H78 C78 64 66 74 50 74 C34 74 22 64 22 44 Z', capsule(50, 72, 50, 90, 7), capsule(34, 92, 66, 92, 8)),
    faceY: 32, faceScale: 0.62,
  },
  bib: { d: rpoly([[26, 6], [36, 6], [40, 30], [60, 30], [64, 6], [74, 6], [78, 34], [84, 92], [16, 92], [22, 34]], 5), faceY: 60, faceScale: 0.72 },
  cap: { d: join(blob([[12, 66], [16, 38], [38, 20], [64, 22], [80, 42], [82, 66]]), rrect(60, 58, 98, 72, 7)), faceX: 46, faceY: 46, faceScale: 0.62 },
  cone: { d: rpoly([[40, 8], [60, 8], [78, 78], [92, 80], [92, 92], [8, 92], [8, 80], [22, 78]], 6), faceY: 60, faceScale: 0.56 },
  bucket: {
    d: join(rpoly([[16, 38], [84, 38], [76, 94], [24, 94]], 8), circle(30, 34, 12), circle(50, 28, 13), circle(70, 34, 12)),
    faceY: 66, faceScale: 0.66,
  },
  leaf: {
    d: blob([[18, 84], [14, 56], [28, 28], [58, 10], [90, 6], [86, 40], [68, 70], [42, 86]], 0.9),
    parts: capsule(22, 80, 8, 96, 5),
    faceX: 52, faceY: 46, faceScale: 0.6,
  },
  pencil: { d: rpoly(rot([[34, 8], [66, 8], [66, 70], [50, 96], [34, 70]], 30), 6), faceX: 46, faceY: 44, faceScale: 0.5 },
  ticket: {
    d: 'M18 26 H82 A10 10 0 0 1 92 36 V41 A9 9 0 0 0 92 59 V64 A10 10 0 0 1 82 74 H18 A10 10 0 0 1 8 64 V59 A9 9 0 0 0 8 41 V36 A10 10 0 0 1 18 26 Z',
    faceScale: 0.66,
  },
  clubhouse: { d: rpoly([[10, 50], [50, 12], [90, 50], [80, 50], [80, 90], [20, 90], [20, 50]], 6), parts: rrect(66, 16, 76, 40, 3), faceY: 66, faceScale: 0.66 },
};
