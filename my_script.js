function actualizarContador() {
        const ahora = new Date();
        let anioActual = ahora.getFullYear();
        const navidad = new Date(anioActual, 11, 25);
        if (ahora > navidad) navidad.setFullYear(anioActual + 1);
        const diferencia = navidad - ahora;

        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

        document.getElementById("dias").textContent = dias.toString().padStart(2, '0');
        document.getElementById("horas").textContent = horas.toString().padStart(2, '0');
        document.getElementById("minutos").textContent = minutos.toString().padStart(2, '0');
        document.getElementById("segundos").textContent = segundos.toString().padStart(2, '0');
    }

    actualizarContador();
    setInterval(actualizarContador, 1000);


const canvas = document.getElementById("nieve");
const ctx = canvas.getContext("2d");

let width, height;
let copos = [];

function inicializar() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    copos = [];

    // Ajuste inteligente según tamaño de pantalla
    let cantidadCopos = width > 768 ? 180 : 80; // menos copos en celular

    for (let i = 0; i < cantidadCopos; i++) {
        let simbolo = (Math.random() < 0.8) ? "❄" : "\u2665";
        
        // Tamaño adaptativo
        let tamaño;
        if (width > 768) {
            tamaño = (simbolo === "\u2665") ? (Math.random() * 8 + 8) : (Math.random() * 20 + 20);
        } else {
            tamaño = (simbolo === "\u2665") ? (Math.random() * 6 + 6) : (Math.random() * 14 + 10);
        }

        // Movimiento lateral reducido en móvil
        let velocidadX = width > 768 ? (Math.random() * 0.5 - 0.25) : 0;

        copos.push({
            x: Math.random() * width,
            y: Math.random() * height,
            velocidadY: Math.random() * 1 + 0.5,
            velocidadX: velocidadX,
            simbolo: simbolo,
            tamaño: tamaño,
            opacidad: Math.random() * 0.5 + 0.5
        });
    }
}


function dibujarNieve() {
ctx.clearRect(0, 0, width, height);
ctx.textBaseline = "middle";
for (let i = 0; i < copos.length; i++) {
    let c = copos[i];
    ctx.font = `${c.tamaño}px Arial Unicode MS, Pacifico, sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${c.opacidad})`;
    ctx.fillText(c.simbolo, c.x, c.y + c.tamaño * 0.2);
    c.y += c.velocidadY;
    c.x += c.velocidadX;

    if (c.y > height || c.x < 0 || c.x > width) {
        c.y = 0;
        c.x = Math.random() * width;
        // nuevamente 80% nieve, 20% corazón
        c.simbolo = (Math.random() < 0.8) ? "❄" : "\u2665";
        c.tamaño = (c.simbolo === "\u2665") ? (Math.random() * 8 + 8) : (Math.random() * 20 + 20);
        c.opacidad = Math.random() * 0.5 + 0.5;
        c.velocidadX = Math.random() * 0.5 - 0.25;
    }
}
}

function animar() {
dibujarNieve();
requestAnimationFrame(animar);
}

window.addEventListener("resize", inicializar);
inicializar();
animar();




 function aplicarModoDiaNoche() {
        const ahora = new Date();
        const horaLocal = ahora.getHours(); // Hora local de navegador

        if (horaLocal >= 18 || horaLocal < 5) {
            document.body.classList.remove("day");
            document.body.classList.add("night");
        } else {
            document.body.classList.remove("night");
            document.body.classList.add("day");
        }
    }

    aplicarModoDiaNoche();