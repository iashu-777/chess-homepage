$(document).ready(function () {
  $("#signupForm").on("submit", function (event) {
    event.preventDefault(); // Prevent default form submission

    const username = $("#username").val();
    const email = $("#email").val();
    const password = $("#password").val();

    const apiUrl = "/auth/signup"; // same-origin backend
    $("#errorMessage, #successMessage").hide();

    $.ajax({
      url: apiUrl,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username, email, password }),
      success: function (response) {
        $("#successMessage").text(response.message).show();
        localStorage.setItem("token", response.token);
        setTimeout(function () {
          window.location.href = "/index.html";
        }, 2000);
      },
      error: function (xhr, status, error) {
        console.error("Error signing up:", xhr.status, xhr.responseText);
        $("#errorMessage")
          .text(xhr.responseJSON?.error || "Signup failed. Please try again.")
          .show();
      },
    });                     
  });
});
