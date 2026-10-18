$(function () {
// Fetch stats dynamically using jQuery AJAX
const token = localStorage.getItem('token');
const apiUrl = '/auth/stats';

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
      $('#player-avatar').attr('src', data.profilePicture || 'image/player_avatar.jpeg');
      $('#user-name').text(data.name || 'Unknown Player');
      $('#user-rating').text(`Rating: ${data.rating || 1200} Elo`);
      $('#win-count').text(`Wins: ${data.wins || 0}`);
      $('#loss-count').text(`Losses: ${data.losses || 0}`);
      $('#draw-count').text(`Draws: ${data.draws || 0}`);
      
      // Update stats (server sends numbers, we add the "%")
      $('#total-games').text(`${data.totalGames} total games`);
      $('#win-rate').text(`${data.winRate}% win rate`);
      
      // Update game breakdown
      const formats = ['classical', 'blitz', 'bullet'];
      formats.forEach((format) => {
        const formatData = data[format] || { games: 0, winRate: 0 };
        $(`#${format}-stats`).text(
          `${format.charAt(0).toUpperCase() + format.slice(1)}: ${formatData.games} games | Win rate: ${formatData.winRate}%`
        );
      });
      
      // Update milestones
      const $list = $('#milestone-list').empty();
      (data.milestones || []).forEach((milestone) => {
        const $m = $('<div class="milestone"></div>');
        $m.append($('<h3></h3>').text((milestone.achieved ? '✅ ' : '') + milestone.title));
        $m.append($('<p></p>').text(milestone.description || ''));
        $list.append($m);
      });
    },
    error: function(xhr, status, error) {
      console.error('Error fetching stats:', error);
      if (xhr.status === 401) { // token expired / invalid
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
      }
      alert('Failed to fetch player stats. Please try again later.');
    }
  });
}
});
