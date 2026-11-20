// Vice Story cover painter: three photo panels, four colour grades, a slitted
// sun and palm silhouettes, bold caption lettering and chapter tags. All art
// is drawn in code — no Rockstar logo, artwork, character or font is used.

export const GRADES = {
  sunset: { name: 'Vice Sunset', top: 'rgba(255,110,60,0.10)', bottom: 'rgba(190,30,110,0.55)', sun: '#ffd978', ink: '#ffffff', accent: '#ff5e78' },
  neon: { name: 'Neon Night', top: 'rgba(80,40,200,0.12)', bottom: 'rgba(20,10,70,0.60)', sun: '#e8e2ff', ink: '#ffffff', accent: '#00ffe6' },
  gold: { name: 'Beach Gold', top: 'rgba(255,190,90,0.10)', bottom: 'rgba(180,90,20,0.50)', sun: '#fff3b0', ink: '#ffffff', accent: '#ffb300' },
  teal: { name: 'Heist Teal', top: 'rgba(40,200,190,0.10)', bottom: 'rgba(10,70,90,0.58)', sun: '#ffe9a0', ink: '#ffffff', accent: '#2ee6c8' },
};

export const LAYOUTS = {
  triptych: { name: 'Triptych', rects: (w, h, g) => [[g, g, w / 3 - g * 1.5, h - g * 2], [w / 3 + g / 2, g, w / 3 - g, h - g * 2], [(2 * w) / 3 + g / 2, g, w / 3 - g * 1.5, h - g * 2]] },
  hero: { name: 'Hero Split', rects: (w, h, g) => [[g, g, w * 0.6 - g * 1.5, h - g * 2], [w * 0.6 + g / 2, g, w * 0.4 - g * 1.5, h / 2 - g * 1.5], [w * 0.6 + g / 2, h / 2 + g / 2, w * 0.4 - g * 1.5, h / 2 - g * 1.5]] },
  strip: { name: 'Sunset Strip', rects: (w, h, g) => [[g, g, w - g * 2, h * 0.58 - g * 1.5], [g, h * 0.58 + g / 2, w / 2 - g * 1.5, h * 0.42 - g * 1.5], [w / 2 + g / 2, h * 0.58 + g / 2, w / 2 - g * 1.5, h * 0.42 - g * 1.5]] },
};

/** Panel rects for a layout at a given canvas size. */
export function panelRects(layout, w, h) {
  return LAYOUTS[layout].rects(w, h, Math.max(6, w * 0.008));
}

function drawPanelPhoto(ctx, img, rect, panel) {
  const [x, y, pw, ph] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, pw, ph);
  ctx.clip();
  if (img) {
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const cx = x + pw / 2 + (panel.ox || 0) * pw * 0.4;
    const cy = y + ph / 2 + (panel.oy || 0) * ph * 0.4;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = '#241533';
    ctx.fillRect(x, y, pw, ph);
  }
  ctx.restore();
}

function drawSlittedSun(ctx, cx, cy, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  const gap = Math.max(4, r / 9);
  for (let yy = cy - r; yy <= cy + r; yy += gap) {
    const half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
    if (half < 2) continue;
    ctx.fillRect(cx - half, yy, half * 2, gap * 0.62);
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 14 * s, y - 55 * s, x + 34 * s, y - 105 * s);
  ctx.stroke();
  const tx = x + 34 * s;
  const ty = y - 105 * s;
  ctx.lineWidth = 5 * s;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + i * 0.135);
    const ex = tx + Math.cos(a) * 92 * s;
    const ey = ty - Math.sin(a) * 52 * s + 26 * s * Math.sin(i * 1.3);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + ex) / 2, ey - 18 * s, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
  }
  return size;
}

/**
 * Paints the whole cover. panels: [{img, zoom, ox, oy}] x3. opts: {layout,
 * grade, caption, sub, tags:[...]}. The canvas keeps its own pixel size,
 * so the same painter serves the live preview and the exact-size export.
 */
export function drawViceCover(canvas, panels, opts) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[opts.grade] || GRADES.sunset;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(opts.layout || 'triptych', w, h);
  rects.forEach((rect, i) => drawPanelPhoto(ctx, panels[i] && panels[i].img, rect, panels[i] || {}));

  // Colour grade wash over everything.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Slitted sun top-right + palm silhouettes bottom corners.
  const sunR = w * 0.085;
  drawSlittedSun(ctx, w - sunR * 1.7, h * 0.16, sunR, grade.sun);
  ctx.globalAlpha = 0.92;
  drawPalm(ctx, w * 0.02, h * 0.99, w / 900, '#12081d');
  drawPalm(ctx, w * 0.94, h * 0.99, w / 1100, '#12081d');
  ctx.globalAlpha = 1;

  // Chapter tags, top-left, one pill per panel moment.
  const tags = (opts.tags || []).filter(Boolean).slice(0, 3);
  let tx = w * 0.03;
  const ty = h * 0.035;
  const tagH = Math.max(22, h * 0.032);
  tags.forEach((tag) => {
    ctx.font = `800 ${Math.round(tagH * 0.52)}px Arial, Helvetica, sans-serif`;
    const tw = ctx.measureText(tag).width + tagH * 1.1;
    ctx.fillStyle = 'rgba(10,5,18,0.72)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, tagH, tagH / 2);
    ctx.fill();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(1.5, w * 0.0015);
    ctx.stroke();
    ctx.fillStyle = grade.ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(tag, tx + tagH * 0.55, ty + tagH / 2 + 1);
    tx += tw + w * 0.015;
  });

  // Caption band + bold lettering along the foot.
  const bandH = h * 0.24;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(10,4,20,0)');
  band.addColorStop(1, 'rgba(10,4,20,0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);
  const caption = (opts.caption || 'VICE STORY').trim().toUpperCase();
  const size = fitFont(ctx, caption, w * 0.92, h * 0.105);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,4,20,0.9)';
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(caption, w / 2, h - h * 0.075);
  ctx.fillStyle = grade.ink;
  ctx.fillText(caption, w / 2, h - h * 0.075);
  // Accent underline under the caption.
  const cw = ctx.measureText(caption).width;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w / 2 - cw * 0.32, h - h * 0.045, cw * 0.64, Math.max(3, h * 0.006));
  const sub = (opts.sub || '').trim();
  if (sub) {
    ctx.font = `700 ${Math.round(h * 0.026)}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(sub.toUpperCase(), w / 2, h - h * 0.015);
  }
}
