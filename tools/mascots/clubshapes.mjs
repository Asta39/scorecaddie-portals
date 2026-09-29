// Extra club mascots (beyond the 18 bot-avatars types), in the 100x100 body box.
import { rpoly, blob, circle, ellipse, capsule, rrect } from './achshapes.mjs';
const j = (...d) => d.join('');
export const CLUB = [
  ['bear', 'Bear', '#B07A4F', { d: j(circle(50, 56, 36), circle(24, 26, 13), circle(76, 26, 13)), faceY: 58, faceScale: .82 }],
  ['bunny', 'Bunny', '#F2E8DC', { d: j(circle(50, 64, 30), ellipse(37, 26, 9, 24, -8), ellipse(63, 26, 9, 24, 8)), faceY: 64, faceScale: .75 }],
  ['frog', 'Frog', '#5CC46A', { d: j(ellipse(50, 60, 42, 28), circle(30, 34, 14), circle(70, 34, 14)), faceY: 60, faceScale: .8 }],
  ['mouse', 'Mouse', '#B9BEC8', { d: j(circle(50, 60, 30), circle(22, 30, 18), circle(78, 30, 18)), faceY: 62, faceScale: .72 }],
  ['elephant', 'Elephant', '#9AA6B8', { d: j(circle(50, 50, 30), ellipse(18, 48, 16, 22), ellipse(82, 48, 16, 22)), parts: capsule(50, 70, 50, 94, 12), faceY: 46, faceScale: .7 }],
  ['lion', 'Lion', '#E8A33A', { d: blob(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = i % 2 ? 40 : 46; return [50 + Math.cos(a) * r, 52 + Math.sin(a) * r]; }), 1), faceY: 54, faceScale: .8 }],
  ['hippo', 'Hippo', '#C79AC9', { d: j(rpoly([[14, 34], [86, 34], [92, 86], [8, 86]], 22), circle(28, 28, 9), circle(72, 28, 9)), faceY: 56, faceScale: .82 }],
  ['chick', 'Chick', '#FFD84D', { d: j(ellipse(50, 58, 34, 38), ellipse(50, 14, 5, 10)), faceY: 52, faceScale: .75 }],
  ['mushroom', 'Mushroom', '#E2574C', { d: j(blob([[6, 52], [20, 20], [50, 8], [80, 20], [94, 52]], 1), rpoly([[34, 50], [66, 50], [64, 92], [36, 92]], 10)), faceY: 34, faceScale: .72 }],
  ['acorn', 'Acorn', '#C98B4A', { d: j(ellipse(50, 62, 28, 32), rpoly([[16, 38], [84, 38], [80, 22], [20, 22]], 10), ellipse(50, 14, 4, 8)), faceY: 62, faceScale: .72 }],
  ['heart', 'Heart', '#F06292', { d: 'M50 90 C20 70 6 52 6 34 C6 18 18 8 31 8 C40 8 46 13 50 20 C54 13 60 8 69 8 C82 8 94 18 94 34 C94 52 80 70 50 90 Z', faceY: 42, faceScale: .8 }],
  ['sun', 'Sun', '#FFB020', { d: blob(Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2, r = i % 2 ? 36 : 47; return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; }), .6), faceScale: .78 }],
  ['moon', 'Moon', '#F3E7B3', { d: 'M62 6 C36 10 18 30 18 54 C18 78 38 96 62 94 C74 93 84 88 90 80 C62 82 44 64 44 44 C44 28 52 14 62 6 Z', faceX: 36, faceY: 56, faceScale: .55 }],
  ['bell', 'Bell', '#F2C14E', { d: j('M50 10 C30 10 22 28 22 46 C22 62 16 70 8 78 H92 C84 70 78 62 78 46 C78 28 70 10 50 10 Z', circle(50, 86, 8)), faceY: 48, faceScale: .75 }],
  ['tulip', 'Tulip', '#FF6F91', { d: 'M18 16 L34 32 L50 12 L66 32 L82 16 C88 44 82 70 50 76 C18 70 12 44 18 16 Z', parts: capsule(50, 70, 50, 96, 6), faceY: 50, faceScale: .72 }],
  ['jelly', 'Jelly', '#B388FF', { d: j('M8 56 C8 28 26 10 50 10 C74 10 92 28 92 56 Z', capsule(24, 54, 22, 86, 9), capsule(42, 54, 40, 92, 9), capsule(60, 54, 62, 92, 9), capsule(78, 54, 80, 86, 9)), faceY: 38, faceScale: .75 }],
  ['cactus', 'Cactus', '#43A047', { d: j(rrect(32, 10, 68, 92, 18), rrect(8, 30, 26, 60, 9), rrect(74, 22, 92, 52, 9), rrect(14, 50, 40, 64, 7), rrect(60, 42, 86, 56, 7)), faceY: 42, faceScale: .66 }],
  ['lemon', 'Lemon', '#E9E24A', { d: j(ellipse(50, 50, 42, 32, -20), ellipse(90, 22, 6, 4, -20), ellipse(10, 78, 6, 4, -20)), faceScale: .8 }],
  ['apple', 'Apple', '#E53935', { d: 'M50 24 C40 14 12 14 10 44 C8 72 30 96 50 88 C70 96 92 72 90 44 C88 14 60 14 50 24 Z', parts: j(capsule(50, 26, 54, 6, 5), ellipse(66, 12, 12, 6, -25)), faceY: 56, faceScale: .8 }],
  ['kite', 'Kite', '#26C6DA', { d: rpoly([[50, 4], [90, 42], [50, 96], [10, 42]], 10), faceY: 44, faceScale: .72 }],
  ['bean', 'Bean', '#8BC34A', { d: 'M30 10 C52 4 64 22 60 38 C58 48 70 52 78 60 C92 76 80 96 58 94 C30 92 10 74 10 46 C10 26 16 14 30 10 Z', faceX: 44, faceY: 62, faceScale: .72 }],
  ['whale', 'Whale', '#3F7BD9', { d: j(ellipse(44, 58, 38, 28), 'M76 50 L96 30 L94 56 L82 62 Z'), faceX: 34, faceY: 58, faceScale: .75 }],
  ['snail', 'Snail', '#D4A373', { d: j(circle(58, 48, 32), rpoly([[4, 72], [92, 72], [92, 88], [4, 88]], 8), capsule(14, 76, 8, 50, 7)), faceX: 58, faceY: 50, faceScale: .75 }],
  ['rhino', 'Rhino', '#8D99AE', { d: j(rpoly([[14, 30], [86, 30], [90, 88], [10, 88]], 24), 'M44 34 L50 6 L58 34 Z', circle(20, 26, 8), circle(80, 26, 8)), faceY: 60, faceScale: .82 }],
];
