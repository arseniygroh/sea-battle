const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(__dirname));

const players = [];

io.on('connection', socket => {
    if (players.length >= 2) {
        socket.emit('serverFull'); 
        socket.disconnect();       
        return;              
    }

    players.push(socket.id);
    console.log(`New player has connected: ${socket.id}`);

    if (players.length === 2) {
        io.to(players[0]).emit('gameStart', {isYourTurn: true});
        io.to(players[1]).emit('gameStart', {isYourTurn: false});
    }

    socket.on("fire", coords => {
        socket.broadcast.emit('incomingFire', coords);
    });

    socket.on("fireReply", resultData => {
        socket.broadcast.emit('fireReply', resultData); 
    });

    socket.on('disconnect', () => {
        const index = players.findIndex(playerId => playerId === socket.id);
        if (index !== -1) {
            players.splice(index, 1);
        }
        console.log(`Player has disconnected: ${socket.id}`);

        if (players.length === 1) {
            io.to(players[0]).emit('opponentLeft'); 
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});