// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// "Сервер солих" цонхны логик.

(function () {
  'use strict';

  var input = document.getElementById('url');
  var error = document.getElementById('error');
  var presets = document.getElementById('presets');

  function render(info) {
    if (!info) return;
    input.value = info.current;
    document.getElementById('note').hidden = !info.envLocked;

    info.presets.forEach(function (preset) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset';
      button.setAttribute('aria-current', String(preset.url === info.current));

      var title = document.createElement('span');
      title.textContent = preset.label;
      var url = document.createElement('small');
      url.textContent = preset.url;

      button.appendChild(title);
      button.appendChild(url);
      button.addEventListener('click', function () {
        input.value = preset.url;
        save();
      });
      presets.appendChild(button);
    });
  }

  function save() {
    error.textContent = '';
    window.geregeShell.setServer(input.value).then(function (ok) {
      if (!ok) error.textContent = 'Хаяг буруу байна. http:// эсвэл https:// хаяг оруулна уу.';
    });
  }

  document.getElementById('save').addEventListener('click', save);
  document.getElementById('cancel').addEventListener('click', function () {
    window.geregeShell.close();
  });
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') save();
  });

  window.geregeShell.serverInfo().then(render);
})();
