const express = require('express');
const { spawn } = require('child_process');
const app = express();
const PORT = 3000;

app.get('/move', (req, res) => {
    const fen = req.query.fen;
    const depth = req.query.depth || 10;

    // Make sure the Stockfish path is correctly set
    const stockfishPath = './stockfish/stockfish-ubuntu-x86-64-avx512';
    const stockfish = spawn(stockfishPath);

    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${depth}\n`);

    stockfish.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('bestmove')) {
            const bestMove = output.split('bestmove ')[1].split(' ')[0];
            res.json({ success: true, bestmove: bestMove });
            stockfish.kill();
        }
    });

    stockfish.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
    });

    stockfish.on('error', (err) => {
        console.error(`Failed to start Stockfish: ${err}`);
        res.status(500).json({ success: false, error: 'Failed to run Stockfish.' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
