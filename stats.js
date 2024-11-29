// // Fetch stats dynamically
// const token = localStorage.getItem('token');
// console.log(token)
// if (!token) {
//   alert('Please log in first!');
//   window.location.href = '/login.html'; // Redirect to login page
// } else {
//   fetch('/auth/stats', {
//     method: 'GET',
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   })
//     .then((response) => {
//         if (!response.ok) throw new Error('Failed to fetch stats');
//         return response.json();
//     })
//     .then((data) => {
//         // Update player info
//         document.getElementById('player-avatar').textContent = data.avatar || 'image/player_avatar.jpeg';

//         document.querySelector('#user-name').textContent = data.name || 'Unknown Player';
//         document.querySelector('#user-rating').textContent = `Rating: ${data.rating || 0} Elo`;
//         document.querySelector('#win-count').textContent = `Wins: ${data.wins || 0}`;
//         document.querySelector('#loss-count').textContent = `Losses: ${data.losses || 0}`;
//         document.querySelector('#draw-count').textContent = `Draws: ${data.draws || 0}`;

//         // Update stats
//         const totalGames = data.wins + data.losses + data.draws;
//         document.querySelector('#total-games').textContent = `${totalGames} total games`;
//         const winRate = totalGames ? ((data.wins / totalGames) * 100).toFixed(2) : '0.00';
//         document.querySelector('#win-rate').textContent = `${winRate}% win rate`;

//         // Update game breakdown
//         const formats = ['classical', 'blitz', 'bullet'];
//         formats.forEach((format) => {
//             const formatData = data[format] || { games: 0, winRate: '0.00' };
//             document.querySelector(`#${format}-stats`).textContent = 
//                 `${format.charAt(0).toUpperCase() + format.slice(1)}: ${formatData.games} games | Win rate: ${formatData.winRate}%`;
//         });

//         // Update milestones
//         const milestones = data.milestones || [];
//         milestones.forEach((milestone, index) => {
//             const milestoneElement = document.querySelector(`#milestone-${index + 1}`);
//             if (milestoneElement) {
//                 milestoneElement.querySelector('h3').textContent = milestone.title || 'No milestone';
//                 milestoneElement.querySelector('p').textContent = milestone.description || 'No milestone description';
//             }
//         });
//     })
//     .catch((err) => {
//         console.error('Error fetching stats:', err);
//         alert('Failed to fetch player stats. Please try again later.');
//     });
// }


// Fetch stats dynamically using jQuery AJAX
const token = localStorage.getItem('token');
console.log(token);
const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/auth/stats'
        : 'https://chess-homepage-production.up.railway.app/auth/stats';

if (!token) {
  alert('Please log in first!');
  window.location.href = '/login.html'; // Redirect to login page
} else {
  $.ajax({
    url: apiUrl,
    type: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    success: function(data) {
      // Update player info
      $('#player-avatar').attr('src', data.avatar || 'image/player_avatar.jpeg');
      $('#user-name').text(data.name || 'Unknown Player');
      $('#user-rating').text(`Rating: ${data.rating || 0} Elo`);
      $('#win-count').text(`Wins: ${data.wins || 0}`);
      $('#loss-count').text(`Losses: ${data.losses || 0}`);
      $('#draw-count').text(`Draws: ${data.draws || 0}`);
      
      // Update stats
      const totalGames = data.wins + data.losses + data.draws;
      $('#total-games').text(`${totalGames} total games`);
      const winRate = totalGames ? ((data.wins / totalGames) * 100).toFixed(2) : '0.00';
      $('#win-rate').text(`${winRate}% win rate`);
      
      // Update game breakdown
      const formats = ['classical', 'blitz', 'bullet'];
      formats.forEach((format) => {
        const formatData = data[format] || { games: 0, winRate: '0.00' };
        $(`#${format}-stats`).text(
          `${format.charAt(0).toUpperCase() + format.slice(1)}: ${formatData.games} games | Win rate: ${formatData.winRate}%`
        );
      });
      
      // Update milestones
      const milestones = data.milestones || [];
      milestones.forEach((milestone, index) => {
        const milestoneElement = $(`#milestone-${index + 1}`);
        if (milestoneElement.length) {
          milestoneElement.find('h3').text(milestone.title || 'No milestone');
          milestoneElement.find('p').text(milestone.description || 'No milestone description');
        }
      });
    },
    error: function(xhr, status, error) {
      console.error('Error fetching stats:', error);
      alert('Failed to fetch player stats. Please try again later.');
    }
  });
}