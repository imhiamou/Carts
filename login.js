const USERS = {
  mermy: { password: "wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const SESSION_KEY = "medieval_pixel_cart_active_user_v1";

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

function tryLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const account = USERS[username];

  if (!account || account.password !== password) {
    loginError.textContent = "Wrong username or password.";
    return;
  }

  const session = {
    username,
    password
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.location.href = "game.html";
}

loginButton.addEventListener("click", tryLogin);
usernameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});
