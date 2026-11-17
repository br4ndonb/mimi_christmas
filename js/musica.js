/* Música de la bola. Solo suena cuando se presiona el botón.
 *  - Si hay canciones en CANCIONES, cada vez que se enciende empieza una al azar
 *    y luego siguen una tras otra.
 *  - Si la lista está vacía o ningún archivo carga, suena la caja musical generada
 *    con Web Audio: "Noche de paz" (melodía de dominio público) en bucle.
 */
(function () {
    'use strict';

    const Bola = (window.Bola = window.Bola || {});

    /* ✏️ Pon tus canciones en la carpeta "musica" y agrégalas aquí, por ejemplo:
     *    'musica/cancion-1.mp3',
     */
    const CANCIONES = [
        'musica/01-Festive Whistle.mp3',
        'musica/02-Christmas Night Piano.mp3',
        'musica/03-Valse de Noel.mp3',
    ];
    const VOLUMEN_CANCIONES = 0.6;

    const NOTAS = {
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
    };

    // [nota, duración en corcheas] — compás de 6/8
    const MELODIA = [
        ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
        ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
        ['D5', 2], ['D5', 1], ['B4', 3],
        ['C5', 2], ['C5', 1], ['G4', 3],
        ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
        ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
        ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
        ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
        ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
        ['C5', 3], ['E5', 3],
        ['C5', 1.5], ['G4', 0.5], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
        ['C4', 6],
    ];
    const CORCHEA = 0.32;      // segundos
    const PAUSA_FINAL = 2.5;   // segundos antes de repetir

    let audio = null;
    let volumen = null;
    let sonando = false;
    let indice = 0;
    let siguienteTiempo = 0;
    let planificador = null;

    function campanita(frecuencia, cuando) {
        const env = audio.createGain();
        env.gain.setValueAtTime(0.0001, cuando);
        env.gain.exponentialRampToValueAtTime(0.5, cuando + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0008, cuando + 1.8);
        env.connect(volumen);

        // fundamental una octava arriba (sonido de caja musical) + armónico suave
        [[2, 'sine', 1], [4, 'triangle', 0.12], [6.02, 'sine', 0.05]].forEach(([mult, tipo, nivel]) => {
            const osc = audio.createOscillator();
            const g = audio.createGain();
            osc.type = tipo;
            osc.frequency.value = frecuencia * mult;
            g.gain.value = nivel;
            osc.connect(g).connect(env);
            osc.start(cuando);
            osc.stop(cuando + 1.9);
        });
    }

    function planificar() {
        while (siguienteTiempo < audio.currentTime + 0.6) {
            const [nota, dur] = MELODIA[indice];
            campanita(NOTAS[nota], siguienteTiempo);
            siguienteTiempo += dur * CORCHEA;
            indice++;
            if (indice >= MELODIA.length) {
                indice = 0;
                siguienteTiempo += PAUSA_FINAL;
            }
        }
    }

    function iniciar() {
        if (!audio) {
            const Contexto = window.AudioContext || window.webkitAudioContext;
            if (!Contexto) return false;
            audio = new Contexto();
            volumen = audio.createGain();
            volumen.gain.value = 0.16;
            volumen.connect(audio.destination);
        }
        audio.resume();
        volumen.gain.cancelScheduledValues(audio.currentTime);
        volumen.gain.setValueAtTime(0.16, audio.currentTime);
        indice = 0;
        siguienteTiempo = audio.currentTime + 0.1;
        planificar();
        planificador = setInterval(planificar, 150);
        sonando = true;
        return true;
    }

    function detener() {
        clearInterval(planificador);
        planificador = null;
        sonando = false;
        if (audio) {
            const t = audio.currentTime;
            volumen.gain.setValueAtTime(volumen.gain.value, t);
            volumen.gain.linearRampToValueAtTime(0.0001, t + 0.4);
            setTimeout(() => { if (!sonando) audio.suspend(); }, 500);
        }
    }

    /* ---------- Canciones (archivos MP3) ---------- */
    let reproductor = null;
    let pistaActual = Math.floor(Math.random() * Math.max(1, CANCIONES.length));
    let fallosSeguidos = 0;
    let usarCanciones = CANCIONES.length > 0;
    let sonandoCancion = false;

    function tocarPista() {
        reproductor.src = encodeURI(CANCIONES[pistaActual]); // los nombres tienen espacios
        reproductor.play().catch(() => { /* lo maneja el evento "error" */ });
    }

    function iniciarCanciones() {
        if (!reproductor) {
            reproductor = new Audio();
            reproductor.preload = 'auto';
            reproductor.volume = VOLUMEN_CANCIONES;
            reproductor.addEventListener('playing', () => { fallosSeguidos = 0; });
            reproductor.addEventListener('ended', () => {
                pistaActual = (pistaActual + 1) % CANCIONES.length;
                tocarPista();
            });
            reproductor.addEventListener('error', () => {
                if (!sonandoCancion) return;
                fallosSeguidos++;
                if (fallosSeguidos >= CANCIONES.length) {
                    // ningún archivo carga: pasar a la caja musical
                    usarCanciones = false;
                    sonandoCancion = false;
                    iniciar();
                    actualizarBoton();
                } else {
                    pistaActual = (pistaActual + 1) % CANCIONES.length;
                    tocarPista();
                }
            });
        }
        // cada vez que se enciende, una canción al azar (distinta a la anterior si hay varias)
        if (CANCIONES.length > 1) {
            let nueva;
            do { nueva = Math.floor(Math.random() * CANCIONES.length); } while (nueva === pistaActual);
            pistaActual = nueva;
        }
        sonandoCancion = true;
        tocarPista();
    }

    function detenerCanciones() {
        sonandoCancion = false;
        if (reproductor) reproductor.pause();
    }

    /* ---------- Botón ---------- */
    const boton = document.getElementById('btn-musica');
    const estaSonando = () => sonando || sonandoCancion;
    function actualizarBoton() { boton.setAttribute('aria-pressed', String(estaSonando())); }

    boton.addEventListener('click', () => {
        if (estaSonando()) {
            detener();
            detenerCanciones();
        } else if (usarCanciones) {
            iniciarCanciones();
        } else {
            iniciar();
        }
        actualizarBoton();
    });

    Bola.musicaSonando = estaSonando;
})();
