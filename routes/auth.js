const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/user');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// ---------- Profile picture uploads ----------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_DIR),
        filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (req, file, cb) => {
        const ok = /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype);
        cb(ok ? null : new Error('Only PNG, JPG, GIF or WEBP images are allowed'), ok);
    },
});

function signToken(user) {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function percent(wins, games) {
    return games ? Number(((wins / games) * 100).toFixed(2)) : 0;
}

// ---------- Signup ----------
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const newUser = await User.create({ username, email, password }); // password hashed in model hook
        res.status(201).json({ message: 'User signed up successfully!', token: signToken(newUser) });
    } catch (error) {
        console.error('Error in signup route:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// ---------- Login ----------
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password || ''))) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        res.json({ message: 'Login successful!', token: signToken(user) });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// ---------- Stats ----------
router.get('/stats', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalGames = user.wins + user.losses + user.draws;
        res.json({
            name: user.username,
            profilePicture: user.profilePicture,
            rating: user.rating,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            totalGames,
            winRate: percent(user.wins, totalGames), // plain number, frontend adds the "%"
            classical: { games: user.classicalGames, winRate: percent(user.classicalWins, user.classicalGames) },
            blitz: { games: user.blitzGames, winRate: percent(user.blitzWins, user.blitzGames) },
            bullet: { games: user.bulletGames, winRate: percent(user.bulletWins, user.bulletGames) },
            milestones: [
                { title: '100 Games Played', description: `${totalGames}/100 games`, achieved: totalGames >= 100 },
                { title: 'Reach 2500 Elo', description: 'Unlock the Grandmaster badge.', achieved: user.rating >= 2500 },
            ],
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ---------- Profile ----------
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalGames = user.wins + user.losses + user.draws;
        res.json({
            user: {
                username: user.username,
                email: user.email,
                rating: user.rating,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                milestones: [
                    { id: 1, title: 'First Game', achieved: totalGames > 0 },
                    { id: 2, title: '10 Wins', achieved: user.wins >= 10 },
                ],
                profilePicture: user.profilePicture,
            },
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

router.post('/updateProfile', authenticate, (req, res) => {
    upload.single('profilePicture')(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ error: uploadErr.message });
        try {
            const { username, email } = req.body;
            const updateData = {};
            if (username) updateData.username = username.trim();
            if (email) updateData.email = email.trim().toLowerCase();
            if (req.file) updateData.profilePicture = `/uploads/${req.file.filename}`;

            // Don't let a user take someone else's username/email
            const or = [];
            if (updateData.username) or.push({ username: updateData.username });
            if (updateData.email) or.push({ email: updateData.email });
            if (or.length && (await User.findOne({ _id: { $ne: req.user.id }, $or: or }))) {
                return res.status(400).json({ error: 'Username or email already taken' });
            }

            const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
            if (!user) return res.status(404).json({ error: 'User not found' });

            res.json({ message: 'Profile updated successfully', user });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Something went wrong!' });
        }
    });
});

// JWT is stateless; logout = client deletes the token. Kept for completeness.
router.post('/logout', (req, res) => res.json({ message: 'Successfully logged out' }));

module.exports = router;
