// Simple front-end login/signup using localStorage

const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

// Toggle forms
showSignup.addEventListener("click", () => {
    loginBox.classList.add("hidden");
    signupBox.classList.remove("hidden");
});

showLogin.addEventListener("click", () => {
    signupBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
});

// Signup
signupBtn.addEventListener("click", () => {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const error = document.getElementById("signupError");
    error.textContent = "";

    if (!name || !email || !password) { error.textContent = "All fields required"; return; }

    // Save user in localStorage
    let users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.some(u => u.email === email)) { error.textContent = "Email already exists"; return; }

    users.push({ name, email, password });
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup successful! Please login.");
    signupBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
});

// Login
loginBtn.addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const error = document.getElementById("loginError");
    error.textContent = "";

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        window.location.href = "attendance.php"; // redirect to your system page
    } else {
        error.textContent = "Invalid email or password";
    }
});
