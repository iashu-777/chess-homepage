const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Match = require('../models/Match');  // Assuming this is your match model

// Token authentication middleware
const authenticate = (req, res, next) => {
const token = localStorage.getItem('token');
// Extract token
    if (!token) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, 'mysecretkey123');
    req.user = decoded; // Add user info to request object
    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Stats route
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Aggregate match statistics
    const matchStats = await Match.aggregate([
      { $match: { playerId: userId } },
      {
        $group: {
          _id: "$type",
          games: { $sum: 1 },
          wins: { $sum: { $cond: ["$won", 1, 0] } },
        },
      },
    ]);

    // Process stats for each format
    const formats = ['classical', 'blitz', 'bullet'];
    const formattedStats = formats.reduce((acc, format) => {
      const formatData = matchStats.find((stat) => stat._id === format) || { games: 0, wins: 0 };
      const winRate = formatData.games ? ((formatData.wins / formatData.games) * 100).toFixed(2) : '0.00';
      acc[format] = { games: formatData.games, winRate };
      return acc;
    }, {});

    // Prepare response
    const stats = {
      name: user.username || 'Unknown Player',
      profilePicture:user.profilePicture,
      rating: user.rating || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      draws: user.draws || 0,
      ...formattedStats,
      milestones: [
        { title: "100 Games Played", description: "Congratulations on reaching 100 games!" },
        { title: "Reach 2500 Elo", description: "Next goal: Grandmaster badge." },
      ],
    };

    res.json(stats); // Send the stats as JSON response
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router; // Make sure to export the router