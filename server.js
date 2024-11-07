const http = require('http');
const { spawn } = require('child_process');

// Define the port
const PORT = 3000;

// Create the HTTP server
const server = http.createServer((req, res) => {
    // Increase timeout duration (10 minutes in this case)
    req.setTimeout(600000);  // 10 minutes

    if (req.method === 'GET' && req.url.startsWith('/move')) {
        // Parse the query parameters from the URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        const fen = url.searchParams.get('fen');
        const depth = url.searchParams.get('depth') || 10;

        console.log(`Received request: fen=${fen}, depth=${depth}`);

        // Check if fen is provided, if not return a 400 error
        if (!fen) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'FEN is required' }));
            return;
        }

        // Set the path to your Stockfish binary
        const stockfishPath = '/app/stockfish/stockfish-ubuntu-x86-64-bmi2';
        const stockfish = spawn(stockfishPath);

        // Write the position and depth to Stockfish
        stockfish.stdin.write(`position fen ${fen}\n`);
        stockfish.stdin.write(`go depth ${depth}\n`);

        // Listen for data from Stockfish's stdout
        stockfish.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output); // Log Stockfish output for debugging

            // Check if we have the best move in the output
            if (output.includes('bestmove')) {
                const bestMove = output.split('bestmove ')[1].split(' ')[0];

                // Send the best move as a JSON response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, bestmove: bestMove }));

                // Kill the Stockfish process after we get the best move
                stockfish.kill();
            }
        });

        // Handle any errors from Stockfish
        stockfish.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        stockfish.on('error', (err) => {
            console.error(`Failed to start Stockfish: ${err}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to run Stockfish.' }));
        });

    } else {
        // If the request is not for '/move', return a 404 error
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not Found' }));
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
