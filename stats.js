fetch('/stats', {
    method: 'GET',
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`, // Or session storage
    },
})
    .then((response) => response.json())
    .then((data) => {
        document.querySelector('#user-name').textContent = data.name || 'Unknown';
        document.querySelector('#win-count').textContent = data.wins || 0;
        document.querySelector('#loss-count').textContent = data.losses || 0;
        document.querySelector('#draw-count').textContent = data.draws || 0;
    })
    .catch((err) => console.error('Error fetching stats:', err));
