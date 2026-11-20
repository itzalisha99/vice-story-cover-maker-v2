// Fixed scenes for screenshots. ?shot=cover shows the finished cover alone;
// ?shot=editor shows the editor with all three photo moments loaded.
// `size` picks the post size, `layout` and `grade` the look, `caption` the words.
// window.__shotReady is set once the cover has painted twice.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const size = query.get('size') || 'wide';
  const layout = query.get('layout') || 'triptych';
  const grade = query.get('grade') || 'sunset';
  api.set({ size, layout, grade, active: 0 });
  await Promise.all([0, 1, 2].map((i) => api.loadSample(i)));
  api.caption(
    query.get('caption') || 'VICE STORY',
    query.get('sub') || 'Three moments. One city.',
  );
  api.tag(0, query.get('tag0') || 'CH.01 SUNSET');
  api.tag(1, query.get('tag1') || 'CH.02 NEON');
  api.tag(2, query.get('tag2') || 'CH.03 HEIST');
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
