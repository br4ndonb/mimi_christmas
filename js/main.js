/* Une todas las piezas: día/noche, estrellas, pista, estrellas fugaces y modo Navidad. */
(function () {
    'use strict';

    const Bola = window.Bola;

    const saludo = document.getElementById('saludo');
    const titulo = document.getElementById('titulo');
    const pista = document.getElementById('pista');

    /* ---------- Día / noche ---------- */
    function aplicarDiaNoche() {
        const hora = new Date().getHours();
        const noche = hora >= 18 || hora < 6;
        const antes = document.body.classList.contains('noche');
        document.body.classList.toggle('noche', noche);
        document.body.classList.toggle('dia', !noche);
        if (antes !== noche) Bola.redibujarEscena();
    }

    /* ---------- Estrellas ---------- */
    function crearEstrellas() {
        const cont = document.getElementById('estrellas');
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 70; i++) {
            const e = document.createElement('span');
            e.className = 'estrella';
            e.style.left = Math.random() * 100 + '%';
            e.style.top = Math.random() * 100 + '%';
            e.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
            e.style.animationDuration = (2 + Math.random() * 3).toFixed(2) + 's';
            if (Math.random() < 0.15) { e.style.width = e.style.height = '3px'; }
            frag.appendChild(e);
        }
        cont.appendChild(frag);
    }

    /* ---------- Pista ---------- */
    pista.textContent = Bola.sensorDisponible
        ? 'Agita tu celular o desliza el dedo para mover la nieve ❄'
        : 'Arrastra el mouse o presiona Agitar para mover la nieve ❄';

    let pistaOculta = false;
    function ocultarPista() {
        if (pistaOculta) return;
        pistaOculta = true;
        setTimeout(() => pista.classList.add('oculta'), 2500);
    }

    /* ---------- Estrellas fugaces ---------- */
    let ultimaFugaz = 0;
    function lanzarFugaz() {
        ultimaFugaz = Date.now();
        Bola.estrellaFugaz();
    }
    // de vez en cuando, sola (cada 8 a 18 segundos)
    (function programarFugaz() {
        setTimeout(() => {
            if (!document.hidden && Date.now() - ultimaFugaz > 4000) lanzarFugaz();
            programarFugaz();
        }, 8000 + Math.random() * 10000);
    })();

    let agitadaAutomatica = false;
    Bola.alAgitar = function () {
        // al agitar, a veces cruza una estrella fugaz
        if (Date.now() - ultimaFugaz > 3000 && Math.random() < 0.6) {
            setTimeout(lanzarFugaz, 300 + Math.random() * 500);
            ultimaFugaz = Date.now();
        }
        if (agitadaAutomatica) return; // las automáticas no ocultan la pista
        ocultarPista();
    };

    function agitarSola(fuerza) {
        agitadaAutomatica = true;
        Bola.agitarConEfectos(fuerza, Math.random() - 0.5, -1);
        agitadaAutomatica = false;
    }

    /* ---------- Día de Navidad ---------- */
    let intervaloNavidad = null;
    Bola.alCambiarNavidad = function (esNavidad) {
        document.body.classList.toggle('es-navidad', esNavidad);
        Bola.setDorado(esNavidad);
        clearInterval(intervaloNavidad);
        if (esNavidad) {
            saludo.textContent = '¡Feliz Navidad, Mimi!';
            titulo.textContent = 'Hoy es el día 🎄✨';
            agitarSola(1.3);
            intervaloNavidad = setInterval(() => agitarSola(0.8), 14000);
        } else {
            saludo.textContent = 'Hola Mimi';
            titulo.textContent = 'La cuenta regresiva para Navidad 🎄';
        }
    };

    /* ---------- Inicio ---------- */
    crearEstrellas();
    aplicarDiaNoche();
    setInterval(aplicarDiaNoche, 60 * 1000);
    Bola.iniciarContador();

    // al abrir, la bola se agita sola una vez para que se vea la nieve
    setTimeout(() => agitarSola(1.1), 700);
})();
