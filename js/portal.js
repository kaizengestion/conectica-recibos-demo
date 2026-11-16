// Portal de recibos — JavaScript mínimo y sin dependencias. La CSP (script-src 'self') no deja scripts en línea.
// Lo carga layouts/base en todas las páginas; cada comportamiento se activa solo si encuentra sus data-*.
//
// CONTRATO (fase cero del rediseño F, 2026-10-14; ver docs/superpowers/plans/2026-10-14-rediseno-f-00-indice.md §5.7).
// El cuerpo lo escribe la unidad 02 (empleado); la unidad 03 no toca este archivo.
//
//   form[data-ingreso]            Ingreso en dos pasos sobre el mismo POST de siempre (cuil + password).
//                                 El JS le suma la clase "con-js".
//     [data-paso="1"|"2"]         Contenedores de cada paso: uno visible por vez. Sin JS se ven los dos juntos.
//     [data-indicador="1"|"2"]    Marcas «Paso 1 / Paso 2»: la vigente lleva la clase "activo".
//     [data-seguir]               <button type="button"> que pasa al paso 2 con 11 dígitos (deshabilitado si no).
//     [data-volver]               <button type="button" hidden> que vuelve al paso 1.
//     data-paso-inicial="2"       En el form: arranca en el paso 2 (volvió con error y con el CUIL cargado).
//     [data-ranuras] > i          11 marcas; las cargadas llevan la clase "lleno".
//   [data-teclado="<id>"]         Teclado en pantalla; llega con hidden y el JS lo muestra. Escribe en el input #<id>.
//     [data-tecla="0".."9"|"borrar"]  <button type="button">: agrega o borra un dígito (máximo 11; los guiones los pone el JS).
//
//   Escritorio (2026-10-14; ≥1024px y puntero fino, o sea mouse): el CUIL se escribe con el teclado de la PC.
//     [data-teclado-toggle]       <button hidden aria-controls="<id del teclado o de su contenedor>">: el JS lo muestra; abre y cierra el
//                                 teclado en pantalla (clase "teclado-abierto" en el form, aria-expanded y el texto).
//     [data-seguir-bloque]        <button hidden> «Seguir · Enter»: hace lo mismo que [data-seguir].
//     [data-contador]             <span hidden> «n/11» al lado del campo.
//   En pantallas táctiles (celular, tablet, PC táctil) el teclado arranca abierto como siempre y esto no aparece.
//
//   La firma deslizante NO va acá: es de public/js/firma.js ([data-deslizador], [data-deslizador-perilla],
//   [data-firma-tipo], [data-firma-clave], [data-firma-alternativa], [data-firma-disconforme], form[data-firma-abierta]).
(function () {
    'use strict';

    function digitos(valor) {
        return String(valor || '').replace(/\D+/g, '').slice(0, 11);
    }

    // PC con mouse y pantalla ancha: el teclado en pantalla no hace falta a la vista.
    function esEscritorio() {
        return typeof window.matchMedia === 'function'
            && window.matchMedia('(min-width: 1024px)').matches
            && !window.matchMedia('(pointer: coarse)').matches;
    }

    // 27132441435 → 27-13244143-5, igual que App\Support\Cuil::formatear, a medida que se escribe.
    function formatear(d) {
        if (d.length <= 2) {
            return d;
        }
        if (d.length <= 10) {
            return d.slice(0, 2) + '-' + d.slice(2);
        }
        return d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10);
    }

    function iniciarIngreso(form) {
        var paso1 = form.querySelector('[data-paso="1"]');
        var paso2 = form.querySelector('[data-paso="2"]');
        var cuil = form.querySelector('input[name="cuil"]');
        var clave = form.querySelector('input[name="password"]');
        var seguir = form.querySelector('[data-seguir]');
        var volver = form.querySelector('[data-volver]');
        if (!paso1 || !paso2 || !cuil || !clave || !seguir || !volver) {
            return; // Falta una pieza: queda el formulario de siempre, con los dos campos juntos.
        }
        var ranuras = form.querySelectorAll('[data-ranuras] i');
        var indicadores = form.querySelectorAll('[data-indicador]');
        var bloque = form.querySelector('[data-seguir-bloque]');
        var contador = form.querySelector('[data-contador]');

        var marcar = function () {
            var cargados = digitos(cuil.value).length;
            for (var i = 0; i < ranuras.length; i++) {
                ranuras[i].classList.toggle('lleno', i < cargados);
            }
            seguir.disabled = cargados !== 11;
            if (bloque) {
                bloque.disabled = cargados !== 11;
            }
            if (contador) {
                contador.textContent = cargados + '/11';
            }
        };

        var ir = function (paso, enfocar) {
            paso1.hidden = paso !== 1;
            paso2.hidden = paso !== 2;
            volver.hidden = paso !== 2;
            for (var i = 0; i < indicadores.length; i++) {
                indicadores[i].classList.toggle('activo', indicadores[i].getAttribute('data-indicador') === String(paso));
            }
            if (enfocar) {
                (paso === 2 ? clave : cuil).focus();
            }
        };

        cuil.addEventListener('input', function () {
            cuil.value = formatear(digitos(cuil.value));
            marcar();
        });
        cuil.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                if (!seguir.disabled) {
                    ir(2, true);
                }
            }
        });
        var seguirSiCompleto = function () {
            if (digitos(cuil.value).length === 11) {
                ir(2, true);
            }
        };
        seguir.addEventListener('click', seguirSiCompleto);
        if (bloque) {
            bloque.addEventListener('click', seguirSiCompleto);
        }
        volver.addEventListener('click', function () {
            ir(1, true);
        });

        form.classList.add('con-js');
        cuil.value = formatear(digitos(cuil.value));
        marcar();
        var inicial = form.getAttribute('data-paso-inicial') === '2' ? 2 : 1;
        ir(inicial, false);
        if (esEscritorio()) {
            if (bloque) {
                bloque.hidden = false;
            }
            if (contador) {
                contador.hidden = false;
            }
            if (inicial === 1) {
                cuil.focus();
            }
        }
    }

    function iniciarTeclado(teclado) {
        var campo = document.getElementById(teclado.getAttribute('data-teclado'));
        if (!campo) {
            return;
        }
        // El botón apunta (aria-controls) al teclado o a un contenedor que lo envuelve.
        var toggle = null;
        var botones = document.querySelectorAll('[data-teclado-toggle]');
        for (var b = 0; b < botones.length; b++) {
            var controlado = document.getElementById(botones[b].getAttribute('aria-controls'));
            if (controlado && controlado.contains(teclado)) {
                toggle = botones[b];
            }
        }
        if (toggle && esEscritorio()) {
            // En PC queda cerrado; se abre y se cierra con el botón.
            var form = teclado.closest('form') || teclado.parentNode;
            var texto = toggle.querySelector('[data-teclado-texto]');
            var nota = toggle.querySelector('[data-teclado-nota]');
            var abrir = function (si) {
                teclado.hidden = !si;
                form.classList.toggle('teclado-abierto', si);
                toggle.setAttribute('aria-expanded', si ? 'true' : 'false');
                if (texto) {
                    texto.textContent = si ? 'Ocultar teclado' : 'Usar teclado en pantalla';
                }
                if (nota) {
                    nota.textContent = si ? 'Tocá los números o seguí con la PC' : 'Para pantallas táctiles';
                }
            };
            toggle.hidden = false;
            toggle.addEventListener('click', function () {
                abrir(teclado.hidden);
            });
            abrir(false);
        } else {
            teclado.hidden = false;
        }
        teclado.addEventListener('click', function (evento) {
            var tecla = evento.target.closest('[data-tecla]');
            if (!tecla || !teclado.contains(tecla)) {
                return;
            }
            var valor = tecla.getAttribute('data-tecla');
            var actual = digitos(campo.value);
            campo.value = valor === 'borrar' ? actual.slice(0, -1) : (actual + valor).slice(0, 11);
            // Avisa como si se hubiera tipeado: el ingreso formatea con guiones y actualiza las ranuras.
            campo.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    var formularios = document.querySelectorAll('form[data-ingreso]');
    for (var i = 0; i < formularios.length; i++) {
        iniciarIngreso(formularios[i]);
    }
    var teclados = document.querySelectorAll('[data-teclado]');
    for (var j = 0; j < teclados.length; j++) {
        iniciarTeclado(teclados[j]);
    }
})();
