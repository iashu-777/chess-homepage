const express = require('express');
const http = require('http'); // Shared server for Express and Socket.IO
const { Server } = require('socket.io'); // Import Socket.IO
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth'); // Import auth routes
const Match = require('./models/Match'); // Import Match model
const statsRoute=require('./routes/stats');
dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app); // Shared HTTP server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
    },
});

let totalPlayers = 0;
let players = {}; // Store active players' socket IDs
let waiting = {
    '10': [],
    '15': [],
    '20': [],
};
let gameStates = {}; // Temporary in-memory store
let reconnectionTimeouts = {}; // Store reconnection timeout IDs for each player

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(express.static('public'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

// Routes
app.use('/auth', authRoutes); // Auth routes
app.use('/stats',statsRoute); 
app.get('/', (req, res) => res.send('Server is running!'));

// MongoDB connection
mongoose
    .connect('mongodb+srv://iashu-777:fatherhadadonkey@cluster0.xm1o9.mongodb.net/chess_db?retryWrites=true&w=majority&appName=Cluster0', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Stop server if DB connection fails
    });

// API route for fetching match details (for debugging or frontend)
app.get('/matches', async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        console.error('Error fetching matches:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Utility Functions
async function createMatch(player1, player2, time) {
    const match = new Match({ player1, player2, time });
    await match.save();
    return match;
}

async function updateMatch(matchId, fen, turn) {
    try {
        await Match.findByIdAndUpdate(matchId, { fen, turn, updatedAt: Date.now() });
    } catch (err) {
        console.error(`Error updating match ${matchId}:`, err);
    }
}

function removeSocketFromWaitingPeriod(socket) {
    Object.keys(waiting).forEach((time) => {
        const index = waiting[time].indexOf(socket.id);
        if (index > -1) waiting[time].splice(index, 1);
    });
}

function setupListeners(socket, matchId, opponentId) {
    socket.on('sync_state', async (fen, turn) => {
        await updateMatch(matchId, fen, turn);
        players[opponentId]?.emit('sync_state_from_server', fen, turn);
    });

    socket.on('game_over', async (winner) => {
        try {
            await Match.findByIdAndUpdate(matchId, { winner });
            players[opponentId]?.emit('game_over_from_server', winner);
            delete players[socket.id];
            delete players[opponentId];
        } catch (err) {
            console.error('Error handling game over:', err);
        }
    });
}

// Socket.IO Logic
io.on('connection', (socket) => {
    totalPlayers++;
    io.emit('total_players_count_change', totalPlayers);

    socket.on('want_to_play', async (time) => {
        players[socket.id] = socket;

        if (waiting[time]?.length) {
            const opponentId = waiting[time].shift();
            const match = await createMatch(opponentId, socket.id, time);
            players[opponentId]?.emit('match_made', 'w', time, match._id);
            socket.emit('match_made', 'b', time, match._id);
            setupListeners(players[opponentId], match._id, socket.id);
            setupListeners(socket, match._id, opponentId);
        } else {
            waiting[time].push(socket.id);
        }
    });

    socket.on('disconnect', () => {
        totalPlayers--;
        io.emit('total_players_count_change', totalPlayers);
        removeSocketFromWaitingPeriod(socket);
        delete players[socket.id];
    });

    socket.on('reconnect', () => {
        console.log(`Player ${socket.id} reconnected.`);
        const opponentId = findOpponent(socket.id);
        if (opponentId && players[opponentId]) {
            players[opponentId].emit('opponent_reconnected');

            if (reconnectionTimeouts[socket.id]) {
                clearTimeout(reconnectionTimeouts[socket.id]);
                delete reconnectionTimeouts[socket.id];
            }
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
