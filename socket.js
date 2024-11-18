const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { spawn } = require("child_process");
const fs = require("fs");
const cors = require("cors");
const timeout = require("connect-timeout");

const app = express();
const PORT = 3000;

// Configure CORS with middleware
const corsOptions = {
  origin: ["http://127.0.0.1:3000", "https://prismatic-lamington-297b85.netlify.app"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};
app.use(cors(corsOptions));


// Socket.IO for Multiplayer Functionality
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://127.0.0.1:3000", "https://prismatic-lamington-297b85.netlify.app"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

let totalPlayers = 0;
let players = {};
let waiting = {
  '10': [],
  '15': [],
  '20': [],
};
let matches = {
  '10': [],
  '15': [],
  '20': [],
};

function removeSocketFromWaitingPeriod(socket) {
  [10, 15, 20].forEach(time => {
    const index = waiting[time].indexOf(socket);
    if (index > -1) waiting[time].splice(index, 1);
  });
}

function fireTotalPlayers() {
  io.emit('total_players_count_change', totalPlayers);
}

function FireonDisConnect(socket) {
  removeSocketFromWaitingPeriod(socket.id);
  totalPlayers--;
  fireTotalPlayers();
}

function initialsetupMatch(opponentId, socketId, time) {
  players[opponentId].emit("match_made", "w", time);
  players[socketId].emit("match_made", "b", time);

  players[opponentId].on('sync_state', (fen, turn) => {
    players[socketId].emit('sync_state_from_server', fen, turn);
  });
  players[socketId].on('sync_state', (fen, turn) => {
    players[opponentId].emit('sync_state_from_server', fen, turn);
  });
  players[opponentId].on('game_over', (winner) => {
    players[socketId].emit('game_over_from_server', winner);
  });
  players[socketId].on('game_over', (winner) => {
    players[opponentId].emit('game_over_from_server', winner);
  });
}

function HandlePlayRequest(socket, time) {
  if (waiting[time].length > 0) {
    const opponentId = waiting[time].shift();
    matches[time].push({ [opponentId]: socket.id });
    initialsetupMatch(opponentId, socket.id, time);
  } else {
    if (!waiting[time].includes(socket.id)) waiting[time].push(socket.id);
  }
}

function FireOnConnected(socket) {
  socket.on('want_to_play', (timer) => {
    HandlePlayRequest(socket, timer);
  });
  totalPlayers++;
  fireTotalPlayers();
}

io.on("connection", (socket) => {
  players[socket.id] = socket;
  FireOnConnected(socket);

  socket.on('disconnect', () => {
    FireonDisConnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
