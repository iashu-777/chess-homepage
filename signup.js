$(document).ready(function () {
    console.log('Document ready'); // Debug log

    $('#signupButton').on('click', function (event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Signup button clicked'); // Debug log

        const username = $('#username').val();
        const email = $('#email').val();
        const password = $('#password').val();

        console.log('User details:', { username, email, password }); // Debug log

        // Determine the backend URL based on the environment
const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
? 'http://localhost:3001/auth/signup'  // Local development
: 'https://chess-homepage-production.up.railway.app/auth/signup';  // Production URL

        $.ajax({
            url: apiUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, email, password }),
            success: function (response) {
                console.log('Signup successful:', response);
                $('#successMessage').text(response.message).show(); // Show success message
                localStorage.setItem('token', response.token); // Store JWT token
                setTimeout(function () {
                    window.location.href = '/index.html'; // Redirect to homepage
                }, 2000); // Wait 2 seconds before redirecting
            },
            error: function (error) {
                console.error('Error signing up:', error);
                $('#errorMessage').text('Signup failed. Please try again.').show(); // Show error message
            }
        });
    });
});
