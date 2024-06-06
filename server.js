const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

const players = {};

const directions = {
    'left': { x: -1, y: 0 },
    'right': { x: 1, y: 0 },
    'up': { x: 0, y: -1 },
    'down': { x: 0, y: 1 },
    'up-left': { x: -1, y: -1 },
    'up-right': { x: 1, y: -1 },
    'down-left': { x: -1, y: 1 },
    'down-right': { x: 1, y: 1 }
};

io.on('connection', (socket) => {
    console.log('a user connected');

    players[socket.id] = {
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: 20,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        direction: null,
        speed: 0 // Initialize speed to zero
    };

    socket.on('move', (direction) => {
        const player = players[socket.id];
        player.direction = direction;
        player.speed = 2; // Set speed when a movement command is received
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete players[socket.id];
    });
});

function gameLoop() {
    for (const id in players) {
        const player = players[id];
        if (player.direction) {
            const dir = directions[player.direction];
            player.x += dir.x * player.speed; // Adjust speed
            player.y += dir.y * player.speed; // Adjust speed
        } else {
            // Reduce speed gradually until it reaches zero
            player.speed *= 0.9; // Adjust the factor for desired deceleration rate
            if (player.speed < 0.01) {
                player.speed = 0; // Set speed to zero when it becomes very small
            }
        }
    }
    io.emit('state', players);
    setTimeout(gameLoop, 1000 / 60); // 60 FPS
}

gameLoop();

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
