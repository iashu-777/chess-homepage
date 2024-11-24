$(document).ready(function () {
  console.log("Document ready"); // Debug log

  $("#signupButton").on("click", function (event) {
    event.preventDefault(); // Prevent default form submission
    console.log("Signup button clicked"); // Debug log

    const username = $("#username").val();
    const email = $("#email").val();
    const password = $("#password").val();

    console.log("User details:", { username, email, password }); // Debug log

    // Determine the backend URL based on the environment
    const apiUrl =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001/auth/signup" // Local development
        : "/api/auth/signup"; // Production URL

    $.ajax({
      url: apiUrl,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username, email, password }),
      success: function (response) {
        console.log("Signup successful:", response);
        $("#successMessage").text(response.message).show();
        localStorage.setItem("token", response.token);
        setTimeout(function () {
          window.location.href = "/index.html";
        }, 2000);
      },
      error: function (xhr, status, error) {
        console.error(
          "Error signing up:",
          xhr.status,
          xhr.responseText,
          status,
          error
        );
        $("#errorMessage").text("Signup failed. Please try again.").show();
      },
    });                     
  });
});
