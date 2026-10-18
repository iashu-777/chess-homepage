// Homepage: a demo board that plays random moves (chess.js + chessboard.js)
var game = new Chess();
var board = Chessboard('myBoard', 'start');

function makeRandomMove() {
  if (game.game_over()) {
    game.reset(); // restart the demo instead of stopping forever
  } else {
    var possibleMoves = game.moves();
    game.move(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
  }
  board.position(game.fen());
  window.setTimeout(makeRandomMove, 1500);
}
window.setTimeout(makeRandomMove, 1500);

function playOnline() {
  window.location.href = 'index_multiplayer.html';
}

function playBots() {
  window.location.href = 'index_AI.html';
}
