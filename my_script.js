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

    let cantidadCopos = width > 768 ? 150 : 80;

    for (let i = 0; i < cantidadCopos; i++) {
        let tipo = (Math.random() < 0.8) ? "copo" : "corazon";
        let tamaño = tipo === "corazon" ? (Math.random() * 4 + 8) : (Math.random() * 18 + 12);
        let velocidadX = width > 768 ? (Math.random() * 0.3 - 0.15) : 0;

        copos.push({
            x: Math.random() * width,
            y: Math.random() * height,
            velocidadY: Math.random() * 1 + 0.5,
            velocidadX: velocidadX,
            tipo: tipo,
            tamaño: tamaño,
            opacidad: Math.random() * 0.5 + 0.5
        });
    }
}


function dibujarCorazon(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.bezierCurveTo(size * 0.5, -size * 0.5, size * 0.6, size * 0.3, 0, size * 0.7);
    ctx.bezierCurveTo(-size * 0.6, size * 0.3, -size * 0.5, -size * 0.5, 0, -size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function dibujarCopo(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "white";

    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, size * 0.4);
        ctx.lineTo(size * 0.15, size * 0.55);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, size * 0.4);
        ctx.lineTo(-size * 0.15, size * 0.55);
        ctx.stroke();

        ctx.rotate(Math.PI / 3);
    }
    ctx.restore();
}



    function dibujarNieve() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < copos.length; i++) {
            let c = copos[i];
            ctx.globalAlpha = c.opacidad;
            ctx.fillStyle = ctx.strokeStyle = "white";

            if (c.tipo === "corazon") {
                dibujarCorazon(c.x, c.y, c.tamaño);
            } else {
                dibujarCopo(c.x, c.y, c.tamaño/2);
            }

            c.y += c.velocidadY;
            c.x += c.velocidadX;

            if (c.y > height || c.x < 0 || c.x > width) {
                c.y = 0;
                c.x = Math.random() * width;
                c.tipo = (Math.random() < 0.8) ? "copo" : "corazon";
                c.tamaño = c.tipo === "corazon" ? (Math.random() * 8 + 8) : (Math.random() * 20 + 20);
                c.opacidad = Math.random() * 0.5 + 0.5;
                c.velocidadX = width > 768 ? (Math.random() * 0.3 - 0.15) : 0;
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
        const horaLocal = ahora.getHours();
        if (horaLocal >= 18 || horaLocal < 5) {
            document.body.classList.remove("day");
            document.body.classList.add("night");
        } else {
            document.body.classList.remove("night");
            document.body.classList.add("day");
        }
    }
    aplicarModoDiaNoche();