const http = require('http');
const { spawn } = require('child_process');
const PORT = 3000;

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/move') && req.method === 'GET') {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const fen = urlParams.get('fen');
        const depth = urlParams.get('depth') || 10;

        console.log(`Received request: fen=${fen}, depth=${depth}`);

        const stockfishPath = '/app/stockfish/stockfish-ubuntu-x86-64-bmi2';
        const stockfish = spawn(stockfishPath);

        // Timeout for hanging responses
        const timeout = setTimeout(() => {
            stockfish.kill();
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Request timed out' }));
        }, 25000); // 25-second timeout

        stockfish.stdin.write(`position fen ${fen}\n`);
        stockfish.stdin.write(`go depth ${depth}\n`);

        stockfish.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);

            if (output.includes('bestmove')) {
                clearTimeout(timeout);
                const bestMove = output.split('bestmove ')[1].split(' ')[0];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, bestmove: bestMove }));
                stockfish.kill();
            }
        });

        stockfish.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
            clearTimeout(timeout);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
        });

        stockfish.on('error', (err) => {
            console.error(`Failed to start Stockfish: ${err}`);
            clearTimeout(timeout);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to run Stockfish.' }));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
