const http = require('http');
const { spawn } = require('child_process');

const PORT = 3000;

// Create a basic HTTP server
const server = http.createServer((req, res) => {
    // Only respond to the '/move' route
    if (req.url.startsWith('/move') && req.method === 'GET') {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const fen = urlParams.get('fen');
        const depth = urlParams.get('depth') || 10;

        console.log(`Received request: fen=${fen}, depth=${depth}`);

        // Ensure Stockfish path is correct
        const stockfishPath = '/app/stockfish/stockfish-ubuntu-x86-64-bmi2';
        const stockfish = spawn(stockfishPath);

        stockfish.stdin.write(`position fen ${fen}\n`);
        stockfish.stdin.write(`go depth ${depth}\n`);

        stockfish.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output); // Log output for debugging

            if (output.includes('bestmove')) {
                const bestMove = output.split('bestmove ')[1].split(' ')[0];

                // Set the response headers for JSON content
                res.writeHead(200, { 'Content-Type': 'application/json' });

                res.end(JSON.stringify({ success: true, bestmove: bestMove }));
                stockfish.kill();
            }
        });

        stockfish.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        stockfish.on('error', (err) => {
            console.error(`Failed to start Stockfish: ${err}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to run Stockfish.' }));
        });
    } else {
        // Handle other routes
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
