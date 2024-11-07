var board1 = Chessboard('myBoard', 'start');
var board = null;
var game = new Chess();

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // only pick up pieces for White
    if (piece.search(/^b/) !== -1) return false;
}

function makeAIMove() {
    // Check if the game is over
    if (game.game_over()) {
        console.log("Game over: no moves possible.");
        return;
    }

    // Log the current FEN string for debugging
    const currentFEN = game.fen();
    console.log("Current FEN: " + currentFEN);

    // Define the API endpoint and parameters
    const apiUrl = `http://localhost:3000/move?fen=${encodeURIComponent(currentFEN)}&depth=6`;

    // Make the GET request to the Stockfish API
    $.ajax({
        url: apiUrl,
        method: "GET",
        dataType: "json",
        success: function (response) {
            console.log("Server response:", response); // Log response for debugging
            
            if (response && response.success && response.bestmove) {
                const bestMove = response.bestmove;
                
                // Make sure bestMove is long enough before calling substring
                if (bestMove.length >= 4) {
                    const fromSquare = bestMove.substring(0, 2);
                    const toSquare = bestMove.substring(2, 4);

                    const move = game.move({
                        from: fromSquare,
                        to: toSquare,
                        promotion: 'q' // promote to queen if applicable
                    });

                    if (move) {
                        // Update the board with the new position
                        board.position(game.fen());
                    } else {
                        console.error("Illegal move attempted: " + bestMove);
                    }
                } else {
                    console.error("Invalid move format: " + bestMove);
                }
            } else {
                console.error("Stockfish API error: unexpected response format", response);
            }
        },
        error: function (xhr) {
            console.error("Error fetching move from Stockfish API: " + xhr.status + " - " + xhr.statusText);
        }
    });
}





function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    // Make AI move for black
    window.setTimeout(makeAIMove, 250);
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen());
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};
board = Chessboard('myBoard', config);
