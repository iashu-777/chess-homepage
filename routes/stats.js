router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id; // Assuming middleware populates req.user
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

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

        const stats = {
            name: user.name,
            rating: user.rating,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            classical: matchStats.find((stat) => stat._id === 'classical') || { games: 0, winRate: 0 },
            blitz: matchStats.find((stat) => stat._id === 'blitz') || { games: 0, winRate: 0 },
            bullet: matchStats.find((stat) => stat._id === 'bullet') || { games: 0, winRate: 0 },
            milestones: [
                { title: "100 Games Played", description: "Congratulations on reaching 100 games!" },
                { title: "Reach 2500 Elo", description: "Next goal: Grandmaster badge." },
            ],
        };

        res.json(stats);
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
