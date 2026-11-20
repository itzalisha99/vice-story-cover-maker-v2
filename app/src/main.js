// Vice Story wiring: three photo panels, three layouts, four grades, three
// post sizes, drag / wheel / slider cropping, editable caption and chapter
// tags, and an exact-size PNG export. A `?shot=` query sets up a fixed scene
// for a screenshot instead (./shots.js).
import { drawViceCover, GRADES, LAYOUTS, panelRects } from './cover.js';
import { runShot } from './shots.js';

const SIZES = {
  square: { name: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { name: '1080 x 1350', w: 1080, h: 1350 },
  wide: { name: '1920 x 1080', w: 1920, h: 1080 },
};
const SAMPLES = ['sunset-street', 'neon-night', 'beach-heist'];
const MOMENTS = ['Sunset Street', 'Neon Night', 'Beach Heist'];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');

const state = {
  layout: 'triptych',
  grade: 'sunset',
  size: 'square',
  active: 0,
  panels: SAMPLES.map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function applySize() {
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
}

function tags() {
  return [0, 1, 2].map((i) => document.getElementById(`tag${i}`).value.trim());
}

function redraw() {
  applySize();
  drawViceCover(canvas, state.panels, {
    layout: state.layout,
    grade: state.grade,
    caption: captionInput.value,
    sub: subInput.value,
    tags: tags(),
  });
  document.querySelectorAll('[data-panel]').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.panel) === state.active);
  });
}

function setPanelPhoto(i, img) {
  state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
  state.active = i;
  syncSliders();
  redraw();
}

async function loadSample(i) {
  try {
    setPanelPhoto(i, await loadImage(`samples/${SAMPLES[i]}.jpg`));
    status.textContent = `Panel ${i + 1} loaded: ${MOMENTS[i]}.`;
  } catch {
    status.textContent = 'That sample could not be loaded.';
  }
}

function syncSliders() {
  const p = state.panels[state.active];
  document.getElementById('zoom').value = p.zoom;
  document.getElementById('panx').value = p.ox;
  document.getElementById('pany').value = p.oy;
  document.getElementById('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
}

// Panel pickers: upload, sample, and the active-panel highlight.
document.querySelectorAll('[data-panel]').forEach((card) => {
  const i = Number(card.dataset.panel);
  card.querySelector('.pick').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPanelPhoto(i, await loadImage(URL.createObjectURL(file)));
    status.textContent = `Panel ${i + 1} loaded from your photo.`;
  });
  card.querySelector('.sample').addEventListener('click', () => loadSample(i));
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    state.active = i;
    syncSliders();
    redraw();
  });
});

// Crop sliders for the active panel.
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.active].zoom = Number(e.target.value);
  syncSliders();
  redraw();
});
document.getElementById('panx').addEventListener('input', (e) => {
  state.panels[state.active].ox = Number(e.target.value);
  redraw();
});
document.getElementById('pany').addEventListener('input', (e) => {
  state.panels[state.active].oy = Number(e.target.value);
  redraw();
});

// Drag to pan and wheel to zoom the panel under the pointer.
let dragging = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  return { rects: panelRects(state.layout, canvas.width, canvas.height), x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const { rects, x, y } = panelAt(e.clientX, e.clientY);
  const hit = rects.findIndex(([rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
  if (hit < 0) return;
  state.active = hit;
  dragging = { x: e.clientX, y: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
  canvas.setPointerCapture(e.pointerId);
  syncSliders();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[state.active];
  p.ox = Math.max(-1, Math.min(1, dragging.ox + ((e.clientX - dragging.x) / r.width) * 2.2));
  p.oy = Math.max(-1, Math.min(1, dragging.oy + ((e.clientY - dragging.y) / r.height) * 2.2));
  syncSliders();
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.active];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncSliders();
  redraw();
}, { passive: false });

// Segmented choices: layout, grade, size.
function wireGroup(name, key) {
  document.querySelectorAll(`[data-group="${name}"] button`).forEach((btn) => {
    btn.addEventListener('click', () => {
      state[key] = btn.dataset.value;
      document.querySelectorAll(`[data-group="${name}"] button`).forEach((b) => b.classList.toggle('on', b === btn));
      redraw();
    });
  });
}
wireGroup('layout', 'layout');
wireGroup('grade', 'grade');
wireGroup('size', 'size');

[captionInput, subInput, ...[0, 1, 2].map((i) => document.getElementById(`tag${i}`))].forEach((el) => {
  el.addEventListener('input', redraw);
});

// Export: render the same painter at the exact post size and download it.
document.getElementById('export').addEventListener('click', () => {
  const s = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawViceCover(off, state.panels, {
    layout: state.layout,
    grade: state.grade,
    caption: captionInput.value,
    sub: subInput.value,
    tags: tags(),
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-story-${s.w}x${s.h}.png`;
    a.click();
    status.textContent = `Saved vice-story-${s.w}x${s.h}.png — ${s.w} x ${s.h}, exact.`;
  }, 'image/png');
});

document.getElementById('shuffle').addEventListener('click', () => {
  const grades = Object.keys(GRADES);
  state.grade = grades[(grades.indexOf(state.grade) + 1) % grades.length];
  document.querySelectorAll('[data-group="grade"] button').forEach((b) => b.classList.toggle('on', b.dataset.value === state.grade));
  redraw();
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: async (i) => { state.panels[i].img = await loadImage(`samples/${SAMPLES[i]}.jpg`); },
    set: (patch) => { Object.assign(state, patch); },
    caption: (text, sub) => { captionInput.value = text; subInput.value = sub || ''; },
    tag: (i, text) => { document.getElementById(`tag${i}`).value = text; },
    redraw,
  });
} else {
  Promise.all(SAMPLES.map((s) => loadImage(`samples/${s}.jpg`))).then((imgs) => {
    imgs.forEach((img, i) => { state.panels[i].img = img; });
    redraw();
  });
  redraw();
}
