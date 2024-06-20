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

    socket.on('join', ({ name, color }) => {
        players[socket.id] = {
            name: name,
            x: Math.random() * 1200,
            y: Math.random() * 800,
            size: 20,
            color: color, // Hier wird die Farbe des Spielers auf die ausgewählte Farbe gesetzt
            direction: null,
            speed: 0,
            vx: 0,
            vy: 0,
            maxSpeed: 5,
            friction: 0.85,
            acceleration: 0.2,
            inertia: 0.1 // Factor to control direction smoothing
        };
        io.emit('state', players); // Sende den aktualisierten Zustand an alle Clients
    });

    socket.on('move', (direction) => {
        const player = players[socket.id];
        if (direction === 'stop') {
            player.direction = null;
        } else {
            player.direction = direction;
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete players[socket.id];
    });
});

// gameloop

function gameLoop() {
    const updatedPlayers = { ...players };

    for (const id1 in updatedPlayers) {
        const player1 = updatedPlayers[id1];
        for (const id2 in updatedPlayers) {
            if (id1 !== id2) {
                const player2 = updatedPlayers[id2];
                if (checkCollision(player1, player2)) {
                    if (player1.size === player2.size) {
                        player1.size += player2.size
                        player2.size = 5;
                    }
                }
            }
        }
    }

    for (const id in updatedPlayers) {
        const player = updatedPlayers[id];
        if (player.direction) {
            const dir = directions[player.direction];
            player.vx += dir.x * player.acceleration;
            player.vy += dir.y * player.acceleration;

            // Clamp speed
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (speed > player.maxSpeed) {
                const scalingFactor = player.maxSpeed / speed;
                player.vx *= scalingFactor;
                player.vy *= scalingFactor;
            }
        } else {
            player.vx *= player.friction;
            player.vy *= player.friction;
        }

        player.x += player.vx;
        player.y += player.vy;

        // Update the speed for the next frame
        player.speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);

        if (player.speed < 0.01) {
            player.speed = 0;
            player.vx = 0;
            player.vy = 0;
        }
    }

    for (const id in updatedPlayers) {
        players[id] = updatedPlayers[id];
    }

    io.emit('state', updatedPlayers);

    setTimeout(gameLoop, 1000 / 60);
}

// collisionhandling

function checkCollision(player1, player2) {
    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player1.size + player2.size;
}

// initialization

gameLoop();



// other

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
