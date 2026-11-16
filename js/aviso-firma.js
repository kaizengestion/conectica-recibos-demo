// Aviso «¡Perfecto!» al volver de firmar conforme (empleado/recibos/_aviso_firma, firma v2 2026-10-19). Archivo aparte:
// la CSP no deja scripts en línea. Sin este script el aviso igual se ve y se cierra (dialog open + form method="dialog").
// 1. Lo reabre como modal (showModal): el resto de la página queda inerte, Esc lo cierra y el foco va al título.
// 2. «Ver recibo» cierra con returnValue 'ver' y lleva al visor del PDF.
// 3. «Descargar PDF» con [data-aviso-descargar] (el PDF firmado todavía se está armando): muestra «Preparando tu recibo…»,
//    consulta esa URL (recibos.firmado.estado, JSON de solo lectura) cada 3 s y, apenas está, descarga sola. A los 2 minutos
//    avisa que todavía se está preparando y el botón vuelve a quedar habilitado.
(function () {
    'use strict';

    var dialogo = document.querySelector('[data-aviso-firma]');
    if (!dialogo) {
        return;
    }
    var titulo = document.getElementById('aviso-firma-titulo');

    if (typeof dialogo.showModal === 'function') {
        if (dialogo.open) {
            dialogo.close(); // Llega abierto para que se vea sin JS; se reabre como modal.
        }
        dialogo.returnValue = '';
        dialogo.showModal();
    }
    if (titulo) {
        titulo.focus();
    }

    dialogo.addEventListener('close', function () {
        if (dialogo.returnValue !== 'ver') {
            return;
        }
        var visor = document.querySelector('.visor');
        if (visor) {
            visor.scrollIntoView({ block: 'nearest' });
            visor.focus({ preventScroll: true });
        }
    });

    var boton = dialogo.querySelector('[data-aviso-descargar]');
    var estado = dialogo.querySelector('[data-aviso-estado]');
    var etiqueta = boton && boton.querySelector('[data-aviso-descargar-texto]');
    if (!boton || !etiqueta) {
        return;
    }
    var INTERVALO = 3000;
    var LIMITE = 120000;
    var textoOriginal = etiqueta.textContent;
    var esperando = false;

    function avisar(mensaje) {
        if (estado) {
            estado.textContent = mensaje;
        }
    }

    function terminar() {
        esperando = false;
        boton.classList.remove('preparando');
        boton.removeAttribute('aria-disabled');
        boton.removeAttribute('aria-busy');
        etiqueta.textContent = textoOriginal;
    }

    function descargar(url) {
        // De acá en más el botón descarga directo, sin volver a consultar.
        boton.removeAttribute('data-aviso-descargar');
        boton.setAttribute('href', url);
        terminar();
        window.location.assign(url);
    }

    function seguir(desde) {
        if (Date.now() - desde >= LIMITE) {
            terminar();
            avisar('Todavía se está preparando; probá en unos minutos.');
            return;
        }
        window.setTimeout(function () {
            consultar(desde);
        }, INTERVALO);
    }

    function consultar(desde) {
        fetch(boton.getAttribute('data-aviso-descargar'), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store'
        }).then(function (respuesta) {
            if (!respuesta.ok) {
                throw new Error('estado ' + respuesta.status);
            }
            return respuesta.json();
        }).then(function (datos) {
            if (!esperando) {
                return;
            }
            if (datos && datos.listo && datos.url) {
                descargar(datos.url);
            } else {
                seguir(desde);
            }
        }).catch(function () {
            // Un corte de red o una respuesta rara no cortan la espera: se reintenta hasta el límite.
            if (esperando) {
                seguir(desde);
            }
        });
    }

    boton.addEventListener('click', function (evento) {
        if (!boton.hasAttribute('data-aviso-descargar')) {
            return; // Ya está listo: el link descarga directo.
        }
        evento.preventDefault();
        if (esperando) {
            return;
        }
        esperando = true;
        avisar('');
        boton.classList.add('preparando');
        boton.setAttribute('aria-disabled', 'true');
        boton.setAttribute('aria-busy', 'true');
        etiqueta.textContent = 'Preparando tu recibo…';
        consultar(Date.now());
    });
})();
