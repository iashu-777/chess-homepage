$(document).ready(function () {
    $('#loginForm').on('submit', function (e) {
        e.preventDefault(); // Prevent default form submission

        const username = $('#username').val().trim(); // Get username input value
        const password = $('#password').val().trim(); // Get password input value

        // Validate that both fields are filled
        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        // Frontend and backend run on the same server, so a relative URL works
        const apiUrl = '/auth/login';

        // Call the login API
        $.ajax({
            url: apiUrl, // Backend login endpoint
            method: 'POST',
            contentType: 'application/json', // Specify JSON format
            data: JSON.stringify({ username, password }), // Send data as JSON
            success: function (response) {
                // If login is successful and a token is returned
                if (response.token) {
                    // Save the token in localStorage for future use
                    localStorage.setItem('token', response.token);

                    // Redirect the user to their dashboard or homepage
                    window.location.href = '/index.html';
                } else {
                    alert('Login failed. Please try again.');
                }
            },
            error: function (error) {
                // Display error message from server
                console.error('Login error:', error.responseJSON);
                alert(error.responseJSON?.error || 'Invalid username or password. Please try again.');
            }
        });
    });
});
