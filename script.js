const music = document.querySelector("#menu-music");
const clickSound = document.querySelector("#click-sound");
const soundToggle = document.querySelector("#sound-toggle");
const soundGlyph = document.querySelector(".sound-glyph");
const titleScreen = document.querySelector(".title-screen");
const status = document.querySelector("#status");
const whoisScreen = document.querySelector("#whois-screen");
const whoisScroll = document.querySelector("#whois-scroll");
let statusTimer;
let autoFrame;
let autoLastTime = 0;
let autoPosition = 0;
let autoScrolling = false;

function playClickSound() {
    if (!clickSound) return;
    clickSound.currentTime = 0;
    clickSound.volume = .7;
    clickSound.play().catch(() => {});
}

function playClickSoundAndThen(action) {
    if (!clickSound) {
        action();
        return;
    }
    clickSound.currentTime = 0;
    clickSound.volume = .7;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        action();
    };
    clickSound.addEventListener("ended", finish, { once: true });
    const playback = clickSound.play();
    if (playback && typeof playback.catch === "function") playback.catch(finish);
    const duration = Number.isFinite(clickSound.duration) && clickSound.duration > 0
        ? Math.min(Math.max(clickSound.duration * 1000 + 35, 160), 900)
        : 320;
    window.setTimeout(finish, duration);
}

function requestLandscapeMode() {
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || "");
    const smallTouchScreen = navigator.maxTouchPoints > 0
        && window.matchMedia("(max-width: 900px) and (hover: none)").matches;
    if (!mobileUserAgent && !smallTouchScreen) return;
    try {
        const lock = screen.orientation?.lock?.("landscape");
        if (lock && typeof lock.catch === "function") lock.catch(() => {});
    } catch {}
}

function startMusic() {
    if (!music || music.muted) return;
    music.play().catch(() => showStatus("Clique em qualquer lugar para iniciar a música"));
}

function showStatus(message) {
    status.textContent = message;
    status.classList.add("is-visible");
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => status.classList.remove("is-visible"), 2600);
}

function stopAutoScroll() {
    autoScrolling = false;
    autoLastTime = 0;
    window.cancelAnimationFrame(autoFrame);
}

function continueAutoScroll(timestamp) {
    if (!autoScrolling) return;
    if (!autoLastTime) autoLastTime = timestamp;
    const elapsed = Math.min(timestamp - autoLastTime, 80);
    autoLastTime = timestamp;
    const maxScroll = whoisScroll.scrollHeight - whoisScroll.clientHeight;
    if (whoisScroll.scrollTop >= maxScroll - 1) {
        whoisScroll.scrollTop = Math.max(0, maxScroll);
        stopAutoScroll();
        return;
    }
    autoPosition += elapsed * .014;
    whoisScroll.scrollTop = autoPosition;
    autoFrame = window.requestAnimationFrame(continueAutoScroll);
}

function startAutoScroll() {
    stopAutoScroll();
    autoScrolling = true;
    autoPosition = whoisScroll.scrollTop;
    autoFrame = window.requestAnimationFrame(continueAutoScroll);
}

function openWhois() {
    whoisScroll.scrollTop = 0;
    titleScreen.setAttribute("aria-hidden", "true");
    whoisScreen.classList.add("is-active");
    whoisScreen.setAttribute("aria-hidden", "false");
    startAutoScroll();
    whoisScroll.focus({ preventScroll: true });
}

function closeWhois() {
    stopAutoScroll();
    whoisScreen.classList.remove("is-active");
    whoisScreen.setAttribute("aria-hidden", "true");
    titleScreen.setAttribute("aria-hidden", "false");
    whoisScroll.scrollTop = 0;
}

function updateSoundButton() {
    const muted = music.muted;
    soundToggle.classList.toggle("is-muted", muted);
    soundToggle.setAttribute("aria-pressed", String(muted));
    soundToggle.setAttribute("aria-label", muted ? "Ligar música" : "Desligar música");
    soundToggle.title = muted ? "Música desligada" : "Música ligada";
    soundGlyph.textContent = muted ? "×" : "♪";
}

soundToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    playClickSound();
    music.muted = !music.muted;
    if (!music.muted) startMusic();
    else showStatus("Música desligada");
    updateSoundButton();
});

document.querySelectorAll(".mc-button").forEach((button) => button.addEventListener("click", () => {
    const screen = button.dataset.screen;
    if (screen === "multiplayer") {
        startMusic();
        playClickSoundAndThen(() => { window.location.href = "bhzinn-xp.html"; });
        return;
    }
    playClickSound();
    startMusic();
    if (screen === "singleplayer") { openWhois(); return; }
    if (screen === "back") { closeWhois(); return; }
    if (screen === "options") { showStatus("não TIMteressa"); return; }
    if (screen === "quit") {
        window.open("", "_self");
        window.close();
        window.setTimeout(() => {
            if (!document.hidden) window.location.replace("about:blank");
        }, 120);
    }
}));

whoisScroll.addEventListener("wheel", stopAutoScroll, { passive: true });
whoisScroll.addEventListener("touchstart", stopAutoScroll, { passive: true });
whoisScroll.addEventListener("touchmove", stopAutoScroll, { passive: true });
document.addEventListener("keydown", (event) => {
    if (!whoisScreen.classList.contains("is-active")) return;
    if (event.key === "Escape") closeWhois();
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) stopAutoScroll();
});
document.addEventListener("pointerdown", () => { requestLandscapeMode(); startMusic(); }, { once: true });
document.addEventListener("keydown", startMusic, { once: true });
music.addEventListener("ended", () => { music.currentTime = 0; startMusic(); });
updateSoundButton();
startMusic();
