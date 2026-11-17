/* Interior de la bola de cristal: escena + nieve con física.
 * Expone en window.Bola:
 *   Bola.agitar(fuerza, dirX, dirY)  -> lanza la nieve en remolino
 *   Bola.setDorado(bool)             -> nieve dorada (día de Navidad)
 *   Bola.redibujarEscena()           -> repinta la escena (cambio día/noche)
 */
(function () {
    'use strict';

    const Bola = (window.Bola = window.Bola || {});
    const canvas = document.getElementById('lienzo');
    const ctx = canvas.getContext('2d');
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ANCHO_CUBETA = 6;      // ancho de cada "columna" de nieve acumulada
    const PILA_MAX = 34;         // altura máxima de la nieve acumulada
    const GRAVEDAD = 0.034;
    const ARRASTRE = 0.965;      // la nieve cae lento, como en agua

    let W = 0, H = 0, dpr = 1;
    let sueloBase = 0, alturaColina = 0;
    let particulas = [];
    let pila = [];
    let turbulencia = 0;
    let tiempo = 0;
    let dorado = false;
    let escena = null;           // canvas fuera de pantalla con la escena estática
    let luces = [];              // luces del árbol (se dibujan cada frame)
    let estrellaArbol = null;
    let ventana = null;

    const COLORES_LUCES = ['#ff6b8b', '#ffd36b', '#7fd6ff', '#b8ff9e', '#ffffff'];

    /* ---------- Sprites pre-renderizados (rendimiento) ---------- */
    const sprites = {};

    function crearSprite(tam, dibujar) {
        const c = document.createElement('canvas');
        c.width = c.height = tam;
        dibujar(c.getContext('2d'), tam);
        return c;
    }

    function spritePunto(color) {
        return crearSprite(64, (g, s) => {
            const r = s / 2;
            const grad = g.createRadialGradient(r, r, 0, r, r, r);
            grad.addColorStop(0, color(1));
            grad.addColorStop(0.4, color(0.85));
            grad.addColorStop(1, color(0));
            g.fillStyle = grad;
            g.fillRect(0, 0, s, s);
        });
    }

    function spriteCorazon(color) {
        return crearSprite(64, (g, s) => {
            const k = s * 0.36;
            g.translate(s / 2, s / 2 - k * 0.2);
            g.beginPath();
            g.moveTo(0, -k * 0.35);
            g.bezierCurveTo(k * 0.9, -k * 1.1, k * 1.25, k * 0.2, 0, k * 0.95);
            g.bezierCurveTo(-k * 1.25, k * 0.2, -k * 0.9, -k * 1.1, 0, -k * 0.35);
            g.closePath();
            g.shadowColor = color;
            g.shadowBlur = s * 0.12;
            g.fillStyle = color;
            g.fill();
        });
    }

    function prepararSprites() {
        sprites.punto = spritePunto(a => `rgba(255,255,255,${a})`);
        sprites.puntoDorado = spritePunto(a => `rgba(255,214,120,${a})`);
        sprites.cristal = crearSprite(96, (g, s) => {
            g.translate(s / 2, s / 2);
            g.strokeStyle = '#ffffff';
            g.lineCap = 'round';
            g.lineWidth = s * 0.045;
            g.shadowColor = 'rgba(110, 140, 220, 0.9)';
            g.shadowBlur = 5;
            const L = s * 0.38;
            for (let i = 0; i < 6; i++) {
                g.beginPath();
                g.moveTo(0, 0);
                g.lineTo(0, -L);
                g.moveTo(0, -L * 0.55);
                g.lineTo(L * 0.22, -L * 0.78);
                g.moveTo(0, -L * 0.55);
                g.lineTo(-L * 0.22, -L * 0.78);
                g.stroke();
                g.rotate(Math.PI / 3);
            }
        });
        sprites.corazon = spriteCorazon('#ff8fb1');
        sprites.corazonDorado = spriteCorazon('#ffd36b');
        sprites.luces = {};
        COLORES_LUCES.forEach(c => {
            sprites.luces[c] = crearSprite(48, (g, s) => {
                const r = s / 2;
                const grad = g.createRadialGradient(r, r, 0, r, r, r);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.18, c);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = grad;
                g.fillRect(0, 0, s, s);
            });
        });
    }

    /* ---------- Suelo ---------- */
    function sueloY(x) {
        const t = (x / W - 0.5) * Math.PI;
        return sueloBase - alturaColina * (0.35 + 0.65 * Math.cos(t));
    }

    /* ---------- Escena estática ---------- */
    function arbol(g, x, yBase, alto, color, nieve) {
        const ancho = alto * 0.55;
        g.fillStyle = '#4a2c1a';
        g.fillRect(x - alto * 0.04, yBase - alto * 0.12, alto * 0.08, alto * 0.14);
        const pisos = 3;
        for (let i = 0; i < pisos; i++) {
            const t = i / pisos;
            const base = yBase - alto * 0.1 - t * alto * 0.28;
            const a = ancho * (1 - t * 0.28);
            const punta = base - alto * 0.48;
            g.fillStyle = color;
            g.beginPath();
            g.moveTo(x, punta);
            g.lineTo(x + a / 2, base);
            g.lineTo(x - a / 2, base);
            g.closePath();
            g.fill();
            if (nieve) {
                g.fillStyle = nieve;
                g.beginPath();
                g.moveTo(x, punta);
                g.lineTo(x + a * 0.2, punta + alto * 0.19);
                g.quadraticCurveTo(x, punta + alto * 0.24, x - a * 0.2, punta + alto * 0.19);
                g.closePath();
                g.fill();
            }
        }
        return { ancho, puntaY: yBase - alto * 0.1 - ((pisos - 1) / pisos) * alto * 0.28 - alto * 0.48 };
    }

    function casa(g, x, yBase, tam, noche) {
        const w = tam, h = tam * 0.7;
        g.fillStyle = noche ? '#6b4a5e' : '#b56a6a';
        g.fillRect(x - w / 2, yBase - h, w, h);
        // techo con nieve
        g.fillStyle = noche ? '#e6ecff' : '#ffffff';
        g.beginPath();
        g.moveTo(x - w * 0.62, yBase - h + 2);
        g.lineTo(x, yBase - h - tam * 0.5);
        g.lineTo(x + w * 0.62, yBase - h + 2);
        g.closePath();
        g.fill();
        // chimenea
        g.fillStyle = noche ? '#5a3c4e' : '#9a5656';
        g.fillRect(x + w * 0.18, yBase - h - tam * 0.42, tam * 0.12, tam * 0.22);
        // puerta y ventana
        g.fillStyle = '#4a2c1a';
        g.fillRect(x - w * 0.32, yBase - h * 0.55, w * 0.2, h * 0.55);
        ventana = { x: x + w * 0.18, y: yBase - h * 0.55, w: w * 0.22, h: w * 0.2 };
        g.fillStyle = '#ffd77a';
        g.fillRect(ventana.x - ventana.w / 2, ventana.y - ventana.h / 2, ventana.w, ventana.h);
    }

    function dibujarEscena() {
        const noche = document.body.classList.contains('noche');
        escena = document.createElement('canvas');
        escena.width = Math.round(W * dpr);
        escena.height = Math.round(H * dpr);
        const g = escena.getContext('2d');
        g.scale(dpr, dpr);

        // Colinas lejanas
        const lejos = sueloBase - alturaColina * 1.25;
        g.fillStyle = noche ? 'rgba(160, 180, 240, 0.22)' : 'rgba(255, 255, 255, 0.32)';
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W + 10; x += 10) {
            g.lineTo(x, lejos - Math.sin(x * 0.004 + 1.2) * alturaColina * 0.35 - Math.sin(x * 0.011) * alturaColina * 0.12);
        }
        g.lineTo(W, H);
        g.closePath();
        g.fill();

        // Pinos lejanos (difuminados)
        const colorLejano = noche ? 'rgba(70, 90, 150, 0.55)' : 'rgba(120, 110, 170, 0.35)';
        for (let i = 0; i < 14; i++) {
            const x = (i + 0.5) * (W / 14) + Math.sin(i * 7.3) * 14;
            const y = lejos - Math.sin(x * 0.004 + 1.2) * alturaColina * 0.35 - Math.sin(x * 0.011) * alturaColina * 0.12 + 4;
            arbol(g, x, y, alturaColina * (0.55 + (i % 3) * 0.15), colorLejano, null);
        }

        // Suelo principal
        const grad = g.createLinearGradient(0, sueloBase - alturaColina, 0, H);
        grad.addColorStop(0, noche ? '#e3ebff' : '#ffffff');
        grad.addColorStop(1, noche ? '#8fa2d8' : '#d8e1f5');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W + 6; x += 6) g.lineTo(x, sueloY(x));
        g.lineTo(W, H);
        g.closePath();
        g.fill();

        const nieveArbol = noche ? '#e6ecff' : '#ffffff';
        const verde = noche ? '#1f4a43' : '#2f6b4f';
        const verdeOscuro = noche ? '#183a35' : '#255a42';
        const esc = Math.min(1, W / 700);

        // Segunda fila de pinos (un poco más atrás y oscuros)
        const verdeFondo = noche ? '#16332f' : '#3d7a5c';
        [0.03, 0.12, 0.21, 0.35, 0.45, 0.55, 0.64, 0.83, 0.94].forEach((p, i) => {
            const x = W * p;
            const alto = alturaColina * (0.55 + ((i * 7) % 5) * 0.09) * (p > 0.33 && p < 0.67 ? 0.8 : 1);
            arbol(g, x, sueloY(x) + 2, alto, verdeFondo, nieveArbol);
        });

        // Casita (rodeada de arbolitos)
        const xCasa = W * 0.27;
        const tamCasa = Math.max(52, alturaColina * 0.98) * (0.72 + 0.28 * esc);
        casa(g, xCasa, sueloY(xCasa) + 6, tamCasa, noche);

        // Pinos de la primera fila
        const pinos = [
            [0.05, 1.15], [0.13, 0.85], [0.19, 0.6], [0.36, 0.62], [0.41, 0.48],
            [0.58, 0.5], [0.63, 0.7], [0.86, 0.95], [0.92, 1.25], [0.985, 0.8],
        ];
        pinos.forEach(([p, tam], i) => {
            const x = W * p;
            const alto = alturaColina * tam;
            // en pantallas angostas, no tapar la casita
            if (Math.abs(x - xCasa) < tamCasa * 0.62 + alto * 0.2) return;
            arbol(g, x, sueloY(x) + 7, alto, i % 2 ? verdeOscuro : verde, nieveArbol);
        });

        // Árbol de Navidad principal
        const xArbol = W * (W < 600 ? 0.74 : 0.72);
        const yArbol = sueloY(xArbol) + 8;
        const altoArbol = Math.min(H * 0.24, alturaColina * 2.3);
        const info = arbol(g, xArbol, yArbol, altoArbol, verde, nieveArbol);

        // Luces del árbol (posiciones)
        luces = [];
        const filas = 5;
        for (let f = 0; f < filas; f++) {
            const t = (f + 0.6) / (filas + 0.4);
            const y = info.puntaY + t * (yArbol - altoArbol * 0.1 - info.puntaY);
            const mitad = info.ancho * 0.42 * t;
            const n = 2 + f;
            for (let k = 0; k < n; k++) {
                const u = n === 1 ? 0.5 : k / (n - 1);
                luces.push({
                    x: xArbol - mitad + u * mitad * 2 + Math.sin(f * 3 + k) * 2,
                    y: y + Math.sin(u * Math.PI) * 6,
                    color: COLORES_LUCES[(f + k) % COLORES_LUCES.length],
                    fase: Math.random() * Math.PI * 2,
                    tam: 9 + altoArbol * 0.03,
                });
            }
        }
        estrellaArbol = { x: xArbol, y: info.puntaY - 2, tam: altoArbol * 0.09 };
    }

    function estrella(g, x, y, r) {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const rr = i % 2 ? r * 0.45 : r;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
    }

    function dibujarLuces() {
        const noche = document.body.classList.contains('noche');
        ctx.globalAlpha = 1;
        // ventana cálida
        if (ventana) {
            const brillo = noche ? 0.75 : 0.35;
            const s = sprites.luces['#ffd36b'];
            const tam = ventana.w * 3.2;
            ctx.globalAlpha = brillo + Math.sin(tiempo * 0.03) * 0.05;
            ctx.drawImage(s, ventana.x - tam / 2, ventana.y - tam / 2, tam, tam);
        }
        for (const l of luces) {
            ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tiempo * 0.05 + l.fase));
            ctx.drawImage(sprites.luces[l.color], l.x - l.tam / 2, l.y - l.tam / 2, l.tam, l.tam);
        }
        if (estrellaArbol) {
            const e = estrellaArbol;
            const pulso = 1 + Math.sin(tiempo * 0.04) * 0.08;
            ctx.globalAlpha = 0.8;
            const halo = e.tam * 4 * pulso;
            ctx.drawImage(sprites.luces['#ffd36b'], e.x - halo / 2, e.y - halo / 2, halo, halo);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffe08a';
            estrella(ctx, e.x, e.y, e.tam * pulso);
        }
        ctx.globalAlpha = 1;
    }

    /* ---------- Partículas ---------- */
    function nuevaParticula() {
        const z = 0.25 + 0.75 * Math.pow(Math.random(), 1.4); // profundidad: 0.25 lejos, 1 cerca
        const r = Math.random();
        const tipo = r < 0.1 ? 'corazon' : (z > 0.72 && r < 0.38 ? 'cristal' : 'punto');
        const tam = tipo === 'corazon' ? 9 + z * 11 : tipo === 'cristal' ? 10 + z * 14 : 2 + z * 5;
        return {
            x: Math.random() * W,
            y: Math.random() * H * 0.85,
            vx: 0, vy: 0,
            z, tipo, tam,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.02,
            semilla: Math.random() * 1000,
            ambiente: Math.random() < 0.12,   // estas nunca se asientan: siempre cae algo
            quieta: false,
            alfa: 0.55 + 0.45 * z,
            doradoCorazon: Math.random() < 0.5,
        };
    }

    function asentar(p) {
        const i = Math.max(0, Math.min(pila.length - 1, Math.floor(p.x / ANCHO_CUBETA)));
        p.quieta = true;
        p.vx = p.vy = 0;
        p.y = sueloY(p.x) - pila[i] - p.tam * 0.15;
        pila[i] = Math.min(PILA_MAX, pila[i] + (p.tipo === 'punto' ? p.tam * 0.18 : p.tam * 0.08));
    }

    function reaparecer(p) {
        p.x = Math.random() * W;
        p.y = -20 - Math.random() * 40;
        p.vx = 0;
        p.vy = 0;
    }

    function cantidadParticulas() {
        let n = Math.round((W * H) / 2600);
        n = Math.max(180, Math.min(520, n));
        return reducirMovimiento ? Math.round(n * 0.5) : n;
    }

    function crearParticulas(enReposo) {
        pila = new Array(Math.ceil(W / ANCHO_CUBETA) + 1).fill(0);
        particulas = [];
        const n = cantidadParticulas();
        for (let i = 0; i < n; i++) {
            const p = nuevaParticula();
            if (enReposo && !p.ambiente) asentar(p);
            particulas.push(p);
        }
        // las más lejanas primero, para dibujar en orden de profundidad
        particulas.sort((a, b) => a.z - b.z);
    }

    Bola.agitar = function (fuerza = 1, dirX = 0, dirY = 0) {
        if (!W) return;
        if (reducirMovimiento) fuerza *= 0.5;
        turbulencia = Math.min(1.6, turbulencia + fuerza);
        pila.fill(0);
        for (const p of particulas) {
            const empuje = 0.6 + p.z * 0.5;
            if (p.quieta) {
                p.quieta = false;
                // alcance deseado en px -> velocidad inicial (con arrastre, distancia ≈ v / (1 - ARRASTRE))
                const alcance = H * (0.3 + Math.random() * 0.6) * Math.min(1, fuerza);
                p.vy = -alcance * (1 - ARRASTRE) * empuje;
                p.vx = (Math.random() - 0.5) * 5 * fuerza + dirX * 3 * fuerza;
            } else {
                p.vx += (Math.random() - 0.5) * 4 * fuerza + dirX * 3 * fuerza;
                p.vy += (Math.random() - 0.5) * 4 * fuerza + dirY * 3 * fuerza - fuerza;
            }
        }
    };

    /* ---------- Estrellas fugaces ---------- */
    let fugaces = [];

    Bola.estrellaFugaz = function () {
        if (!W || reducirMovimiento || fugaces.length >= 2) return;
        const haciaIzquierda = Math.random() < 0.5;
        const angulo = (18 + Math.random() * 17) * Math.PI / 180;
        const rapidez = Math.max(9, W * 0.009) * (0.85 + Math.random() * 0.4);
        fugaces.push({
            x: haciaIzquierda ? W * (0.45 + Math.random() * 0.55) : W * Math.random() * 0.55,
            y: H * (0.03 + Math.random() * 0.22),
            vx: Math.cos(angulo) * rapidez * (haciaIzquierda ? -1 : 1),
            vy: Math.sin(angulo) * rapidez,
            largo: Math.min(240, 110 + W * 0.08),
            vida: 0,
            duracion: 55 + Math.random() * 25,
        });
    };

    function actualizarFugaces(dt) {
        for (const f of fugaces) {
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vida += dt;
        }
        fugaces = fugaces.filter(f => f.vida < f.duracion);
    }

    function dibujarFugaces() {
        if (!fugaces.length) return;
        const noche = document.body.classList.contains('noche');
        ctx.lineCap = 'round';
        for (const f of fugaces) {
            const t = f.vida / f.duracion;
            const alfa = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (noche ? 1 : 0.85);
            const rapidez = Math.hypot(f.vx, f.vy);
            const colaX = f.x - (f.vx / rapidez) * f.largo;
            const colaY = f.y - (f.vy / rapidez) * f.largo;
            const grad = ctx.createLinearGradient(colaX, colaY, f.x, f.y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.7, `rgba(255,240,210,${alfa * 0.45})`);
            grad.addColorStop(1, `rgba(255,255,255,${alfa})`);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(colaX, colaY);
            ctx.lineTo(f.x, f.y);
            ctx.stroke();
            ctx.globalAlpha = alfa;
            const halo = 22;
            ctx.drawImage(sprites.luces['#ffffff'], f.x - halo / 2, f.y - halo / 2, halo, halo);
        }
        ctx.globalAlpha = 1;
    }

    Bola.setDorado = function (valor) { dorado = !!valor; };
    Bola.redibujarEscena = function () { if (W) dibujarEscena(); };

    function actualizar(dt) {
        tiempo += dt;
        turbulencia *= Math.pow(0.988, dt);
        const arrastre = Math.pow(ARRASTRE, dt);
        const remolino = reducirMovimiento ? 0 : turbulencia;
        actualizarFugaces(dt);

        for (const p of particulas) {
            if (p.quieta) continue;
            const peso = (0.5 + p.z * 0.7) * (p.tipo === 'corazon' ? 0.8 : 1);
            p.vy += GRAVEDAD * peso * dt;

            const ruido = Math.sin(p.y * 0.012 + tiempo * 0.02 + p.semilla)
                + Math.sin(p.x * 0.008 - tiempo * 0.013 + p.semilla * 2) * 0.5;
            p.vx += ruido * (0.012 + remolino * 0.16) * dt;
            p.vy += Math.cos(p.x * 0.01 + tiempo * 0.017 + p.semilla) * remolino * 0.1 * dt;

            p.vx *= arrastre;
            p.vy *= arrastre;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += (p.vr + p.vx * 0.01) * dt;

            // paredes del vidrio
            if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.5; }
            else if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx) * 0.5; }
            if (p.y < -60) { p.y = -60; p.vy = Math.abs(p.vy) * 0.3; }

            // suelo
            const suelo = sueloY(p.x) - p.tam * 0.15;
            if (p.y >= suelo) {
                if (p.ambiente) reaparecer(p);
                else if (turbulencia < 0.35) asentar(p);
                else { p.y = suelo; p.vy = -Math.abs(p.vy) * 0.4; }
            }
        }
    }

    function dibujarParticula(p) {
        let sprite;
        let tam = p.tam;
        if (p.tipo === 'punto') {
            sprite = dorado ? sprites.puntoDorado : sprites.punto;
            tam *= 2.2; // el sprite tiene borde difuso
        } else if (p.tipo === 'cristal') {
            sprite = dorado ? sprites.puntoDorado : sprites.cristal;
            if (dorado) tam *= 0.9;
        } else {
            sprite = dorado && p.doradoCorazon ? sprites.corazonDorado : sprites.corazon;
        }
        ctx.globalAlpha = p.alfa;
        if (p.tipo === 'punto') {
            ctx.drawImage(sprite, p.x - tam / 2, p.y - tam / 2, tam, tam);
        } else {
            const ang = p.tipo === 'corazon' ? Math.sin(p.rot) * 0.4 : p.rot;
            ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
            ctx.rotate(ang);
            ctx.drawImage(sprite, -tam / 2, -tam / 2, tam, tam);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    function dibujar() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // 0) estrellas fugaces en el cielo del fondo
        dibujarFugaces();

        // 1) nieve lejana que cae (detrás de la escena)
        for (const p of particulas) {
            if (!p.quieta && p.z <= 0.7) dibujarParticula(p);
        }
        // 2) escena
        ctx.globalAlpha = 1;
        if (escena) ctx.drawImage(escena, 0, 0, W, H);
        dibujarLuces();
        // 3) nieve asentada y nieve cercana (delante)
        for (const p of particulas) {
            if (p.quieta || p.z > 0.7) dibujarParticula(p);
        }
        ctx.globalAlpha = 1;
    }

    /* ---------- Ciclo ---------- */
    let ultimo = performance.now();
    function animar(ahora) {
        const dt = Math.min((ahora - ultimo) / 16.667, 3);
        ultimo = ahora;
        actualizar(dt);
        dibujar();
        requestAnimationFrame(animar);
    }

    let anchoPrevio = 0, altoPrevio = 0;
    function inicializar(forzar) {
        const nuevoW = window.innerWidth;
        const nuevoH = window.innerHeight;
        // en celulares la barra del navegador cambia el alto: ignorar cambios pequeños
        if (!forzar && nuevoW === anchoPrevio && Math.abs(nuevoH - altoPrevio) < 120) return;
        anchoPrevio = W = nuevoW;
        altoPrevio = H = nuevoH;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);

        const base = document.querySelector('.base');
        const altoBase = base ? base.offsetHeight : 80;
        sueloBase = H - altoBase + 10;
        alturaColina = Math.max(48, Math.min(120, H * 0.1));

        dibujarEscena();
        crearParticulas(true);
    }

    let temporizador;
    window.addEventListener('resize', () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => inicializar(false), 150);
    });

    prepararSprites();
    inicializar(true);
    requestAnimationFrame(animar);
})();
