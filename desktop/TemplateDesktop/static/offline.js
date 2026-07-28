// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Офлайн хуудасны логик. `geregeShell` гүүрийг preload тавина (зөвхөн file://).

(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  document.getElementById('origin').textContent = params.get('origin') || '—';
  document.getElementById('reason').textContent = params.get('reason') || '—';

  document.getElementById('retry').addEventListener('click', function () {
    window.geregeShell.retry();
  });

  document.getElementById('settings').addEventListener('click', function () {
    window.geregeShell.openServerSettings();
  });

  // Сүлжээ сэргэмэгц өөрөө оролдоно.
  window.addEventListener('online', function () {
    window.geregeShell.retry();
  });
})();
