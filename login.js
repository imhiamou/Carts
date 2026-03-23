const USERS = {
  mermy: { password: "wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const SESSION_KEY = "medieval_pixel_cart_active_user_v1";
const BOT_ENDPOINT_KEY = "medieval_pixel_cart_bot_endpoint_v1";
const LOGIN_FEEDBACK_QUEUE_KEY = "medieval_pixel_cart_login_feedback_queue_v1";

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const openFeedbackButton = document.getElementById("feedbackButton");
const feedbackModal = document.getElementById("feedbackModal");
const feedbackInput = document.getElementById("feedbackInput");
const feedbackStatus = document.getElementById("feedbackStatus");
const sendFeedbackButton = document.getElementById("sendFeedbackButton");
const closeFeedbackButton = document.getElementById("closeFeedbackButton");

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

function openFeedback() {
  feedbackInput.value = "";
  feedbackStatus.textContent = "";
  feedbackModal.style.display = "flex";
}

function closeFeedback() {
  feedbackModal.style.display = "none";
}

function queueFeedback(payload) {
  const existing = JSON.parse(localStorage.getItem(LOGIN_FEEDBACK_QUEUE_KEY) || "[]");
  existing.push(payload);
  localStorage.setItem(LOGIN_FEEDBACK_QUEUE_KEY, JSON.stringify(existing));
}

async function sendFeedback() {
  const message = feedbackInput.value.trim();
  if (!message) {
    feedbackStatus.textContent = "Please write your bug report or feedback first.";
    return;
  }

  const payload = {
    source: "login-page",
    report: message,
    createdAt: new Date().toISOString()
  };

  const endpoint = localStorage.getItem(BOT_ENDPOINT_KEY);
  if (!endpoint) {
    queueFeedback(payload);
    feedbackStatus.textContent = "Telegram link not configured yet. Feedback saved locally.";
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error("Failed to send feedback");
    }
    feedbackStatus.textContent = "Feedback sent. Thank you!";
    feedbackInput.value = "";
  } catch (error) {
    queueFeedback(payload);
    feedbackStatus.textContent = "Send failed. Feedback saved locally for later.";
  }
}

loginButton.addEventListener("click", tryLogin);
usernameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});

openFeedbackButton.addEventListener("click", openFeedback);
sendFeedbackButton.addEventListener("click", sendFeedback);
closeFeedbackButton.addEventListener("click", closeFeedback);
