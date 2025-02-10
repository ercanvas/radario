const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = {}; // Bağlı oyuncuların bilgileri
let pendingPlayers = {}; // Form gönderilene kadar bekleyen oyuncular

wss.on('connection', (ws) => {
    let playerId = Date.now(); // Her oyuncuya benzersiz bir ID atıyoruz
    console.log(`Player connected: ${playerId}`);

    // Oyuncu formu gönderilene kadar beklet
    pendingPlayers[playerId] = ws;

    // Oyuncudan gelen hareket bilgilerini dinliyoruz
    ws.on('message', (message) => {
        const playerData = JSON.parse(message);

        // Eğer oyuncu formu gönderdiyse, oyuncuyu resmen ekle
        if (!players[playerId]) {
            players[playerId] = playerData; // Oyuncuyu resmen ekle
            delete pendingPlayers[playerId]; // Bekleyenler listesinden çıkar
            console.log(`Player ${playerId} added to the game.`);
        } else {
            players[playerId] = playerData; // Oyuncunun konumunu güncelle
        }

        // Tüm oyunculara yeni konum bilgilerini gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(players));
            }
        });
    });

    // Bağlantı kapandığında oyuncuyu listeden çıkarıyoruz
    ws.on('close', () => {
        delete players[playerId];
        delete pendingPlayers[playerId];
        console.log(`Player disconnected: ${playerId}`);

        // Tüm oyunculara güncellenmiş listeyi gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(players));
            }
        });
    });
});

server.listen(3000, () => {
    console.log('Server is listening on ws://localhost:3000');
});