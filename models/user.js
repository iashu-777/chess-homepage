const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    rating: { type: Number, default: 1200 }, // Default Elo rating
    // A new user starts with zero games (pehle yahan fake numbers default the)
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    classicalGames: { type: Number, default: 0 },
    classicalWins: { type: Number, default: 0 },
    blitzGames: { type: Number, default: 0 },
    blitzWins: { type: Number, default: 0 },
    bulletGames: { type: Number, default: 0 },
    bulletWins: { type: Number, default: 0 },
    profilePicture: { type: String, default: null },
});

// Hash the password whenever it is set or changed
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

// Elo update after a game
userSchema.methods.updateRating = function (opponentRating, result) {
    const k = 32;
    const expectedScore = 1 / (1 + 10 ** ((opponentRating - this.rating) / 400));
    const actualScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
    this.rating += Math.round(k * (actualScore - expectedScore));
    return this.rating;
};

module.exports = mongoose.model('User', userSchema);
