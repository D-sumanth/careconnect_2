document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const errorElement = document.getElementById("login-error");
  const submitButton = form.querySelector("button");

  errorElement.textContent = "";
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Login failed");
    }

    window.location.href =
      result.user.role === "employee" ? "/staff-dashboard.html" : "/";
  } catch (error) {
    errorElement.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
