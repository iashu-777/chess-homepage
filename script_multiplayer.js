var board1 = Chessboard('myBoard', 'start')
// NOTE: this example uses the chess.js library:
// https://github.com/jhlywa/chess.js

var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
let c_player = null;
let currentMatchTime = null;
let timerInstance = null;
let opponentDisconnected = false;
let reconnectWaitTime = 15; // Wait time in seconds before declaring a win
let reconnectTimer = null;


function startTimer(seconds, container, oncomplete) {
  let startTime, timer, obj, ms = seconds * 1000,
    display = document.getElementById(container);
  obj = {};
  obj.resume = function () {
    startTime = new Date().getTime();
    timer = setInterval(obj.step, 250); // adjust this number to affect granularity
    // lower numbers are more accurate, but more CPU-expensive
  };
  obj.pause = function () {
    ms = obj.step();
    clearInterval(timer);
  };
  obj.step = function () {
    let now = Math.max(0, ms - (new Date().getTime() - startTime)),
      m = Math.floor(now / 60000), s = Math.floor(now / 1000) % 60;
    s = (s < 10 ? "0" : "") + s;
    display.innerHTML = m + ":" + s;
    if (now == 0) {
      clearInterval(timer);
      obj.resume = function () { };
      if (oncomplete) oncomplete();
    }
    return now;
  };
  obj.resume();
  return obj;
}

function onDragStart(source, piece, position, orientation) {
  if (game.turn() != c_player) {
    return false;
  }

  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  // illegal move
  if (move === null) return 'snapback';
  socket.emit('sync_state', game.fen(), game.turn());
  if (timerInstance) {
    timerInstance.pause();
  } else {
    timerInstance = startTimer(Number(currentMatchTime) * 60, "timerDisplay", function () { alert("Done!"); });
  }
  updateStatus()
}

function onChange() {
  if (game.game_over()) {
    if (game.in_checkmate()) {
      const winner = game.turn() === 'b' ? 'White' : 'Black';
      socket.emit('game_over', winner);
    }
  }
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
  board.position(game.fen())
}

function updateStatus() {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
  $pgn.html(game.pgn())
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onChange: onChange,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()

function handleButtonClick(event) {
  const timer = Number(event.target.getAttribute('data-time'));
  socket.emit('want_to_play', timer);
  $('#main-element').hide();
  $('#waiting_text_p').show();
}

document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.getElementsByClassName('timer-button');
  for (let index = 0; index < buttons.length; index++) {
    const button = buttons[index];
    button.addEventListener('click', handleButtonClick)
  }
});

// const socket = io('http://localhost:3000');
// const socket = io('https://chess-homepage-production.up.railway.app');
const socket = io(
  location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:3000" 
    : "https://chess-homepage-production.up.railway.app"
);

socket.on('total_players_count_change', function (totalPlayersCount) {
  $('#total_players').html('Total Players: ' + totalPlayersCount)
})

socket.on("match_made", (color, time) => {
  c_player = color;
  $('#main-element').show();
  $('#waiting_text_p').hide();
  const currentPlayer = color === 'b' ? 'Black' : 'White';
  $('#buttonsParent').html("<p id='youArePlayingAs'>You are Playing as " + currentPlayer + "</p><p id='timerDisplay'></p>");
  $('#buttonsParent').addClass('flex-col'); 
  game.reset();
  board.clear();
  board.start();
  board.orientation(currentPlayer.toLowerCase());
  currentMatchTime = time;
  if (game.turn() === c_player) {
    timerInstance = startTimer(Number(time) * 60, "timerDisplay", function () { alert("Done!"); });
  } else {
    timerInstance = null;
    $('#timerDisplay').html(currentMatchTime + ":00");
  }
});

socket.on('sync_state_from_server', function (fen, turn) {
  game.load(fen);
  game.setTurn(turn);
  board.position(fen);
  
  if (timerInstance) {
    timerInstance.resume();
  } else {
    timerInstance = startTimer(Number(currentMatchTime) * 60, "timerDisplay", function () { alert("Done!"); });
  }
})

socket.on('game_over_from_server', function (winner) {
  alert(winner + " won the match");
  // window.location.reload();
})

// Handle disconnection


// Handle opponent disconnection
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



// Handle opponent disconnection
// Handle opponent disconnection
socket.on('player_disconnected', function () {
  if (!opponentDisconnected) {
    opponentDisconnected = true;

    // Pause the active player's timer
    if (timerInstance) {
      timerInstance.pause();
    }

    // Notify the player about the opponent's disconnection
    let waitTime = reconnectWaitTime;
    $('#timerDisplay').html(`Opponent disconnected! Waiting for ${waitTime}s to reconnect...`);
    reconnectTimer = setInterval(() => {
      if (waitTime > 0) {
        waitTime--;
        $('#timerDisplay').html(`Opponent disconnected! Waiting for ${waitTime}s to reconnect...`);
      } else {
        clearInterval(reconnectTimer);
        alert("Your opponent did not reconnect in time. You won!");
        window.location.href = 'index_multiplayer.html';
      }
    }, 1000);
  }
});

// Handle opponent reconnection
socket.on('opponent_reconnected', function () {
  if (opponentDisconnected) {
    opponentDisconnected = false;

    // Resume the game and the timer
    alert("Your opponent has reconnected! The game will continue.");
    if (timerInstance) {
      timerInstance.resume();
    }

    // Clear the reconnect wait message
    $('#timerDisplay').html(currentMatchTime + ":00");
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
});
