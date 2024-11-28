const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: null // Default value for users without a profile picture
    }
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

const User = mongoose.model('User', userSchema);
module.exports = User;