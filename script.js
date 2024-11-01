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
