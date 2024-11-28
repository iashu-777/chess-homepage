const express = require('express');
const User = require('../models/user');
const Match = require('../models/Match');
const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id; // Assuming you use middleware to get `req.user`
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const { wins, losses, draws } = user;
        res.json({ wins, losses, draws });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
