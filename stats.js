fetch('/stats', {
    method: 'GET',
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
})
    .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    })
    .then((data) => {
        // Update player info
        document.querySelector('#user-name').textContent = data.name || 'Unknown';
        document.querySelector('#user-rating').textContent = `Rating: ${data.rating || 0} Elo`;
        document.querySelector('#win-count').textContent = `Wins: ${data.wins || 0}`;
        document.querySelector('#loss-count').textContent = `Losses: ${data.losses || 0}`;
        document.querySelector('#draw-count').textContent = `Draws: ${data.draws || 0}`;

        // Update stats
        const totalGames = data.wins + data.losses + data.draws;
        document.querySelector('#total-games').textContent = `${totalGames} total games`;
        const winRate = totalGames ? ((data.wins / totalGames) * 100).toFixed(2) : 0;
        document.querySelector('#win-rate').textContent = `${winRate}% win rate`;

        // Update game breakdown
        document.querySelector('#classical-stats').textContent = `Classical: ${data.classical.games || 0} games | Win rate: ${data.classical.winRate || 0}%`;
        document.querySelector('#blitz-stats').textContent = `Blitz: ${data.blitz.games || 0} games | Win rate: ${data.blitz.winRate || 0}%`;
        document.querySelector('#bullet-stats').textContent = `Bullet: ${data.bullet.games || 0} games | Win rate: ${data.bullet.winRate || 0}%`;

        // Update milestones
        const milestoneElement = document.querySelector('#milestone-1');
        milestoneElement.querySelector('h3').textContent = data.milestones[0].title || 'No milestone';
        milestoneElement.querySelector('p').textContent = data.milestones[0].description || 'No milestone description';
    })
    .catch((err) => console.error('Error fetching stats:', err));
