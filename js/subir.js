// Subida manual de PDF (admin/subir). PHP descarta sin avisar los archivos que pasan de max_file_uploads, así que la
// cantidad se controla acá, antes de mandar. Va en un archivo aparte: la política de seguridad no deja scripts en línea.
(function () {
    'use strict';

    var entrada = document.querySelector('input[data-max-archivos]');
    var aviso = document.getElementById('aviso-archivos');
    if (!entrada || !aviso) {
        return;
    }
    var maximo = parseInt(entrada.getAttribute('data-max-archivos'), 10);

    function controlar() {
        var cantidad = entrada.files ? entrada.files.length : 0;
        if (cantidad > maximo) {
            var mensaje = 'Elegiste ' + cantidad + ' archivos y se pueden subir hasta ' + maximo
                + ' por vez. Elegí menos y subí el resto después.';
            entrada.setCustomValidity(mensaje);
            aviso.textContent = mensaje;
            aviso.hidden = false;
            return false;
        }
        entrada.setCustomValidity('');
        aviso.textContent = '';
        aviso.hidden = true;
        return true;
    }

    entrada.addEventListener('change', controlar);
    if (entrada.form) {
        // Con la validación del navegador, el formulario ni se manda; esto cubre al que la tenga apagada.
        entrada.form.addEventListener('submit', function (evento) {
            if (!controlar()) {
                evento.preventDefault();
                if (entrada.reportValidity) {
                    entrada.reportValidity();
                }
            }
        });
    }
    controlar();
})();
