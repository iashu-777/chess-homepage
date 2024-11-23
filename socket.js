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
  // Ensure both players are properly added to the 'players' object before emitting
  if (players[opponentId] && players[socketId]) {
    players[opponentId].emit("match_made", "w", time);
    players[socketId].emit("match_made", "b", time);

    players[opponentId].on('sync_state', function (fen, turn) {
      players[socketId].emit('sync_state_from_server', fen, turn);
    });
    players[socketId].on('sync_state', function (fen, turn) {
      players[opponentId].emit('sync_state_from_server', fen, turn);
    });
    players[opponentId].on('game_over', function (winner) {
      players[socketId].emit('game_over_from_server', winner);
    });
    players[socketId].on('game_over', function (winner) {
      players[opponentId].emit('game_over_from_server', winner);
    });
  } else {
    console.log('Error: Could not find one or both players.');
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

  socket.on('disconnect', function () {
    console.log(`Player ${socket.id} disconnected.`);
    let opponentId = null;
  
    // Find the opponent in the match
    const foreachLoop = [10, 15, 20];
    foreachLoop.forEach(time => {
      matches[time].forEach((match, index) => {
        if (match[socket.id]) {
          opponentId = match[socket.id];
          matches[time].splice(index, 1); // Remove match from the list
          console.log(`Match removed for player ${socket.id} and opponent ${opponentId} in ${time} min category.`);
        }
      });
    });
  
    if (opponentId) {
      // Notify the opponent and start a delay for reconnection
      if (players[opponentId]) {
        players[opponentId].emit('player_disconnected');
      }
  
      // Start the reconnection timeout
      reconnectionTimeouts[socket.id] = setTimeout(() => {
        console.log(`Player ${socket.id} did not reconnect. Opponent ${opponentId} declared as the winner.`);
        if (players[opponentId]) {
          players[opponentId].emit('game_over_from_server', 'You');
        }
      }, 15000); // 15 seconds delay
    }
  
    // Cleanup player from lists
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
