const USERS = {
  mermy: { password: "wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const SESSION_KEY = "medieval_pixel_cart_active_user_v1";
const TELEGRAM_BOT_TOKEN = "8799580976:AAHTYpiZZSKRNrhwRh0wqXHsm4rET9Og_vE";
const TELEGRAM_CHAT_ID_KEY = "medieval_pixel_cart_bot_chat_id_v1";
const LOGIN_FEEDBACK_QUEUE_KEY = "medieval_pixel_cart_login_feedback_queue_v1";
const TELEGRAM_FALLBACK_CHAT_ID = "6802357894";

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

async function detectTelegramChatId() {
  const existing = localStorage.getItem(TELEGRAM_CHAT_ID_KEY);
  if (existing) return existing;

  const updatesResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=10`);
  if (!updatesResp.ok) {
    throw new Error("Unable to read Telegram updates");
  }

  const updatesJson = await updatesResp.json();
  const updates = Array.isArray(updatesJson.result) ? updatesJson.result : [];
  const latest = updates.reverse().find(item => item?.message?.chat?.id);
  if (!latest) {
    localStorage.setItem(TELEGRAM_CHAT_ID_KEY, TELEGRAM_FALLBACK_CHAT_ID);
    return TELEGRAM_FALLBACK_CHAT_ID;
  }

  const chatId = String(latest.message.chat.id);
  localStorage.setItem(TELEGRAM_CHAT_ID_KEY, chatId);
  return chatId;
}

async function sendTelegramMessage(text) {
  const chatId = await detectTelegramChatId();
  if (!chatId) {
    throw new Error("No Telegram chat found yet. Send /start or any message to the bot first.");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    throw new Error("Telegram request failed with status " + response.status);
  }
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

  const telegramText =
    "LOGIN FEEDBACK\n" +
    `Time: ${payload.createdAt}\n` +
    `Message: ${payload.report}`;

  try {
    await sendTelegramMessage(telegramText);
    feedbackStatus.textContent = "Feedback sent. Thank you!";
    feedbackInput.value = "";
  } catch (error) {
    queueFeedback(payload);
    feedbackStatus.textContent = error.message.includes("No Telegram chat found")
      ? "No bot chat found yet. Send a message to @Mermygame_bot first. Feedback saved locally."
      : "Send failed. Feedback saved locally for later.";
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
