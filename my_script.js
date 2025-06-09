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
    const simbolos = ["❄", "\u2665"]; // ❄ y ♥ como texto puro (blanco garantizado)

    function inicializar() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        copos = [];
        for (let i = 0; i < 180; i++) {
            let simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
            let tamaño = (simbolo === "\u2665") ? (Math.random() * 8 + 8) : (Math.random() * 20 + 20);
            copos.push({
                x: Math.random() * width,
                y: Math.random() * height,
                velocidadY: Math.random() * 1 + 0.5,
                velocidadX: Math.random() * 0.5 - 0.25, // movimiento lateral suave
                simbolo: simbolo,
                tamaño: tamaño,
                opacidad: Math.random() * 0.5 + 0.5
            });
        }
    }

    function dibujarNieve() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < copos.length; i++) {
            let c = copos[i];
            ctx.font = `${c.tamaño}px Arial Unicode MS, Pacifico, sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${c.opacidad})`;
            ctx.fillText(c.simbolo, c.x, c.y);
            c.y += c.velocidadY;
            c.x += c.velocidadX;

            if (c.y > height || c.x < 0 || c.x > width) {
                c.y = 0;
                c.x = Math.random() * width;
                c.simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
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