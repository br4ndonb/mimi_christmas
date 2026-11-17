/* Cuenta regresiva para Navidad.
 * - Cuenta hasta el 25 de diciembre a las 00:00 (hora local).
 * - Durante todo el 25 muestra el modo "¡Feliz Navidad!".
 * - Desde el 26 cuenta hacia la Navidad del año siguiente.
 * Para probar el modo Navidad: abrir la página con ?navidad
 */
(function () {
    'use strict';

    const Bola = (window.Bola = window.Bola || {});
    const simularNavidad = new URLSearchParams(window.location.search).has('navidad');

    const elementos = {
        dias: document.getElementById('dias'),
        horas: document.getElementById('horas'),
        minutos: document.getElementById('minutos'),
        segundos: document.getElementById('segundos'),
    };
    const valores = {};

    function esNavidad(ahora) {
        return simularNavidad || (ahora.getMonth() === 11 && ahora.getDate() === 25);
    }

    function proximaNavidad(ahora) {
        const anio = ahora.getFullYear();
        const navidad = new Date(anio, 11, 25);
        return ahora < navidad ? navidad : new Date(anio + 1, 11, 25);
    }

    function poner(clave, valor) {
        if (valores[clave] === valor) return;
        valores[clave] = valor;
        const el = elementos[clave];
        el.textContent = String(valor).padStart(2, '0');
        el.classList.remove('cambia');
        void el.offsetWidth;
        el.classList.add('cambia');
    }

    let enModoNavidad = false;

    function actualizar() {
        const ahora = new Date();
        const navidadHoy = esNavidad(ahora);

        if (navidadHoy !== enModoNavidad) {
            enModoNavidad = navidadHoy;
            if (typeof Bola.alCambiarNavidad === 'function') Bola.alCambiarNavidad(navidadHoy);
        }
        if (navidadHoy) return;

        const diferencia = Math.max(0, proximaNavidad(ahora) - ahora);
        const s = Math.floor(diferencia / 1000);
        poner('dias', Math.floor(s / 86400));
        poner('horas', Math.floor((s % 86400) / 3600));
        poner('minutos', Math.floor((s % 3600) / 60));
        poner('segundos', s % 60);
    }

    Bola.iniciarContador = function () {
        actualizar();
        // se alinea al cambio de segundo para que no "salte"
        setTimeout(() => {
            actualizar();
            setInterval(actualizar, 1000);
        }, 1000 - (Date.now() % 1000));
    };
})();
