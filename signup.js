$(document).ready(function () {
    console.log('Document ready'); // Debug log

    $('#signupButton').on('click', function (event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Signup button clicked'); // Debug log

        const username = $('#username').val();
        const email = $('#email').val();
        const password = $('#password').val();

        console.log('User details:', { username, email, password }); // Debug log

        $.ajax({
            url: 'http://localhost:3001/auth/signup', // Use localhost instead of 127.0.0.1
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, email, password }),
            success: function (response) {
                console.log('Signup successful:', response);
                $('#successMessage').text(response.message).show(); // Show success message
                setTimeout(function () {
                    window.location.href = '/login.html'; // Redirect to login page
                }, 2000); // Wait 2 seconds before redirecting
            },
            error: function (error) {
                console.error('Error signing up:', error);
                $('#errorMessage').text('Signup failed. Please try again.').show(); // Show error message
            }
        });
    });
});
