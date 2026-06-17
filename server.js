const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log(`New player has connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Player has disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});