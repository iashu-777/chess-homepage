// Load .env FIRST, before anything reads process.env
require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const Match = require('./models/Match');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI missing hai. .env.example ko copy karke .env banao aur values bharo.');
    process.exit(1);
}

const app = express();
const server = http.createServer(app); // Express + Socket.IO share one server
// Frontend is served by this same server (same origin), so no CORS setup is needed in development.
const io = new Server(server);

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));          // HTML/CSS/JS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // profile pictures

// ---------- Routes ----------
app.use('/auth', authRoutes);

// ---------- Multiplayer (Socket.IO) ----------
const VALID_TIMES = [10, 15, 20];
const waiting = { 10: [], 15: [], 20: [] }; // socket ids waiting for an opponent, per time control
const games = {}; // socketId -> { matchId, opponentId, color }
let totalPlayers = 0;

function removeFromWaiting(socketId) {
    for (const time of VALID_TIMES) {
        waiting[time] = waiting[time].filter((id) => id !== socketId);
    }
}

async function endGame(socketId, result) {
    const game = games[socketId];
    if (!game) return;
    const { matchId, opponentId } = game;
    delete games[socketId];
    delete games[opponentId];
    io.to(opponentId).emit('game_over_from_server', result);
    try {
        await Match.findByIdAndUpdate(matchId, { winner: result.winner, reason: result.reason, updatedAt: Date.now() });
    } catch (err) {
        console.error('Error saving game result:', err.message);
    }
}

io.on('connection', (socket) => {
    totalPlayers++;
    io.emit('total_players_count_change', totalPlayers);

    socket.on('want_to_play', async (time) => {
        time = Number(time);
        if (!VALID_TIMES.includes(time) || games[socket.id]) return;
        removeFromWaiting(socket.id); // avoid double-queueing on repeated clicks

        // Pick the first waiting player who is still connected
        let opponentId;
        while (waiting[time].length && !opponentId) {
            const id = waiting[time].shift();
            if (io.sockets.sockets.get(id)) opponentId = id;
        }

        if (!opponentId) {
            waiting[time].push(socket.id);
            return;
        }

        try {
            const match = await Match.create({ player1: opponentId, player2: socket.id, time });
            const matchId = match._id.toString();
            games[opponentId] = { matchId, opponentId: socket.id, color: 'w' };
            games[socket.id] = { matchId, opponentId, color: 'b' };
            io.to(opponentId).emit('match_made', 'w', time, matchId);
            socket.emit('match_made', 'b', time, matchId);
        } catch (err) {
            console.error('Error creating match:', err.message);
            socket.emit('server_error', 'Match create nahi ho paya, dobara try karo.');
        }
    });

    socket.on('sync_state', async (fen, turn) => {
        const game = games[socket.id];
        if (!game) return;
        io.to(game.opponentId).emit('sync_state_from_server', fen, turn);
        try {
            await Match.findByIdAndUpdate(game.matchId, { fen, turn, updatedAt: Date.now() });
        } catch (err) {
            console.error('Error updating match:', err.message);
        }
    });

    // result = { winner: 'White' | 'Black' | null, reason: 'checkmate' | 'draw' | 'timeout' | ... }
    socket.on('game_over', (result) => endGame(socket.id, result));

    socket.on('time_out', () => {
        const game = games[socket.id];
        if (!game) return;
        const winner = game.color === 'w' ? 'Black' : 'White';
        socket.emit('game_over_from_server', { winner, reason: 'timeout' });
        endGame(socket.id, { winner, reason: 'timeout' });
    });

    socket.on('disconnect', () => {
        totalPlayers = Math.max(0, totalPlayers - 1);
        io.emit('total_players_count_change', totalPlayers);
        removeFromWaiting(socket.id);
        const game = games[socket.id];
        if (game) {
            const winner = game.color === 'w' ? 'Black' : 'White';
            endGame(socket.id, { winner, reason: 'opponent_disconnected' });
        }
    });
});

// ---------- Start ----------
mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        server.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('MongoDB connect nahi hua:', err.message);
        process.exit(1);
    });
