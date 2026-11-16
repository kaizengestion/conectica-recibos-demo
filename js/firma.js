// Firma del recibo (empleado/recibos/_firma). Va en un archivo aparte: la política de seguridad no deja scripts en línea.
// 1. La casilla de la observación se muestra solo con "disconformidad" elegida; al aparecer, el cursor va a la casilla.
//    Volver a "conformidad" la oculta sin borrar lo escrito.
// 2. Rediseño F (2026-10-14): «Deslizá para firmar conforme» y «No estoy conforme». Al soltar la perilla al final (o al
//    activarla con el teclado: Enter o Espacio) se elige conformidad y se pide la clave; el envío es el de siempre.
//    Sin JavaScript, o si la página volvió con un error (form[data-firma-abierta]), queda el formulario completo.
// 3. Ajuste 2026-10-14: en escritorio (1024px o más, al cargar la página) no hay gesto. Se ve la casilla «Leí el recibo y
//    estoy conforme» (data-firma-conforme), la clave y «Firmar conforme», deshabilitado hasta tildar la casilla; «No estoy
//    conforme» abre el motivo como en el celular. En el celular (menos de 1024px) el deslizador queda como estaba.
// 4. Firma v2 (2026-10-19, solo celular y solo con el dedo o el mouse): apenas arranca el arrastre, la sección de la firma
//    pasa a firma-compacta y el CSS oculta lo marcado con data-firma-ocultable. Antes de ocultar se reserva el alto de la
//    página (body.style.minHeight), así no se acorta y la barra no se mueve bajo el dedo. Al soltar al final: «Listo,
//    ahora tu clave», la clave y «Firmar recibo», sin el texto. Si suelta antes, la perilla vuelve y el texto reaparece.
//    Con el teclado (Enter o Espacio) queda como antes: se pide la clave y el texto sigue a la vista.
// 5. Ajuste 2026-10-19: si deslizó hasta el final (por error), «Cancelar» junto a la clave lo deshace sin recargar: la
//    perilla vuelve al inicio, se borra la clave, se esconden clave y «Firmar recibo», vuelve el texto (con «No estoy
//    conforme») y el alto de la página, y el foco queda en la perilla. Sin JavaScript y en escritorio sigue hidden.
(function () {
    'use strict';

    var caja = document.getElementById('observacion-firma');
    if (!caja) {
        return;
    }
    var form = caja.closest('form');
    var texto = caja.querySelector('textarea');
    var opciones = form ? form.querySelectorAll('input[name="tipo"]') : [];

    function elegida() {
        for (var i = 0; i < opciones.length; i++) {
            if (opciones[i].checked) {
                return opciones[i].value;
            }
        }
        return null;
    }

    function actualizar(enfocar) {
        var abrir = elegida() === 'disconforme';
        caja.hidden = !abrir;
        if (abrir && enfocar && texto) {
            texto.focus();
        }
    }

    function elegir(valor) {
        for (var i = 0; i < opciones.length; i++) {
            opciones[i].checked = opciones[i].value === valor;
        }
    }

    for (var i = 0; i < opciones.length; i++) {
        opciones[i].addEventListener('change', function () {
            actualizar(true);
        });
    }

    var deslizador = form && form.querySelector('[data-deslizador]');
    var perilla = form && form.querySelector('[data-deslizador-perilla]');
    var pista = deslizador && deslizador.querySelector('.deslizador-pista');
    var tipo = form && form.querySelector('[data-firma-tipo]');
    var clave = form && form.querySelector('[data-firma-clave]');
    var alternativa = form && form.querySelector('[data-firma-alternativa]');
    var noConforme = form && form.querySelector('[data-firma-disconforme]');
    var campoClave = form && form.querySelector('input[name="password"]');
    var conforme = form && form.querySelector('[data-firma-conforme]');
    var casillaConforme = conforme && conforme.querySelector('input[type="checkbox"]');
    var enviar = clave && clave.querySelector('button[type="submit"]');
    var notaGesto = alternativa && alternativa.querySelector('.firma-nota');
    var cancelar = clave && clave.querySelector('[data-firma-cancelar]');
    var escritorio = !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);

    if (escritorio && conforme && casillaConforme && enviar && tipo && clave && alternativa && noConforme && !form.hasAttribute('data-firma-abierta')) {
        var textoEnviar = enviar.textContent;
        // Conformidad: casilla a la vista y «Firmar conforme» habilitado solo con la casilla tildada.
        var modoConforme = function () {
            conforme.hidden = false;
            enviar.textContent = 'Firmar conforme';
            enviar.disabled = !casillaConforme.checked;
        };
        // Disconformidad: la casilla no aplica (y no viaja); el botón vuelve a «Firmar recibo» y el motivo es obligatorio.
        var modoDisconforme = function () {
            conforme.hidden = true;
            casillaConforme.checked = false;
            enviar.textContent = textoEnviar;
            enviar.disabled = false;
        };

        tipo.hidden = true;
        alternativa.hidden = false;
        if (notaGesto) {
            notaGesto.hidden = true;
        }
        elegir('conforme');
        modoConforme();

        casillaConforme.addEventListener('change', function () {
            enviar.disabled = !casillaConforme.checked;
        });
        for (var j = 0; j < opciones.length; j++) {
            opciones[j].addEventListener('change', function () {
                if (elegida() === 'disconforme') {
                    modoDisconforme();
                } else {
                    modoConforme();
                }
            });
        }
        noConforme.addEventListener('click', function () {
            tipo.hidden = false;
            elegir('disconforme');
            modoDisconforme();
            actualizar(true);
        });
    } else if (deslizador && perilla && pista && tipo && clave && alternativa && noConforme && !form.hasAttribute('data-firma-abierta')) {
        deslizador.hidden = false;
        alternativa.hidden = false;
        tipo.hidden = true;
        clave.hidden = true;

        var recorrido = 0;
        var inicio = 0;
        var origen = 0;
        var arrastrando = false;
        var seccion = form.closest('.firma');
        var relleno = pista.querySelector('.deslizador-relleno');
        var textoDeslizador = pista.querySelector('.deslizador-texto');
        var textoOriginal = textoDeslizador ? textoDeslizador.textContent : '';
        var compacta = false;

        // Ocultar lo de abajo (data-firma-ocultable, por CSS). Primero se fija el alto actual de la página: si el empleado
        // está al final, al acortarse el navegador correría todo hacia abajo y la perilla se iría de debajo del dedo.
        var compactar = function () {
            if (compacta || !seccion) {
                return;
            }
            compacta = true;
            document.body.style.minHeight = document.documentElement.scrollHeight + 'px';
            seccion.classList.add('firma-compacta');
        };
        var descompactar = function () {
            if (!compacta) {
                return;
            }
            compacta = false;
            seccion.classList.remove('firma-compacta');
            document.body.style.minHeight = '';
        };
        var rellenar = function () {
            if (relleno) {
                relleno.style.width = recorrido > 0 ? (recorrido + perilla.offsetWidth + 4) + 'px' : '';
            }
        };

        var maximo = function () {
            return Math.max(0, pista.clientWidth - perilla.offsetWidth - 8);
        };
        // Mover con la propiedad del CSSOM está permitido por la CSP (lo bloqueado es el atributo style en el HTML).
        var mover = function (x) {
            recorrido = Math.max(0, Math.min(maximo(), x));
            perilla.style.transform = 'translateX(' + recorrido + 'px)';
        };
        var pedirClave = function (valor) {
            elegir(valor);
            actualizar(valor === 'disconforme');
            clave.hidden = false;
            if (valor === 'conforme' && campoClave) {
                campoClave.focus();
            }
        };
        var completar = function () {
            mover(maximo());
            deslizador.classList.add('completo');
            pedirClave('conforme');
        };
        var soltar = function () {
            if (!arrastrando) {
                return;
            }
            arrastrando = false;
            deslizador.classList.remove('arrastrando');
            if (recorrido >= maximo() * 0.9) {
                completar();
                if (compacta) {
                    // Llegó al final arrastrando: el deslizador queda «listo» y el texto de abajo sigue oculto.
                    deslizador.classList.add('listo');
                    if (textoDeslizador) {
                        textoDeslizador.textContent = 'Listo, ahora tu clave';
                    }
                    if (relleno) {
                        relleno.style.width = '';
                    }
                    if (cancelar) {
                        cancelar.hidden = false;
                    }
                }
            } else {
                mover(0);
                rellenar();
                descompactar();
            }
        };

        perilla.addEventListener('pointerdown', function (evento) {
            if (deslizador.classList.contains('listo')) {
                return;
            }
            arrastrando = true;
            inicio = evento.clientX - recorrido;
            origen = evento.clientX;
            deslizador.classList.add('arrastrando');
            if (perilla.setPointerCapture) {
                perilla.setPointerCapture(evento.pointerId);
            }
        });
        perilla.addEventListener('pointermove', function (evento) {
            if (arrastrando) {
                // Un toque sin arrastre no esconde nada: hace falta moverse unos píxeles.
                if (Math.abs(evento.clientX - origen) > 3) {
                    compactar();
                }
                mover(evento.clientX - inicio);
                rellenar();
            }
        });
        perilla.addEventListener('pointerup', soltar);
        perilla.addEventListener('pointercancel', soltar);
        // Con el teclado (Enter o Espacio sobre la perilla) el navegador manda un click sin puntero: equivale a deslizar.
        perilla.addEventListener('click', function (evento) {
            if (evento.detail === 0) {
                completar();
            }
        });
        noConforme.addEventListener('click', function () {
            tipo.hidden = false;
            pedirClave('disconforme');
        });
        // Deshace el deslizamiento completo: todo como al cargar la página, con el foco en la perilla.
        if (cancelar) {
            cancelar.addEventListener('click', function () {
                deslizador.classList.remove('completo', 'listo');
                if (textoDeslizador) {
                    textoDeslizador.textContent = textoOriginal;
                }
                mover(0);
                rellenar();
                if (campoClave) {
                    campoClave.value = '';
                }
                clave.hidden = true;
                cancelar.hidden = true;
                descompactar();
                perilla.focus();
            });
        }
    }

    // Al cargar, lo que esté elegido manda (el navegador puede recordar la opción al volver atrás).
    actualizar(false);
})();
