const { createServer } = require("http");
const { Server } = require("socket.io");
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
let matches = {
  '10': [],
  '15': [],
  '20': [],
};
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
    matches[time].push({
      [opponentId]: socket.id,
    });
    initialsetupMatch(opponentId, socket.id, time);
    return;
  }
  waiting[time].push(socket.id);
}

io.on("connection", function (socket) {
  totalPlayers++;
  fireTotalPlayers();
  
  console.log(`New player connected. Total players: ${totalPlayers}`);

  socket.on('want_to_play', function (time) {
    players[socket.id] = socket;
    HandlePlayRequest(socket, time);
  });

  socket.on("disconnect", function () {
    console.log(`Player ${socket.id} disconnected.`);
  
    let matchId = null;
    let opponentId = null;
  
    // Find match by disconnected player
    for (const id in gameStates) {
      if (gameStates[id].players[socket.id]) {
        matchId = id;
        opponentId = Object.keys(gameStates[id].players).find((id) => id !== socket.id);
        break;
      }
    }
  
    if (matchId && opponentId) {
      // Mark player as disconnected in game state
      gameStates[matchId].disconnectedPlayer = socket.id;
  
      // Notify the opponent
      if (players[opponentId]) {
        players[opponentId].emit("player_disconnected", matchId);
      }
  
      // Start a timeout for reconnection
      reconnectionTimeouts[socket.id] = setTimeout(() => {
        console.log(`Player ${socket.id} did not reconnect. Declaring opponent (${opponentId}) as winner.`);
        if (players[opponentId]) {
          players[opponentId].emit("game_over_from_server", "You");
        }
        delete gameStates[matchId]; // Cleanup game state
      }, 15000); // 15 seconds
    } else {
      console.error("No match found for disconnected player.");
    }
  
    FireonDisConnect(socket);
  });
  
  
  // Handle player reconnection
  socket.on('reconnect', function () {
    console.log(`Player ${socket.id} reconnected.`);
    

    // Clear the reconnection timeout if it exists
    if (reconnectionTimeouts[socket.id]) {
      clearTimeout(reconnectionTimeouts[socket.id]);
      delete reconnectionTimeouts[socket.id];
      console.log(`Reconnection timeout cleared for player ${socket.id}.`);
    }

    // Notify opponent that the player has reconnected
    const opponentId = findOpponent(socket.id);
    if (opponentId && players[opponentId]) {
      players[opponentId].emit('opponent_reconnected');
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
