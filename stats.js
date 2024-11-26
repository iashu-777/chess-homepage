fetch('/api/stats')
    .then((response) => response.json())
    .then((data) => {
        document.getElementById('gamesPlayed').innerText = data.gamesPlayed;
        document.getElementById('winRate').innerText = data.winRate + '%';
    })
    .catch((err) => console.error('Error fetching stats:', err));
