const express = require("express");
const { spawn } = require("child_process");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Configure CORS
app.use(
  cors({
    origin: "https://prismatic-lamington-297b85.netlify.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Stockfish binary path
const stockfishPath = "/app/stockfish-ubuntu-x86-64-bmi2";

// Check if Stockfish binary exists and is executable
if (!fs.existsSync(stockfishPath)) {
  console.error(`Stockfish binary not found at ${stockfishPath}`);
} else if (!(fs.statSync(stockfishPath).mode & fs.constants.X_OK)) {
  console.error(`Stockfish binary found but not executable: ${stockfishPath}`);
}

app.get("/move", (req, res) => {
  const fen = req.query.fen;
  const depth = req.query.depth || 10;

  // Run Stockfish with FEN and depth commands using spawn
  const stockfish = spawn(stockfishPath);

  let output = "";

  // Collect data from Stockfish output
  stockfish.stdout.on("data", (data) => {
    output += data.toString();
  });

  // Handle error output from Stockfish
  stockfish.stderr.on("data", (data) => {
    console.error(`Stockfish error output: ${data}`);
  });

  // Detect when Stockfish process ends
  stockfish.on("close", (code) => {
    if (code !== 0) {
      console.error(`Stockfish process exited with code ${code}`);
      return res.status(500).json({ success: false, error: "Stockfish process failed." });
    }

    // Process Stockfish output to find the best move
    if (output.includes("bestmove")) {
      const bestMove = output.split("bestmove ")[1].split(" ")[0];
      return res.json({ success: true, bestmove: bestMove });
    } else {
      return res.status(500).json({ success: false, error: "Best move not found in Stockfish output." });
    }
  });

  // Send FEN and depth commands to Stockfish
  stockfish.stdin.write(`position fen ${fen}\n`);
  stockfish.stdin.write(`go depth ${depth}\n`);
  stockfish.stdin.end();
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
