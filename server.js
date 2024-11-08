const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const fs = require('fs');  // To check file existence and permissions

const app = express();
const PORT = 3000;

// Configure CORS
app.use(cors({
    origin: 'https://prismatic-lamington-297b85.netlify.app', // Replace with your Netlify URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Stockfish binary path
const stockfishPath = '/app/stockfish/stockfish-windows-x86-64.exe';

// Check if Stockfish binary exists and is executable
if (!fs.existsSync(stockfishPath)) {
    console.error(`Stockfish binary not found at ${stockfishPath}`);
} else if (!fs.statSync(stockfishPath).mode & fs.constants.X_OK) {
    console.error(`Stockfish binary found but not executable: ${stockfishPath}`);
}

// Move route handling to Express
app.get('/move', (req, res) => {
    const fen = req.query.fen;
    const depth = req.query.depth || 10;

    // Make sure the Stockfish path is correctly set
    const stockfish = spawn('/app/stockfish/stockfish-windows-x86-64.exe');

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

// Handle undefined routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
