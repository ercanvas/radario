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
    socket.send(JSON.stringify({ type: 'player', data: player })); // Oyuncunun rengi ve konumu sunucuya gönder
});

const centerX = radar.width / 2;
const centerY = radar.height / 2;
let angle = 0;
const radarRadius = 200;
let pulses = [];
let players = {}; // Sunucudan gelen diğer oyuncuların bilgileri

// Dokunmatik kontroller için butonlar
const controls = document.createElement('div');
controls.style.position = 'fixed';
controls.style.bottom = '20px';
controls.style.left = '20px';
controls.style.display = 'flex';
controls.style.flexDirection = 'column';
controls.style.gap = '10px';

const upButton = document.createElement('button');
upButton.innerText = 'Yukarı';
upButton.style.padding = '10px';
upButton.style.fontSize = '16px';

const downButton = document.createElement('button');
downButton.innerText = 'Aşağı';
downButton.style.padding = '10px';
downButton.style.fontSize = '16px';

const leftButton = document.createElement('button');
leftButton.innerText = 'Sol';
leftButton.style.padding = '10px';
leftButton.style.fontSize = '16px';

const rightButton = document.createElement('button');
rightButton.innerText = 'Sağ';
rightButton.style.padding = '10px';
rightButton.style.fontSize = '16px';

const speedButton = document.createElement('button');
speedButton.innerText = 'Hız Artır';
speedButton.style.padding = '10px';
speedButton.style.fontSize = '16px';

controls.appendChild(upButton);
controls.appendChild(downButton);
controls.appendChild(leftButton);
controls.appendChild(rightButton);
controls.appendChild(speedButton);
document.body.appendChild(controls);

let speed = 5; // Başlangıç hızı

// Dokunmatik butonlar için olay dinleyicileri
upButton.addEventListener('click', () => movePlayer(0, -speed));
downButton.addEventListener('click', () => movePlayer(0, speed));
leftButton.addEventListener('click', () => movePlayer(-speed, 0));
rightButton.addEventListener('click', () => movePlayer(speed, 0));
speedButton.addEventListener('click', () => {
    speed = speed === 5 ? 10 : 5; // Hızı değiştir
    speedButton.innerText = speed === 5 ? 'Hız Artır' : 'Hız Azalt';
});

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

    socket.send(JSON.stringify({ type: 'player', data: player })); // Oyuncu konumu güncelleniyor ve sunucuya gönderiliyor
};

// Klavye olayları
document.addEventListener('keydown', (event) => {
    const currentSpeed = event.shiftKey ? 10 : 5; // Shift tuşu basılıysa hız 10, değilse 5

    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movePlayer(0, -currentSpeed);
            break;
        case 'ArrowDown':
        case 's':
            movePlayer(0, currentSpeed);
            break;
        case 'ArrowLeft':
        case 'a':
            movePlayer(-currentSpeed, 0);
            break;
        case 'ArrowRight':
        case 'd':
            movePlayer(currentSpeed, 0);
            break;
    }
});

// Chat özelliği
const chatContainer = document.createElement('div');
chatContainer.style.position = 'fixed';
chatContainer.style.bottom = '20px';
chatContainer.style.right = '20px';
chatContainer.style.width = '300px';
chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
chatContainer.style.padding = '10px';
chatContainer.style.borderRadius = '10px';
chatContainer.style.color = 'white';
chatContainer.style.display = 'none'; // Başlangıçta gizli

const chatMessages = document.createElement('div');
chatMessages.style.height = '200px';
chatMessages.style.overflowY = 'auto';
chatMessages.style.marginBottom = '10px';

const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.placeholder = 'Mesajınızı yazın...';
chatInput.style.width = '100%';
chatInput.style.padding = '5px';

const chatButton = document.createElement('button');
chatButton.innerText = 'Gönder';
chatButton.style.width = '100%';
chatButton.style.padding = '5px';
chatButton.style.marginTop = '10px';

chatContainer.appendChild(chatMessages);
chatContainer.appendChild(chatInput);
chatContainer.appendChild(chatButton);
document.body.appendChild(chatContainer);

// Chat butonu
const toggleChatButton = document.createElement('button');
toggleChatButton.innerText = 'Chat';
toggleChatButton.style.position = 'fixed';
toggleChatButton.style.top = '20px';
toggleChatButton.style.right = '20px';
toggleChatButton.style.padding = '10px';
toggleChatButton.style.fontSize = '16px';

toggleChatButton.addEventListener('click', () => {
    chatContainer.style.display = chatContainer.style.display === 'none' ? 'block' : 'none';
});

document.body.appendChild(toggleChatButton);

// Mesaj gönderme
chatButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.send(JSON.stringify({ type: 'chat', data: message }));
        chatInput.value = '';
    }
});

// Ses dosyaları
const notificationSound = new Audio('notification.mp3'); // Yeni mesaj sesi
const joinSound = new Audio('join.mp3'); // Oyuncu giriş sesi
const leaveSound = new Audio('leave.mp3'); // Oyuncu çıkış sesi

// Bildirimler için div
const notificationContainer = document.createElement('div');
notificationContainer.style.position = 'fixed';
notificationContainer.style.top = '20px';
notificationContainer.style.left = '20px';
notificationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
notificationContainer.style.color = 'white';
notificationContainer.style.padding = '10px';
notificationContainer.style.borderRadius = '10px';
notificationContainer.style.display = 'none';
document.body.appendChild(notificationContainer);

// Bildirim göster
function showNotification(message) {
    notificationContainer.innerText = message;
    notificationContainer.style.display = 'block';
    setTimeout(() => {
        notificationContainer.style.display = 'none';
    }, 3000); // 3 saniye sonra bildirimi gizle
}

// WebSocket mesajlarını işleme
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'player') {
        players = message.data; // Oyuncu bilgilerini güncelle
    } else if (message.type === 'chat') {
        // Chat mesajını ekrana ekle
        const messageElement = document.createElement('div');
        messageElement.innerText = message.data;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // En son mesaja kaydır

        // Yeni mesaj bildirimi ve ses
        showNotification('Yeni mesaj!');
        notificationSound.play();
    } else if (message.type === 'join') {
        // Oyuncu giriş bildirimi ve ses
        showNotification(`${message.data} oyuna katıldı!`);
        joinSound.play();
    } else if (message.type === 'leave') {
        // Oyuncu çıkış bildirimi ve ses
        showNotification(`${message.data} oyundan ayrıldı!`);
        leaveSound.play();
    }
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