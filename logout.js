// Client-side logout function (e.g., in a separate JavaScript file)
$(document).ready(function() {
    $('#logoutButton').on('click', function() {
        // Remove the JWT token from localStorage (or cookies)
        localStorage.removeItem('authToken'); // If you store JWT token in localStorage
        // Or if you store the token in a cookie, use: document.cookie = "authToken=;expires=Thu, 01 Jan 1970 00:00:00 GMT"; 

        // Redirect the user to the login page
        window.location.href = '/login.html'; // Redirect after logout
    });
});
