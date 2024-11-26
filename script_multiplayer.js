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
let opponentTimerInstance = null; // Timer for the opponent



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

  // Remove existing event listeners if any
  for (let index = 0; index < buttons.length; index++) {
      const button = buttons[index];
      const clone = button.cloneNode(true);
      button.parentNode.replaceChild(clone, button);
  }

  // Add new event listeners
  const newButtons = document.getElementsByClassName('timer-button');
  for (let index = 0; index < newButtons.length; index++) {
      const button = newButtons[index];
      button.addEventListener('click', handleButtonClick);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const matchId = localStorage.getItem("matchId");
  if (matchId) {
      socket.emit("reconnect_with_match", matchId);
  }
});

// const socket = io('http://localhost:3000');
// const socket = io('https://chess-homepage-production.up.railway.app');
const socket = io(
  location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://chess-homepage-production.up.railway.app"
);

socket.on('total_players_count_change', function (totalPlayersCount) {
  $('#total_players').html('Total Players: ' + totalPlayersCount)
})

socket.on("match_made", (color, time, matchId) => {
  localStorage.setItem("matchId", matchId);
  c_player = color;
  $('#main-element').show();
  $('#waiting_text_p').hide();

  const currentPlayer = color === 'b' ? 'Black' : 'White';
  $('#buttonsParent').html(`
      <p id="youArePlayingAs">You are Playing as ${currentPlayer}</p>
      <div class="flex-row">
          <p>Your Timer: <span id="timerDisplay">${time}:00</span></p>
          <p>Opponent Timer: <span id="opponentTimerDisplay">${time}:00</span></p>
      </div>
  `);

  game.reset();
  board.clear();
  board.start();
  board.orientation(currentPlayer.toLowerCase());
  currentMatchTime = time;

  if (game.turn() === c_player) {
      timerInstance = startTimer(Number(time) * 60, "timerDisplay", function () { alert("Time's up!"); });
  } else {
      opponentTimerInstance = startTimer(Number(time) * 60, "opponentTimerDisplay", function () { alert("Opponent's time is up!"); });
  }
});



socket.on('sync_state_from_server', function (fen, turn) {
  game.load(fen);
  game.setTurn(turn);
  board.position(fen);

  if (game.turn() === c_player) {
      // Player's turn: Resume player's timer and pause opponent's timer
      if (timerInstance) {
          timerInstance.resume();
      } else {
          timerInstance = startTimer(Number(currentMatchTime) * 60, "timerDisplay", function () { 
              alert("Time's up!"); 
              socket.emit('time_out', c_player);
          });
      }
      if (opponentTimerInstance) opponentTimerInstance.pause();
  } else {
      // Opponent's turn: Pause player's timer and resume opponent's timer
      if (timerInstance) timerInstance.pause();
      if (opponentTimerInstance) {
          opponentTimerInstance.resume();
      } else {
          opponentTimerInstance = startTimer(Number(currentMatchTime) * 60, "opponentTimerDisplay", function () { 
              alert("Opponent's time is up!");
              socket.emit('time_out', game.turn());
          });
      }
  }
});



socket.on('game_over_from_server', function (winner) {
  alert(winner + " won the match");
  localStorage.removeItem("matchId");
  window.location.reload();
});

// Handle disconnection





// Handle opponent disconnection
// Handle opponent disconnection
socket.on('player_disconnected', function () {
  if (!opponentDisconnected) {
      opponentDisconnected = true;

      // Pause both timers
      if (timerInstance) timerInstance.pause();
      if (opponentTimerInstance) opponentTimerInstance.pause();

      // Show disconnection modal
      $('#disconnectionModal').show();

      let waitTime = reconnectWaitTime;
      const messageElement = $('#disconnectionMessage');
      messageElement.text(`Opponent disconnected! Waiting for ${waitTime}s to reconnect...`);
      reconnectTimer = setInterval(() => {
          if (waitTime > 0) {
              waitTime--;
              messageElement.text(`Opponent disconnected! Waiting for ${waitTime}s to reconnect...`);
          } else {
              clearInterval(reconnectTimer);
              reconnectTimer = null;
              if (opponentDisconnected) {
                  alert("Your opponent did not reconnect in time. You won!");
                  $('#disconnectionModal').hide();
                  window.location.href = 'index_multiplayer.html';
              }
          }
      }, 1000);
  }
});



// Handle opponent reconnection
socket.on('opponent_reconnected', function () {
  if (opponentDisconnected) {
      opponentDisconnected = false;

      // Resume timers
      if (game.turn() === c_player && timerInstance) {
          timerInstance.resume();
      } else if (opponentTimerInstance) {
          opponentTimerInstance.resume();
      }

      // Hide the disconnection modal
      $('#disconnectionModal').hide();
      clearInterval(reconnectTimer);
      reconnectTimer = null;

      alert("Your opponent has reconnected! The game will continue.");
  }
});

socket.on("restore_game_state", function (fen, turn, matchId) {
  if (timerInstance) {
      timerInstance.pause();
      timerInstance = null;
  }
  game.load(fen);
  board.position(fen);
  board.orientation(turn === "w" ? "white" : "black");
  localStorage.setItem("matchId", matchId); // Ensure match ID is properly updated
});

socket.on("invalid_match", function () {
  alert("The match you were trying to reconnect to no longer exists. Starting a new game.");
  localStorage.removeItem("matchId");
  window.location.href = "index_multiplayer.html";
});