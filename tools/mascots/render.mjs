// Renders every club mascot in three moods into apps/*/public/mascots.
//   npm install && npm run render   (needs `brew install webp` for cwebp)
// The first 18 are the bot-avatars types; CLUB in clubshapes.mjs are our own.
import { createCanvas, Path2D, ImageData } from '@napi-rs/canvas';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
globalThis.Path2D = Path2D; globalThis.ImageData = ImageData;
globalThis.OffscreenCanvas = class { constructor(w, h) { return createCanvas(w, h); } };
globalThis.document = { createElement: () => createCanvas(1, 1) };
const B = await import('bot-avatars');
const { CLUB } = await import('./clubshapes.mjs');

const box = 96, dpr = 2, px = Math.round(box * B.BOT_AVATAR_OVERSCAN * dpr);
const all = [
  ...B.botAvatarTypes.map(t => { const p = B.botAvatarPresets[t]; return [t, p.color, { d: B.botAvatarShapes[t], parts: B.botAvatarParts[t], faceX: p.faceX, faceY: p.faceY, faceScale: p.faceScale }]; }),
  ...CLUB.map(([t, , color, s]) => [t, color, s]),
];
fs.mkdirSync('out', { recursive: true });
all.forEach(([t, color, s], i) => {
  const key = 'm-' + t;
  const cfg = { path: new Path2D(s.d), parts: s.parts ? new Path2D(s.parts) : undefined, partsDepth: 0.5, face: 'mouth',
    faceX: s.faceX ?? 50, faceY: s.faceY ?? 50, faceScale: s.faceScale ?? 0.7, color, ink: B.autoInk(color),
    shading: 'plastic', dpr, sides: 'vector', typeKey: key, still: true };
  B.warmBotAvatarPlastic(key, cfg.path, px);
  for (const [state, mood] of [['default', 'idle'], ['working', 'work'], ['sleeping', 'sleep']]) {
    const sim = new B.BotAvatarSim(0.37 + i * 0.03, state); sim.setTurn?.(0.3);
    for (let k = 0; k < (state === 'sleeping' ? 60 : 26); k++) sim.update(1 / 24);
    const c = createCanvas(px, px); const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    B.drawBotAvatarFrame(ctx, box, sim.pose, cfg);
    const png = `out/${t}-${mood}.png`;
    fs.writeFileSync(png, c.toBuffer('image/png'));
    for (const app of ['club-admin', 'super-admin']) {
      execFileSync('cwebp', ['-quiet', '-q', '85', png, '-o', `../../apps/${app}/public/mascots/${t}-${mood}.webp`]);
    }
  }
});
console.log('rendered', all.length, 'mascots');
