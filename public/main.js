const radar = document.createElement('canvas');
const rtx = radar.getContext('2d');
const socket = new WebSocket('wss://radario.onrender.com'); // WebSocket bağlantısı

radar.width = window.innerWidth;
radar.height = window.innerHeight;
radar.style.backgroundColor = 'black';

document.body.appendChild(radar);

// Renk seçimi formu
const colorForm = document.createElement('form');
colorForm.innerHTML = `
    <label for="colorPicker">Renk Seçin:</label>
    <input type="color" id="colorPicker" value="#ff0000">
    <button type="submit">Başla</button>
`;

document.body.appendChild(colorForm);

let player = {
    x: radar.width / 2,
    y: radar.height / 2,
    color: '#ff0000', // Başlangıç rengi
};

colorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    player.color = document.getElementById('colorPicker').value;
    colorForm.style.display = 'none'; // Renk seçimi formunu gizle
    socket.send(JSON.stringify(player)); // Oyuncunun rengi ve konumu sunucuya gönder
});

const centerX = radar.width / 2;
const centerY = radar.height / 2;
let angle = 0;
const radarRadius = 200;
let pulses = [];
let players = {}; // Sunucudan gelen diğer oyuncuların bilgileri

// Oyuncu hareketi
const movePlayer = (dx, dy) => {
    // Oyuncunun yeni konumunu hesapla
    let newX = player.x + dx;
    let newY = player.y + dy;

    // Canvas sınırlarını kontrol et
    if (newX >= 0 && newX <= radar.width) {
        player.x = newX;
    }
    if (newY >= 0 && newY <= radar.height) {
        player.y = newY;
    }

    socket.send(JSON.stringify(player)); // Oyuncu konumu güncelleniyor ve sunucuya gönderiliyor
};

document.addEventListener('keydown', (event) => {
    const speed = event.shiftKey ? 10 : 5; // Shift tuşu basılıysa hız 10, değilse 5

    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movePlayer(0, -speed);
            break;
        case 'ArrowDown':
        case 's':
            movePlayer(0, speed);
            break;
        case 'ArrowLeft':
        case 'a':
            movePlayer(-speed, 0);
            break;
        case 'ArrowRight':
        case 'd':
            movePlayer(speed, 0);
            break;
    }
});

socket.onmessage = (event) => {
    players = JSON.parse(event.data); // Sunucudan gelen oyuncu bilgilerini al
};

const drawGrid = () => {
    const gridSize = 50;

    rtx.beginPath();
    rtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    rtx.lineWidth = 1;

    for (let x = 0; x <= radar.width; x += gridSize) {
        rtx.moveTo(x, 0);
        rtx.lineTo(x, radar.height);
    }

    for (let y = 0; y <= radar.height; y += gridSize) {
        rtx.moveTo(0, y);
        rtx.lineTo(radar.width, y);
    }

    rtx.stroke();
};

const drawPulses = () => {
    for (let i = 0; i < pulses.length; i++) {
        let pulse = pulses[i];
        let alpha = 1 - pulse.age / pulse.lifetime;

        if (alpha <= 0) {
            pulses.splice(i, 1);
            i--;
            continue;
        }

        rtx.beginPath();
        rtx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
        rtx.lineWidth = 2;
        rtx.arc(centerX, centerY, pulse.radius, 0, Math.PI * 2);
        rtx.stroke();

        pulse.radius += 2;
        pulse.age++;
    }
};

const drawSweepEffect = () => {
    rtx.save();
    rtx.translate(centerX, centerY);
    rtx.rotate(angle);

    let gradient = rtx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
    gradient.addColorStop(0, `rgba(0, 255, 0, ${0.3})`);
    gradient.addColorStop(1, "rgba(0, 255, 0, 0)");

    rtx.fillStyle = gradient;
    rtx.beginPath();
    rtx.moveTo(0, 0);
    rtx.arc(0, 0, radarRadius, -0.2, 0.2);
    rtx.closePath();
    rtx.fill();

    rtx.restore();
};

const drawRadar = () => {
    rtx.clearRect(0, 0, radar.width, radar.height); // Ekranı temizle

    drawGrid();
    drawPulses();

    rtx.strokeStyle = 'green';
    rtx.lineWidth = 2;
    rtx.beginPath();
    rtx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    rtx.stroke();

    // Kendi konumumuzu radar üzerinde çiz
    rtx.beginPath();
    rtx.fillStyle = player.color; // Kendi rengimiz
    rtx.arc(player.x, player.y, 5, 0, Math.PI * 2);
    rtx.fill();

    // Diğer oyuncuları çiz (sadece oyuncu bilgileri sunucudan geldiyse)
    Object.values(players).forEach(p => {
        let dx = p.x - centerX;
        let dy = p.y - centerY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let targetAngle = Math.atan2(dy, dx);
        let normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        if (Math.abs(targetAngle - normalizedAngle) < 0.2 && distance < radarRadius) {
            p.detected = true;
            setTimeout(() => (p.detected = false), 500);
        }

        // Eski konumları çizmiyor, sadece güncel konumları çiziyor
        rtx.beginPath();
        rtx.fillStyle = p.color;
        rtx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        rtx.fill();
    });

    drawSweepEffect();

    rtx.save();
    rtx.translate(centerX, centerY);
    rtx.rotate(angle);

    rtx.shadowBlur = 10;
    rtx.shadowColor = "green";

    rtx.strokeStyle = 'lime';
    rtx.lineWidth = 3;
    rtx.beginPath();
    rtx.moveTo(0, 0);
    rtx.lineTo(radarRadius, 0);
    rtx.stroke();

    rtx.restore();

    angle += 0.03;

    if (angle % (Math.PI / 4) < 0.03) {
        pulses.push({ radius: 0, age: 0, lifetime: 50 });
    }

    requestAnimationFrame(drawRadar); // Sürekli ekranı yenile
};

drawRadar(); // Başlat