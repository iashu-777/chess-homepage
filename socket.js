const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const Match = require('./models/Match'); // Import Match model

const PORT = 3000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["*"],
    allowedHeaders: ["Content-Type"],
  },
  reconnectionAttempts: 5,    // Number of attempts to reconnect
  reconnectionDelay: 1000,    // Delay between reconnection attempts in ms
});
let totalPlayers = 0;
let players = {}; // This holds active players' socket IDs
let waiting = {
  '10': [],
  '15': [],
  '20': [],
};
// let matches = {
//   '10': [],
//   '15': [],
//   '20': [],
// };

async function createMatch(player1, player2, time) {
  const match = new Match({
      player1,
      player2,
      time,
  });
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

function findOpponent(playerId) {
  for (const [matchId, gameState] of Object.entries(gameStates)) {
    if (gameState.players[playerId]) {
      return Object.keys(gameState.players).find(id => id !== playerId);
    }
  }
  return null;
}

function setupListeners(socket, matchId, opponentId) {
  socket.on("sync_state", async (fen, turn) => {
      await updateMatch(matchId, fen, turn);
      players[opponentId]?.emit("sync_state_from_server", fen, turn);
  });

  socket.on("game_over", async (winner) => {
    try {
      await Match.findByIdAndUpdate(matchId, { winner });
      players[opponentId]?.emit("game_over_from_server", winner);
      delete players[socket.id];
      delete players[opponentId];
    } catch (err) {
      console.error("Error handling game over:", err);
    }
  });
}

let reconnectionTimeouts = {}; // Store reconnection timeout IDs for each player
let gameStates = {}; // Temporary in-memory store

function removeSocketFromWaitingPeriod(socket) {
  const foreachLoop = [10, 15, 20];
  foreachLoop.forEach(element => {
    const index = waiting[element].indexOf(socket);
    if (index > -1) {
      waiting[element].splice(index, 1);
    }
  });
}

function fireTotalPlayers() {
  io.emit('total_players_count_change', totalPlayers);
}

function FireonDisConnect(socket) {
  // Remove the player from the waiting list (if present)
  removeSocketFromWaitingPeriod(socket);

  // Decrement totalPlayers but ensure it never goes below 0
  if (totalPlayers > 0) {
    totalPlayers--;
  }

  // Update the player count on all clients
  fireTotalPlayers();
}



function initialsetupMatch(opponentId, socketId, time) {
  if (players[opponentId] && players[socketId]) {
    const matchId = `${opponentId}-${socketId}`; // Generate unique match ID
    gameStates[matchId] = {
      fen: "start",      // Initial chess position
      turn: "w",         // White moves first
      timer: time * 60,  // Convert time to seconds
      players: {
        [opponentId]: "w",
        [socketId]: "b"
      }
    };

    // Notify players of match creation
    players[opponentId].emit("match_made", "w", time, matchId);
    players[socketId].emit("match_made", "b", time, matchId);

    // Synchronize game states between players
    players[opponentId].on("sync_state", function (fen, turn) {
      gameStates[matchId].fen = fen;
      gameStates[matchId].turn = turn;
      players[socketId].emit("sync_state_from_server", fen, turn);
    });

    players[socketId].on("sync_state", function (fen, turn) {
      gameStates[matchId].fen = fen;
      gameStates[matchId].turn = turn;
      players[opponentId].emit("sync_state_from_server", fen, turn);
    });

    // Handle game over scenarios
    players[opponentId].on("game_over", function (winner) {
      delete gameStates[matchId];
      players[socketId].emit("game_over_from_server", winner);
    });

    players[socketId].on("game_over", function (winner) {
      delete gameStates[matchId];
      players[opponentId].emit("game_over_from_server", winner);
    });
  } else {
    console.error("Error: Could not find one or both players.");
  }
}

function HandlePlayRequest(socket, time) {
  if (waiting[time].length > 0) {
    const opponentId = waiting[time].splice(0, 1)[0];
    Match[time].push({
      [opponentId]: socket.id,
    });
    initialsetupMatch(opponentId, socket.id, time);
    return;
  }
  waiting[time].push(socket.id);
}

io.on("connection", (socket) => {
  totalPlayers++;
  io.emit('total_players_count_change', totalPlayers);

  socket.on('want_to_play', async (time) => {
      players[socket.id] = socket;

      if (waiting[time]?.length) {
          const opponentId = waiting[time].shift();
          const match = await createMatch(opponentId, socket.id, time);
          players[opponentId]?.emit("match_made", "w", time, match._id);
          socket.emit("match_made", "b", time, match._id);
          setupListeners(players[opponentId], match._id, socket.id);
          setupListeners(socket, match._id, opponentId);
      } else {
          waiting[time].push(socket.id);
      }
  });

  socket.on("disconnect", () => {
      totalPlayers--;
      io.emit('total_players_count_change', totalPlayers);
      Object.keys(waiting).forEach((time) => {
          waiting[time] = waiting[time].filter(id => id !== socket.id);
      });
      delete players[socket.id];
  });
  
  // Handle player reconnection
  socket.on('reconnect', function () {
    console.log(`Player ${socket.id} reconnected.`);
    const opponentId = findOpponent(socket.id);
    if (opponentId && players[opponentId]) {
      players[opponentId].emit('opponent_reconnected');

    // Clear the reconnection timeout if it exists
    if (reconnectionTimeouts[socket.id]) {
      clearTimeout(reconnectionTimeouts[socket.id]);
      delete reconnectionTimeouts[socket.id];
      console.log(`Reconnection timeout cleared for player ${socket.id}.`);
    }

    // Notify opponent that the player has reconnected
    
    }
  });
});



httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
