/* Formas de agitar la bola:
 *  - Agitando el celular (sensor de movimiento; en iPhone pide permiso con un botón)
 *  - Arrastrando el mouse o el dedo rápido por la pantalla
 *  - Tocando/clic simple (agitado suave)
 *  - Botón "Agitar" o tecla espacio
 * Llama a Bola.alAgitar(conteo) en cada agitada "nueva" (con pausa entre ellas).
 */
(function () {
    'use strict';

    const Bola = window.Bola;
    const mundo = document.getElementById('mundo');
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ultimaAgitada = 0;
    let conteo = 0;

    function sacudirMundo() {
        if (reducirMovimiento) return;
        mundo.classList.remove('agitando');
        void mundo.offsetWidth; // reinicia la animación CSS
        mundo.classList.add('agitando');
    }

    function agitar(fuerza, dirX, dirY) {
        Bola.agitar(fuerza, dirX, dirY);
        const ahora = performance.now();
        if (ahora - ultimaAgitada > 900) {
            if (fuerza >= 0.6) {
                sacudirMundo();
                if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) { /* sin vibración */ } }
            }
            conteo++;
            if (typeof Bola.alAgitar === 'function') Bola.alAgitar(conteo, fuerza);
        }
        ultimaAgitada = ahora;
    }
    Bola.agitarConEfectos = agitar;

    /* ---------- Sensor de movimiento ---------- */
    let ultimaLectura = null;
    let ultimoMovimiento = 0;

    function alMoverse(e) {
        const a = e.accelerationIncludingGravity;
        if (!a || a.x == null) return;
        if (ultimaLectura) {
            const dx = a.x - ultimaLectura.x;
            const dy = a.y - ultimaLectura.y;
            const dz = a.z - ultimaLectura.z;
            const d = Math.hypot(dx, dy, dz);
            const ahora = performance.now();
            if (d > 14 && ahora - ultimoMovimiento > 120) {
                ultimoMovimiento = ahora;
                agitar(Math.min(1.4, d / 28), -dx / d, dy / d);
            }
        }
        ultimaLectura = { x: a.x, y: a.y, z: a.z };
    }

    const esTactil = window.matchMedia('(pointer: coarse)').matches;
    const necesitaPermiso = typeof DeviceMotionEvent !== 'undefined'
        && typeof DeviceMotionEvent.requestPermission === 'function';

    Bola.sensorDisponible = esTactil && 'DeviceMotionEvent' in window;

    if (Bola.sensorDisponible) {
        if (necesitaPermiso) {
            // iPhone / iPad: el permiso solo se puede pedir con un toque
            const boton = document.getElementById('permiso');
            boton.hidden = false;
            boton.addEventListener('click', () => {
                DeviceMotionEvent.requestPermission()
                    .then(estado => {
                        if (estado === 'granted') window.addEventListener('devicemotion', alMoverse);
                    })
                    .catch(() => { /* sin permiso: queda el arrastre y el botón */ })
                    .finally(() => { boton.hidden = true; });
                agitar(1.1, 0, -1);
            });
        } else {
            window.addEventListener('devicemotion', alMoverse);
        }
    }

    /* ---------- Arrastre con mouse / dedo ---------- */
    let arrastrando = false;
    let seMovio = false;
    let px = 0, py = 0, pt = 0, ultimoArrastre = 0;

    document.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        arrastrando = true;
        seMovio = false;
        px = e.clientX;
        py = e.clientY;
        pt = performance.now();
    });

    document.addEventListener('pointermove', e => {
        if (!arrastrando) return;
        const ahora = performance.now();
        const dt = Math.max(ahora - pt, 8);
        const vx = (e.clientX - px) / dt; // px por ms
        const vy = (e.clientY - py) / dt;
        const rapidez = Math.hypot(vx, vy);
        if (Math.hypot(e.clientX - px, e.clientY - py) > 6) seMovio = true;
        if (rapidez > 0.6 && ahora - ultimoArrastre > 60) {
            ultimoArrastre = ahora;
            agitar(Math.min(1.2, rapidez * 0.35), vx / rapidez, vy / rapidez);
        }
        px = e.clientX;
        py = e.clientY;
        pt = ahora;
    });

    function soltar() {
        if (arrastrando && !seMovio) agitar(0.35, 0, -1); // toque simple: agitado suave
        arrastrando = false;
    }
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', () => { arrastrando = false; });

    /* ---------- Botón y teclado ---------- */
    document.getElementById('btn-agitar').addEventListener('click', () => {
        agitar(1.1, Math.random() - 0.5, -1);
    });

    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && !e.target.closest('button')) {
            e.preventDefault();
            agitar(1, Math.random() - 0.5, -1);
        }
    });
})();
