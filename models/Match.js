const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
    player1: { type: String, required: true }, // socket id (white)
    player2: { type: String, required: true }, // socket id (black)
    time: { type: Number, required: true }, // time control in minutes
    fen: { type: String, default: 'start' },
    turn: { type: String, default: 'w' },
    winner: { type: String, default: null }, // 'White' | 'Black' | null (draw / unfinished)
    reason: { type: String, default: null }, // checkmate, draw, timeout, opponent_disconnected
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Match', MatchSchema);
