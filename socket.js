const express = require("express");
const { spawn } = require("child_process");
const cors = require("cors");
const fs = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = 3000;

// Configure CORS for Express
app.use(
  cors({
    origin: "*", // Update to allow specific origins if needed
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Stockfish binary path
const stockfishPath = "/app/stockfish-ubuntu-x86-64-avx2";

// Check if Stockfish binary exists and is executable
if (!fs.existsSync(stockfishPath)) {
  console.error(`Stockfish binary not found at ${stockfishPath}`);
} else if (!(fs.statSync(stockfishPath).mode & fs.constants.X_OK)) {
  console.error(`Stockfish binary found but not executable: ${stockfishPath}`);
}

// Stockfish AI Move Endpoint
app.get("/move", (req, res) => {
  const fen = req.query.fen;
  const depth = req.query.depth || 10;

  // Run Stockfish with FEN and depth commands using spawn
  const stockfish = spawn(stockfishPath);

  let output = "";

  // Collect data from Stockfish output
  stockfish.stdout.on("data", (data) => {
    output += data.toString();
  });

  // Handle error output from Stockfish
  stockfish.stderr.on("data", (data) => {
    console.error(`Stockfish error output: ${data}`);
  });

  // Detect when Stockfish process ends
  stockfish.on("close", (code) => {
    if (code !== 0) {
      console.error(`Stockfish process exited with code ${code}`);
      return res.status(500).json({ success: false, error: "Stockfish process failed." });
    }

    // Process Stockfish output to find the best move
    if (output.includes("bestmove")) {
      const bestMove = output.split("bestmove ")[1].split(" ")[0];
      return res.json({ success: true, bestmove: bestMove });
    } else {
      return res.status(500).json({ success: false, error: "Best move not found in Stockfish output." });
    }
  });

  // Send FEN and depth commands to Stockfish
  stockfish.stdin.write(`position fen ${fen}\n`);
  stockfish.stdin.write(`go depth ${depth}\n`);
  stockfish.stdin.end();
});

// Socket.IO for Multiplayer Functionality
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow any origin for testing; specify if needed
    methods: ["GET", "POST"]
  }
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
