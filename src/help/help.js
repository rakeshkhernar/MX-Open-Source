// Drag-to-scroll for horizontal card sliders
document.querySelectorAll('.indicators-grid, .pattern-grid').forEach(el => {
  let isDown = false, startX, scrollLeft;
  el.style.cursor = 'grab';
  el.style.userSelect = 'none';

  function stopDrag(e) {
    if (!isDown) return;
    isDown = false;
    el.style.cursor = 'grab';
    if (e) el.releasePointerCapture(e.pointerId);
  }

  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; // left click only
    isDown = true;
    startX = e.clientX;
    scrollLeft = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', stopDrag);
  el.addEventListener('pointercancel', stopDrag);
  el.addEventListener('pointermove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.clientX - startX);
  });
});
