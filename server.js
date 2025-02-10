const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Statik dosyaları sun (public klasöründeki dosyalar)
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfayı sun
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let players = {}; // Bağlı oyuncuların bilgileri
let pendingPlayers = {}; // Form gönderilene kadar bekleyen oyuncular

wss.on('connection', (ws) => {
    let playerId = Date.now(); // Her oyuncuya benzersiz bir ID atıyoruz
    console.log(`Player connected: ${playerId}`);

    // Oyuncu formu gönderilene kadar beklet
    pendingPlayers[playerId] = ws;

    // Oyuncu giriş bildirimi gönder
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'join', data: `Oyuncu ${playerId}` }));
        }
    });

    // Oyuncudan gelen mesajları dinliyoruz
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'player') {
            // Oyuncu bilgilerini güncelle
            if (!players[playerId]) {
                players[playerId] = data.data; // Oyuncuyu resmen ekle
                delete pendingPlayers[playerId]; // Bekleyenler listesinden çıkar
                console.log(`Player ${playerId} added to the game.`);
            } else {
                players[playerId] = data.data; // Oyuncunun konumunu güncelle
            }

            // Tüm oyunculara yeni konum bilgilerini gönder
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'player', data: players }));
                }
            });
        } else if (data.type === 'chat') {
            // Chat mesajını tüm istemcilere gönder
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'chat', data: data.data }));
                }
            });
        }
    });

    // Bağlantı kapandığında oyuncuyu listeden çıkarıyoruz
    ws.on('close', () => {
        delete players[playerId];
        delete pendingPlayers[playerId];
        console.log(`Player disconnected: ${playerId}`);

        // Oyuncu çıkış bildirimi gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'leave', data: `Oyuncu ${playerId}` }));
            }
        });

        // Tüm oyunculara güncellenmiş listeyi gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'player', data: players }));
            }
        });
    });
});

server.listen(3000, () => {
    console.log('Server is listening on http://localhost:3000');
});