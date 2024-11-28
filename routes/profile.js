$(document).ready(function () {
    const defaultAvatar = "image/default-avatar.png";
    const token = localStorage.getItem('token');

    if (!token) {
        alert('You need to log in first!');
        window.location.href = '/login.html';
        return;
    }

    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/auth/profile'
        : 'https://chess-homepage-production.up.railway.app/auth/profile';

    // Fetch user profile
    $.ajax({
        url: apiUrl,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        success: function (response) {
            console.log('Profile Fetch Success:', response);

            if (response && response.user) {
                // Update the avatar and profile fields
                const userAvatar = response.user.profilePicture || defaultAvatar;
                $("#userAvatar").attr("src", userAvatar);
                localStorage.setItem("profilePicture", userAvatar);

                $('#username').val(response.user.username || '');
                $('#email').val(response.user.email || '');
            } else {
                alert('Profile details are unavailable at the moment.');
            }
        },
        error: function (error) {
            console.error('Profile Fetch Error:', error);
            alert('An error occurred while fetching profile details.');
        }
    });

    // Handle profile update
    $('#profileForm').on('submit', function (event) {
        event.preventDefault();

        const updatedUsername = $('#username').val();
        const updatedEmail = $('#email').val();
        const profilePicture = $('#profilePicture')[0].files[0];
        const formData = new FormData();

        formData.append('username', updatedUsername);
        formData.append('email', updatedEmail);
        if (profilePicture) {
            formData.append('profilePicture', profilePicture);
        }

        const updateUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000/auth/updateProfile'
            : 'https://chess-homepage-production.up.railway.app/auth/updateProfile';

        $.ajax({
            url: updateUrl,
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                console.log('Profile Update Success:', response);
                alert('Profile updated successfully');

                // Update local storage and UI with the new profile picture
                if (response.user.profilePicture) {
                    const newAvatar = response.user.profilePicture;
                    $("#userAvatar").attr("src", newAvatar);
                    localStorage.setItem("profilePicture", newAvatar);
                }
            },
            error: function (error) {
                console.error('Profile Update Error:', error);
                alert('An error occurred while updating your profile.');
            }
        });
    });
});