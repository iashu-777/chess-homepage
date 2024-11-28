var board1 = Chessboard('myBoard', 'start');
var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');
let c_player = null;
let currentMatchTime = null;
let timerInstance = null;

function startTimer(seconds, container, oncomplete) {
  let startTime, timer, obj, ms = seconds * 1000,
    display = document.getElementById(container);
  obj = {};
  obj.resume = function () {
    startTime = new Date().getTime();
    timer = setInterval(obj.step, 250);
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
      obj.resume = function () {};
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

  if (game.game_over()) return false;

  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  socket.emit('sync_state', game.fen(), game.turn());

  if (timerInstance) {
    timerInstance.pause();
  } else {
    timerInstance = startTimer(Number(currentMatchTime) * 60, "timerDisplay", function () { alert("Time's up!"); });
  }
  updateStatus();
}

function onChange() {
  if (game.game_over()) {
    if (game.in_checkmate()) {
      const winner = game.turn() === 'b' ? 'White' : 'Black';
      socket.emit('game_over', winner);
    }
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  var status = '';
  var moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  } else if (game.in_draw()) {
    status = 'Game over, drawn position';
  } else {
    status = moveColor + ' to move';

    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  $status.html(status);
  $fen.html(game.fen());
  $pgn.html(game.pgn());
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onChange: onChange,
  onSnapEnd: onSnapEnd,
};
board = Chessboard('myBoard', config);

updateStatus();

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
    const clone = button.cloneNode(true);
    button.parentNode.replaceChild(clone, button);
  }

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

const socket = io(
  location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://chess-homepage-production.up.railway.app"
);

socket.on('total_players_count_change', function (totalPlayersCount) {
  $('#total_players').html('Total Players: ' + totalPlayersCount);
});

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
      </div>
  `);

  game.reset();
  board.clear();
  board.start();
  board.orientation(currentPlayer.toLowerCase());
  currentMatchTime = time;

  if (game.turn() === c_player) {
    timerInstance = startTimer(Number(time) * 60, "timerDisplay", function () { alert("Time's up!"); });
  }
});

socket.on('sync_state_from_server', function (fen, turn) {
  game.load(fen);
  game.setTurn(turn);
  board.position(fen);

  if (game.turn() === c_player) {
    if (timerInstance) {
      timerInstance.resume();
    } else {
      timerInstance = startTimer(Number(currentMatchTime) * 60, "timerDisplay", function () { 
        alert("Time's up!"); 
        socket.emit('time_out', c_player);
      });
    }
  } else {
    if (timerInstance) timerInstance.pause();
  }
});

socket.on('game_over_from_server', function (winner) {
  alert(winner + " won the match");
  localStorage.removeItem("matchId");
  window.location.reload();
});

socket.on("restore_game_state", function (fen, turn, matchId) {
  if (timerInstance) {
    timerInstance.pause();
    timerInstance = null;
  }
  game.load(fen);
  board.position(fen);
  board.orientation(turn === "w" ? "white" : "black");
  localStorage.setItem("matchId", matchId);
});

socket.on("invalid_match", function () {
  alert("The match you were trying to reconnect to no longer exists. Starting a new game.");
  localStorage.removeItem("matchId");
  window.location.href = "index_multiplayer.html";
});
