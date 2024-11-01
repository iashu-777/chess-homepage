// NOTE: this example uses the chess.js library:
// https://github.com/jhlywa/chess.js
var board1 = Chessboard('myBoard', 'start');

var board = null
var game = new Chess()

function makeRandomMove () {
  var possibleMoves = game.moves()

  // exit if the game is over
  if (game.game_over()) return

  var randomIdx = Math.floor(Math.random() * possibleMoves.length)
  game.move(possibleMoves[randomIdx])
  board.position(game.fen())

  window.setTimeout(makeRandomMove, 1500)
}

board = Chessboard('myBoard', 'start')

window.setTimeout(makeRandomMove, 1500)

// Function for connecting to the Multiplayer project
function playOnline() {
    window.location.href = './multiplayer/index.html';
}

// Function for connecting to the AI Integrated project
function playBots() {
    window.location.href = './AI/index.html';
}

// Load the chessboard for a random vs. random game (using chessboard.js)
document.addEventListener("DOMContentLoaded", function() {
    const boardElement = document.getElementById("chessboard");

    // This code assumes you're using chessboard.js; add your random game logic here
    // Code snippet for chessboard.js initialization if needed:
    // const board = Chessboard('chessboard', 'start');
});
