window.DEMO={"base":"/conectica-recibos-demo","firma":{"recibo":"13","destino":"/conectica-recibos-demo/b/__firma/"}};
// Demo estática: los formularios no van a un servidor; cada envío lleva a la pantalla capturada que corresponde.
(function () {
  'use strict';
  var D = window.DEMO, B = D.base;

  function ruta(u) {
    var p = new URL(u, location.href).pathname;
    if (p.indexOf(B) === 0) p = p.slice(B.length);
    p = p.replace(/^\/__no/, '').replace(/^\/b(?=\/)/, '');
    return p.replace(/\/$/, '') || '/';
  }

  function aviso(texto) {
    var t = document.querySelector('.demo-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'demo-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.add('visible');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { t.classList.remove('visible'); }, 3500);
  }

  function enviar(form) {
    var r = ruta(form.getAttribute('action') || location.href);
    var metodo = (form.getAttribute('method') || 'get').toLowerCase();
    var ir = null;
    if (metodo === 'get') { aviso('En la demo los filtros y búsquedas no están activos.'); return; }
    if (r === '/ingresar') ir = '/aceptacion/';
    else if (r === '/aceptacion') ir = '/inicio/';
    else if (r === '/admin/ingresar') ir = '/admin/';
    else if (r === '/salir') ir = '/ingresar/';
    else if (r === '/admin/salir') ir = '/admin/ingresar/';
    else if (/^\/recibos\/\d+\/firmar$/.test(r)) {
      var tipo = form.querySelector('input[name="tipo"]:checked');
      if (r === '/recibos/' + D.firma.recibo + '/firmar' && (!tipo || tipo.value === 'conforme')) {
        location.href = D.firma.destino; return;
      }
      aviso('En esta demo se puede probar la firma conforme del recibo pendiente.'); return;
    } else if (r === '/olvide-mi-clave') { aviso('En la demo no se mandan mails.'); return; }
    if (ir) { location.href = B + ir; return; }
    aviso('Es una demostración: este cambio no se guarda.');
  }

  HTMLFormElement.prototype.submit = function () { enviar(this); };
  window.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    enviar(e.target);
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a && a.getAttribute('href').indexOf(B + '/__no') === 0) {
      e.preventDefault();
      aviso('Esta pantalla no está incluida en la demo.');
    }
  }, true);
})();
