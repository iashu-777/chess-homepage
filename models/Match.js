const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    time: { type: Number, required: true }, // Match time control in minutes
    fen: { type: String, default: 'start' }, // Current board state
    turn: { type: String, default: 'w' }, // Whose turn it is
    winner: { type: String, default: null }, // Winner ID
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Match', MatchSchema);
