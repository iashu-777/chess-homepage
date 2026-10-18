// Same-origin connection: works on localhost and later on any deployed domain without code change
const socket = io();

var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');
let c_player = null;        // 'w' or 'b'
let currentMatchTime = null; // minutes
let timerInstance = null;
let gameFinished = false;

// ---------- Timer ----------
function startTimer(seconds, container, oncomplete) {
  let startTime, timer, ms = seconds * 1000;
  const display = document.getElementById(container);
  const obj = {};
  obj.resume = function () {
    startTime = Date.now();
    clearInterval(timer);
    timer = setInterval(obj.step, 250);
  };
  obj.pause = function () {
    ms = obj.step();
    clearInterval(timer);
  };
  obj.step = function () {
    const now = Math.max(0, ms - (Date.now() - startTime));
    const m = Math.floor(now / 60000);
    let s = Math.floor(now / 1000) % 60;
    s = (s < 10 ? '0' : '') + s;
    if (display) display.innerHTML = m + ':' + s;
    if (now === 0) {
      clearInterval(timer);
      obj.resume = function () {};
      if (oncomplete) oncomplete();
    }
    return now;
  };
  obj.resume();
  return obj;
}

function onMyTimeUp() {
  if (gameFinished) return;
  gameFinished = true;
  socket.emit('time_out');
}

// ---------- Board ----------
function onDragStart(source, piece) {
  if (gameFinished || c_player === null) return false;
  if (game.turn() !== c_player) return false;
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  var move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';

  socket.emit('sync_state', game.fen(), game.turn());
  if (timerInstance) timerInstance.pause(); // my move done, my clock stops
  updateStatus();

  // Only the player who made the final move reports the result (avoids double game_over)
  if (game.game_over()) {
    const result = game.in_checkmate()
      ? { winner: c_player === 'w' ? 'White' : 'Black', reason: 'checkmate' }
      : { winner: null, reason: 'draw' };
    socket.emit('game_over', result);
    finishGame(result);
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  var moveColor = game.turn() === 'b' ? 'Black' : 'White';
  var status;
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  } else if (game.in_draw()) {
    status = 'Game over, drawn position';
  } else {
    status = moveColor + ' to move';
    if (game.in_check()) status += ', ' + moveColor + ' is in check';
  }
  $status.html(status);
  $fen.html(game.fen());
  $pgn.html(game.pgn());
}

function resultText(result) {
  const reasons = {
    checkmate: 'by checkmate',
    timeout: 'on time',
    opponent_disconnected: '(opponent left the game)',
  };
  if (!result || !result.winner) return 'Game drawn';
  return result.winner + ' won ' + (reasons[result.reason] || '');
}

function finishGame(result) {
  gameFinished = true;
  if (timerInstance) timerInstance.pause();
  // small delay so the last move is visible before the alert blocks the page
  setTimeout(function () {
    alert(resultText(result));
    window.location.reload();
  }, 300);
}

var board = Chessboard('myBoard', {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
});
updateStatus();

// ---------- Lobby buttons ----------
$('.timer-button').on('click', function () {
  socket.emit('want_to_play', Number($(this).data('time')));
  $('#main-element').hide();
  $('#waiting_text_p').show();
});

// ---------- Socket events ----------
socket.on('total_players_count_change', function (count) {
  $('#total_players').html('Total Players: ' + count);
});

socket.on('match_made', function (color, time, matchId) {
  c_player = color;
  currentMatchTime = Number(time);
  gameFinished = false;
  $('#main-element').show();
  $('#waiting_text_p').hide();

  const currentPlayer = color === 'b' ? 'Black' : 'White';
  $('#buttonsParent').html(
    '<p id="youArePlayingAs">You are Playing as ' + currentPlayer + '</p>' +
    '<div class="flex-row"><p>Your Timer: <span id="timerDisplay">' + time + ':00</span></p></div>'
  );

  game.reset();
  board.start();
  board.orientation(currentPlayer.toLowerCase());
  updateStatus();

  // White moves first, so White's clock starts now
  if (game.turn() === c_player) {
    timerInstance = startTimer(currentMatchTime * 60, 'timerDisplay', onMyTimeUp);
  }
});

socket.on('sync_state_from_server', function (fen) {
  game.load(fen); // FEN already contains whose turn it is
  board.position(fen);
  updateStatus();

  if (game.game_over()) return; // opponent will send game_over

  if (game.turn() === c_player) {
    if (timerInstance) timerInstance.resume();
    else timerInstance = startTimer(currentMatchTime * 60, 'timerDisplay', onMyTimeUp);
  } else if (timerInstance) {
    timerInstance.pause();
  }
});

socket.on('game_over_from_server', function (result) {
  if (gameFinished && result && result.reason !== 'timeout') return;
  finishGame(result);
});

socket.on('server_error', function (msg) {
  alert(msg);
  window.location.reload();
});

socket.on('disconnect', function () {
  if (c_player && !gameFinished) {
    $('#disconnectionMessage').text('Server se connection toot gaya. Page reload karo.');
    $('#disconnectionModal').show();
  }
});
