const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rating: { type: Number, default: 1200 }, // Default Elo rating
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
// Pre-save hook to hash the password before saving it to DB
userSchema.pre('save', async function (next) {
    if (!this.password) {
        throw new Error('Password cannot be null or undefined');
    }
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Add a method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

// Add validation for uniqueness before saving
userSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('username')) {
        const existingUser = await mongoose.models.User.findOne({ username: this.username });
        if (existingUser) {
            throw new Error('Username already exists');
        }
    }
    if (this.isNew || this.isModified('email')) {
        const existingUser = await mongoose.models.User.findOne({ email: this.email });
        if (existingUser) {
            throw new Error('Email already exists');
        }
    }
    next();
});
// Update user rating after a game
userSchema.methods.updateRating = function (opponentRating, result) {
    const k = 32; // K-factor for Elo calculation
    const expectedScore = 1 / (1 + 10 ** ((opponentRating - this.rating) / 400));
    const actualScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
    this.rating += Math.round(k * (actualScore - expectedScore));
    return this.rating;
};

const User = mongoose.model('User', userSchema);
module.exports = User;