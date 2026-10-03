const clickSound = document.querySelector("#click-sound");
const cmdTypeSound = document.querySelector("#cmd-type-sound");
const xpTheme = document.querySelector("#xp-theme");
const xpStartSound = document.querySelector("#xp-start-sound");
const xpOffSound = document.querySelector("#xp-off-sound");
const xpWindow = document.querySelector(".multiplayer-window");
const xpMinimize = document.querySelector("#xp-window-minimize");
const xpMaximize = document.querySelector("#xp-window-maximize");
const xpClose = document.querySelector("#multiplayer-window-close");
const storyScroll = document.querySelector("#multiplayer-scroll");
const xpStartButton = document.querySelector("#xp-start-button");
const xpStartMenu = document.querySelector("#xp-start-menu");
const xpClock = document.querySelector("#xp-clock");
const xpTaskbarWindow = document.querySelector("#xp-taskbar-window");
const xpTaskbarGallery = document.querySelector("#xp-taskbar-gallery");
const xpTaskbarTrash = document.querySelector("#xp-taskbar-trash");
const xpTaskbarCmd = document.querySelector("#xp-taskbar-cmd");
const xpMenuButtons = [...document.querySelectorAll("[data-xp-menu]")];
const xpMenuPopup = document.querySelector("#xp-menu-popup");
const startMenuItems = [...document.querySelectorAll("[data-start-command]")];
const photoButtons = [...document.querySelectorAll(".mp-photo-button")];
const photoGallery = document.querySelector("#photo-gallery");
const photoGalleryWindow = document.querySelector(".photo-gallery-window");
const photoGalleryGrid = document.querySelector("#photo-gallery-grid");
const photoGalleryCount = document.querySelector("#photo-gallery-count");
const photoViewer = document.querySelector("#photo-viewer");
const photoViewerWindow = document.querySelector(".photo-viewer-window");
const photoViewerImage = document.querySelector("#photo-viewer-image");
const photoViewerTitle = document.querySelector("#photo-viewer-title");
const photoViewerName = document.querySelector("#photo-viewer-name");
const photoViewerCount = document.querySelector("#photo-viewer-count");
const trashWindow = document.querySelector("#trash-window");
const cmdWindow = document.querySelector("#cmd-window");
const cmdInput = document.querySelector("#cmd-input");
const cmdOutput = document.querySelector("#cmd-output");
const cmdContent = document.querySelector("#cmd-window-content");

let activeWindow = xpWindow;
let nextLayer = 30;
let cmdFocused = false;
let activePhotoIndex = 0;
let photoZoom = 1;
let slideshowTimer;
let autoFrame;
let autoLastTime = 0;
let autoPosition = 0;
let autoScrolling = true;
let startupSoundPlayed = false;
let xpThemeDelayElapsed = false;
const audioFadeFrames = new WeakMap();

function playTypeSound() {
    if (!cmdTypeSound) return;
    cmdTypeSound.currentTime = 0;
    cmdTypeSound.volume = .62;
    cmdTypeSound.play().catch(() => {});
}

function playClickSound() {
    if (!clickSound) return;
    clickSound.currentTime = 0;
    clickSound.volume = .7;
    clickSound.play().catch(() => {});
}

function playSystemSound(audio) {
    if (!audio) return Promise.resolve(false);
    audio.currentTime = 0;
    audio.volume = .78;
    const playback = audio.play();
    if (!playback || typeof playback.catch !== "function") return Promise.resolve(true);
    return playback.then(() => true).catch(() => false);
}

function fadeAudioIn(audio, targetVolume = .42, duration = 2200) {
    if (!audio) return;
    const previousFrame = audioFadeFrames.get(audio);
    if (previousFrame) window.cancelAnimationFrame(previousFrame);

    audio.volume = 0;
    const startedAt = performance.now();
    const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        audio.volume = targetVolume * progress;
        if (progress < 1) {
            audioFadeFrames.set(audio, window.requestAnimationFrame(step));
        } else {
            audioFadeFrames.delete(audio);
        }
    };

    const playback = audio.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => {});
    audioFadeFrames.set(audio, window.requestAnimationFrame(step));
}

function playStartupSound() {
    if (startupSoundPlayed) return;
    startupSoundPlayed = true;
    void playSystemSound(xpStartSound).then((played) => {
        if (!played) startupSoundPlayed = false;
    });
}

function startXpTheme() {
    if (!xpThemeDelayElapsed || !xpTheme || !xpTheme.paused) return;
    fadeAudioIn(xpTheme, .42, 2400);
}

function isMobileLayout() {
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || "");
    const smallTouchScreen = navigator.maxTouchPoints > 0
        && window.matchMedia("(max-width: 900px) and (hover: none)").matches;
    return mobileUserAgent || smallTouchScreen;
}

async function requestLandscapeMode() {
    if (!isMobileLayout()) return;
    try {
        const lock = screen.orientation?.lock?.("landscape");
        if (lock && typeof lock.catch === "function") await lock;
    } catch {}
}

function maximizeCmdForTyping() {
    if (!isMobileLayout() || !cmdWindow) return;
    if (!cmdWindow.classList.contains("is-maximized")) {
        cmdWindow.classList.add("is-maximized");
        document.querySelector("#cmd-window-maximize").textContent = "❐";
        bringWindowToFront(cmdWindow);
        updateTaskbar();
    }
    void requestLandscapeMode();
}

function focusCmdInput() {
    if (!cmdWindow || !cmdWindow.classList.contains("is-open") || cmdWindow.classList.contains("is-minimized")) return;
    cmdFocused = true;
    maximizeCmdForTyping();
    if (document.activeElement !== cmdInput) cmdInput.focus({ preventScroll: true });
}

function shutdownToMenu() {
    closeMenus();
    let navigated = false;
    const navigate = () => {
        if (navigated) return;
        navigated = true;
        window.location.href = "index.html";
    };
    if (!xpOffSound) {
        navigate();
        return;
    }
    xpOffSound.onended = navigate;
    void playSystemSound(xpOffSound).then((played) => {
        if (!played) navigate();
    });
    window.setTimeout(navigate, 1800);
}

function stopAutoScroll() {
    autoScrolling = false;
    autoLastTime = 0;
    window.cancelAnimationFrame(autoFrame);
}

function startAutoScroll() {
    if (!storyScroll || autoScrolling && autoFrame) return;
    autoScrolling = true;
    autoPosition = storyScroll.scrollTop;
    autoLastTime = 0;
    autoFrame = window.requestAnimationFrame(continueAutoScroll);
}

function continueAutoScroll(timestamp) {
    if (!autoScrolling) return;
    if (!autoLastTime) autoLastTime = timestamp;
    const elapsed = Math.min(timestamp - autoLastTime, 80);
    autoLastTime = timestamp;
    const maxScroll = storyScroll.scrollHeight - storyScroll.clientHeight;
    if (storyScroll.scrollTop >= maxScroll - 1) {
        storyScroll.scrollTop = Math.max(0, maxScroll);
        stopAutoScroll();
        return;
    }
    autoPosition += elapsed * .014;
    storyScroll.scrollTop = autoPosition;
    autoFrame = window.requestAnimationFrame(continueAutoScroll);
}

function closeMenus() {
    [xpMenuPopup, xpStartMenu, document.querySelector("#photo-menu-popup")].forEach((menu) => {
        if (!menu) return;
        menu.classList.remove("is-open");
        menu.setAttribute("aria-hidden", "true");
    });
    [...xpMenuButtons, ...document.querySelectorAll("[data-viewer-menu]")].forEach((button) => {
        button.classList.remove("is-selected");
        button.setAttribute("aria-expanded", "false");
    });
}

function bringWindowToFront(windowRoot) {
    if (!windowRoot) return;
    nextLayer += 1;
    windowRoot.style.zIndex = String(nextLayer);
    activeWindow = windowRoot;
    [xpTaskbarWindow, xpTaskbarGallery, xpTaskbarTrash, xpTaskbarCmd].forEach((button) => button.classList.remove("is-active"));
    if (windowRoot === xpWindow) xpTaskbarWindow.classList.add("is-active");
    if (windowRoot === photoGallery) xpTaskbarGallery.classList.add("is-active");
    if (windowRoot === trashWindow) xpTaskbarTrash.classList.add("is-active");
    if (windowRoot === cmdWindow) xpTaskbarCmd.classList.add("is-active");
}

function updateTaskbar() {
    xpTaskbarWindow.hidden = xpWindow.classList.contains("is-closed");
    xpTaskbarGallery.hidden = !photoGallery.classList.contains("is-open");
    xpTaskbarTrash.hidden = !trashWindow.classList.contains("is-open");
    xpTaskbarCmd.hidden = !cmdWindow.classList.contains("is-open");
}

function visibleWindows() {
    return [
        !xpWindow.classList.contains("is-minimized") && !xpWindow.classList.contains("is-closed") ? xpWindow : null,
        photoGallery.classList.contains("is-open") && !photoGallery.classList.contains("is-minimized") ? photoGallery : null,
        photoViewer.classList.contains("is-open") && !photoViewer.classList.contains("is-minimized") ? photoViewer : null,
        trashWindow.classList.contains("is-open") && !trashWindow.classList.contains("is-minimized") ? trashWindow : null,
        cmdWindow.classList.contains("is-open") && !cmdWindow.classList.contains("is-minimized") ? cmdWindow : null
    ].filter(Boolean);
}

function focusTopWindow() {
    const windows = visibleWindows();
    if (!windows.length) return;
    const top = windows.sort((a, b) => (Number.parseInt(getComputedStyle(a).zIndex, 10) || 0) - (Number.parseInt(getComputedStyle(b).zIndex, 10) || 0)).at(-1);
    bringWindowToFront(top);
}

function minimizeWindow(windowRoot, windowElement = windowRoot) {
    windowRoot.classList.add("is-minimized");
    windowElement.classList.add("is-minimized");
    if (windowRoot === cmdWindow) cmdFocused = false;
    if (activeWindow === windowRoot) focusTopWindow();
    updateTaskbar();
}

function restoreWindow(windowRoot, windowElement = windowRoot) {
    windowRoot.classList.remove("is-minimized");
    windowElement.classList.remove("is-minimized");
    bringWindowToFront(windowRoot);
    updateTaskbar();
}

function toggleMaximize(windowRoot, windowElement, button) {
    if (windowRoot.classList.contains("is-minimized")) {
        restoreWindow(windowRoot, windowElement);
        return;
    }
    bringWindowToFront(windowRoot);
    const maximized = !windowElement.classList.contains("is-maximized");
    windowElement.classList.toggle("is-maximized", maximized);
    button.textContent = maximized ? "❐" : "□";
}

function openGallery() {
    closeMenus();
    renderGallery();
    photoGallery.classList.add("is-open");
    photoGallery.classList.remove("is-minimized", "is-maximized");
    photoGalleryWindow.classList.remove("is-minimized", "is-maximized");
    photoGallery.setAttribute("aria-hidden", "false");
    document.querySelector("#photo-gallery-maximize").textContent = "□";
    bringWindowToFront(photoGallery);
    updateTaskbar();
}

function closeGallery() {
    photoGallery.classList.remove("is-open", "is-minimized", "is-maximized");
    photoGalleryWindow.classList.remove("is-minimized", "is-maximized");
    photoGallery.setAttribute("aria-hidden", "true");
    updateTaskbar();
    if (activeWindow === photoGallery) focusTopWindow();
}

function openTrash() {
    closeMenus();
    trashWindow.classList.add("is-open");
    trashWindow.classList.remove("is-minimized", "is-maximized");
    trashWindow.setAttribute("aria-hidden", "false");
    document.querySelector("#trash-window-maximize").textContent = "□";
    bringWindowToFront(trashWindow);
    updateTaskbar();
}

function closeTrash() {
    trashWindow.classList.remove("is-open", "is-minimized", "is-maximized");
    trashWindow.setAttribute("aria-hidden", "true");
    updateTaskbar();
    if (activeWindow === trashWindow) focusTopWindow();
}

function restoreNotepad() {
    xpWindow.classList.remove("is-closed");
    xpWindow.setAttribute("aria-hidden", "false");
    restoreWindow(xpWindow);
    startAutoScroll();
}

function minimizeNotepad() {
    minimizeWindow(xpWindow);
    stopAutoScroll();
}

function closeNotepad() {
    xpWindow.classList.remove("is-minimized", "is-maximized");
    xpWindow.classList.add("is-closed");
    xpWindow.setAttribute("aria-hidden", "true");
    xpMaximize.textContent = "□";
    stopAutoScroll();
    updateTaskbar();
    if (activeWindow === xpWindow) focusTopWindow();
}

function openCmd() {
    closeMenus();
    cmdFocused = false;
    cmdWindow.classList.add("is-open");
    cmdWindow.classList.remove("is-minimized", "is-maximized");
    cmdWindow.setAttribute("aria-hidden", "false");
    document.querySelector("#cmd-window-maximize").textContent = "□";
    bringWindowToFront(cmdWindow);
    updateTaskbar();
    if (isMobileLayout()) {
        cmdWindow.classList.add("is-maximized");
        document.querySelector("#cmd-window-maximize").textContent = "❐";
        void requestLandscapeMode();
    } else {
        window.requestAnimationFrame(focusCmdInput);
    }
}

function closeCmd() {
    cmdFocused = false;
    cmdWindow.classList.remove("is-open", "is-minimized", "is-maximized");
    cmdWindow.setAttribute("aria-hidden", "true");
    updateTaskbar();
    if (activeWindow === cmdWindow) focusTopWindow();
}

function getFileName(source) {
    const name = source.split("/").pop() || "foto.jpg";
    try { return decodeURIComponent(name); } catch { return name; }
}

function renderGallery() {
    photoGalleryGrid.replaceChildren();
    photoGalleryCount.textContent = `${photoButtons.length} imagens`;
    photoButtons.forEach((button, index) => {
        const sourceImage = button.querySelector("img");
        const source = sourceImage.src;
        const item = document.createElement("button");
        item.className = "photo-gallery-item";
        item.type = "button";
        item.setAttribute("aria-label", `Abrir ${getFileName(source)}`);
        item.innerHTML = `<img src="${source}" alt=""><span>${getFileName(source)}</span>`;
        item.addEventListener("click", () => openPhoto(index));
        photoGalleryGrid.append(item);
    });
}

function updatePhotoZoom() {
    photoViewerImage.style.transform = `scale(${photoZoom})`;
    document.querySelector("#photo-zoom-reset").textContent = `${Math.round(photoZoom * 100)}%`;
}

function showPhoto(index) {
    activePhotoIndex = (index + photoButtons.length) % photoButtons.length;
    const image = photoButtons[activePhotoIndex].querySelector("img");
    const source = image.src;
    const fileName = getFileName(source);
    photoViewerImage.src = source;
    photoViewerImage.alt = image.alt;
    photoViewerTitle.textContent = `${fileName} - VX Player`;
    photoViewerName.textContent = fileName;
    photoViewerCount.textContent = `${activePhotoIndex + 1} de ${photoButtons.length}`;
}

function openPhoto(index) {
    stopSlideshow();
    photoZoom = 1;
    updatePhotoZoom();
    showPhoto(index);
    photoViewer.classList.add("is-open");
    photoViewer.classList.remove("is-minimized", "is-maximized");
    photoViewerWindow.classList.remove("is-minimized", "is-maximized");
    photoViewer.setAttribute("aria-hidden", "false");
    document.querySelector("#photo-viewer-maximize").textContent = "□";
    bringWindowToFront(photoViewer);
}

function closePhoto() {
    stopSlideshow();
    photoViewer.classList.remove("is-open", "is-minimized", "is-maximized");
    photoViewerWindow.classList.remove("is-minimized", "is-maximized");
    photoViewer.setAttribute("aria-hidden", "true");
    if (activeWindow === photoViewer) focusTopWindow();
}

function stopSlideshow() {
    window.clearInterval(slideshowTimer);
    slideshowTimer = undefined;
    const button = document.querySelector("#photo-slideshow");
    button.textContent = "▶ Apresentação";
}

function toggleSlideshow() {
    if (slideshowTimer) { stopSlideshow(); return; }
    document.querySelector("#photo-slideshow").textContent = "❚❚ Pausar";
    slideshowTimer = window.setInterval(() => showPhoto(activePhotoIndex + 1), 3400);
}

function resetCmd() {
    cmdOutput.replaceChildren();
    ["Microsoft Windows XP [Versão 5.1.2600]", "(C) Copyright 1985-2001 Microsoft Corp."].forEach((line) => {
        const element = document.createElement("div");
        element.textContent = line;
        cmdOutput.append(element);
    });
    const spacer = document.createElement("div");
    spacer.className = "cmd-output-spacer";
    cmdOutput.append(spacer);
    cmdInput.value = "";
    resizeCmdInput();
}

function resizeCmdInput() {
    const end = cmdInput.value.length;
    cmdInput.style.width = `${end}ch`;

    // No celular, alterar a largura do input pode mover o cursor para o
    // início. O CMD sempre escreve no fim da linha, então reposicionamos
    // o cursor depois de cada redimensionamento.
    const keepCaretAtEnd = () => {
        if (document.activeElement !== cmdInput) return;
        const currentEnd = cmdInput.value.length;
        cmdInput.setSelectionRange(currentEnd, currentEnd);
    };

    keepCaretAtEnd();
    window.requestAnimationFrame(keepCaretAtEnd);
}

function executeCommand(rawCommand) {
    const command = rawCommand.trim();
    const normalizedCommand = command.toLowerCase();

    if (normalizedCommand === "hidden" || normalizedCommand === "hiddenap") {
        cmdInput.value = "";
        resizeCmdInput();
        window.location.href = "eXit/hidden.html";
        return;
    }

    const output = document.createElement("div");
    output.textContent = `C:\\Documents and Settings\\Ace>${rawCommand}`;
    cmdOutput.append(output);
    if (normalizedCommand === "exit") { closeCmd(); return; }
    if (command.toLowerCase() === "notepad") restoreNotepad();
    else if (command) {
        const first = document.createElement("div");
        first.textContent = `'${command}' não é reconhecido como um comando interno`;
        const second = document.createElement("div");
        second.textContent = "ou externo, um programa operável ou um arquivo em lotes.";
        cmdOutput.append(first, second);
    }
    cmdInput.value = "";
    resizeCmdInput();
    cmdContent.scrollTop = cmdContent.scrollHeight;
    cmdInput.focus({ preventScroll: true });
}

function makeDraggable(windowElement, titlebar) {
    titlebar.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest("button")) return;
        bringWindowToFront(windowElement);
        const parentRect = windowElement.parentElement.getBoundingClientRect();
        const rect = windowElement.getBoundingClientRect();
        windowElement.style.position = "absolute";
        windowElement.style.left = `${rect.left - parentRect.left}px`;
        windowElement.style.top = `${rect.top - parentRect.top}px`;
        windowElement.style.right = "auto";
        windowElement.style.bottom = "auto";
        windowElement.style.width = `${rect.width}px`;
        windowElement.style.height = `${rect.height}px`;
        windowElement.style.transform = "none";
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = rect.left - parentRect.left;
        const startTop = rect.top - parentRect.top;
        const move = (moveEvent) => {
            const maxLeft = Math.max(0, parentRect.width - rect.width);
            const maxTop = Math.max(0, parentRect.height - rect.height - 31);
            windowElement.style.left = `${Math.min(maxLeft, Math.max(0, startLeft + moveEvent.clientX - startX))}px`;
            windowElement.style.top = `${Math.min(maxTop, Math.max(0, startTop + moveEvent.clientY - startY))}px`;
        };
        const stop = () => {
            titlebar.releasePointerCapture?.(event.pointerId);
            titlebar.removeEventListener("pointermove", move);
            titlebar.removeEventListener("pointerup", stop);
            titlebar.removeEventListener("pointercancel", stop);
        };
        titlebar.setPointerCapture?.(event.pointerId);
        titlebar.addEventListener("pointermove", move);
        titlebar.addEventListener("pointerup", stop);
        titlebar.addEventListener("pointercancel", stop);
    });
}

[[xpWindow, xpWindow.querySelector(".xp-titlebar")], [photoGalleryWindow, photoGalleryWindow.querySelector(".photo-gallery-titlebar")], [photoViewerWindow, photoViewerWindow.querySelector(".photo-viewer-titlebar")], [trashWindow, trashWindow.querySelector(".trash-window-titlebar")], [cmdWindow, cmdWindow.querySelector(".cmd-titlebar")]].forEach(([root, titlebar]) => {
    root.addEventListener("pointerdown", () => bringWindowToFront(root));
    makeDraggable(root, titlebar);
});

xpMinimize.addEventListener("click", () => { playClickSound(); minimizeNotepad(); });
xpMaximize.addEventListener("click", () => { playClickSound(); toggleMaximize(xpWindow, xpWindow, xpMaximize); });
xpClose.addEventListener("click", () => { playClickSound(); closeNotepad(); });
document.querySelector("#photo-gallery-close").addEventListener("click", () => { playClickSound(); closeGallery(); });
document.querySelector("#photo-gallery-minimize").addEventListener("click", () => { playClickSound(); minimizeWindow(photoGallery, photoGalleryWindow); });
document.querySelector("#photo-gallery-maximize").addEventListener("click", () => { playClickSound(); toggleMaximize(photoGallery, photoGalleryWindow, document.querySelector("#photo-gallery-maximize")); });
document.querySelector("#trash-window-close").addEventListener("click", () => { playClickSound(); closeTrash(); });
document.querySelector("#trash-window-minimize").addEventListener("click", () => { playClickSound(); minimizeWindow(trashWindow); });
document.querySelector("#trash-window-maximize").addEventListener("click", () => { playClickSound(); toggleMaximize(trashWindow, trashWindow, document.querySelector("#trash-window-maximize")); });
document.querySelector("#cmd-window-close").addEventListener("click", () => { playClickSound(); closeCmd(); });
document.querySelector("#cmd-window-minimize").addEventListener("click", () => { playClickSound(); minimizeWindow(cmdWindow); });
document.querySelector("#cmd-window-maximize").addEventListener("click", () => { playClickSound(); toggleMaximize(cmdWindow, cmdWindow, document.querySelector("#cmd-window-maximize")); });

xpStartButton.addEventListener("click", () => { playClickSound(); const open = !xpStartMenu.classList.contains("is-open"); closeMenus(); if (open) { xpStartMenu.classList.add("is-open"); xpStartMenu.setAttribute("aria-hidden", "false"); nextLayer += 1; xpStartMenu.style.zIndex = String(nextLayer); } });
startMenuItems.forEach((button) => button.addEventListener("click", () => {
    playClickSound();
    closeMenus();
    const command = button.dataset.startCommand;
    if (command === "photos" || command === "images") openGallery();
    if (command === "notepad") restoreNotepad();
    if (command === "trash") openTrash();
    if (command === "cmd") openCmd();
    if (command === "shutdown") shutdownToMenu();
}));

document.querySelector("#xp-trash-icon").addEventListener("click", () => { playClickSound(); openTrash(); });
document.querySelector("#xp-gallery-icon").addEventListener("click", () => { playClickSound(); openGallery(); });
document.querySelector("#xp-notepad-icon").addEventListener("click", () => { playClickSound(); restoreNotepad(); });
xpTaskbarWindow.addEventListener("click", () => { playClickSound(); xpWindow.classList.contains("is-closed") || xpWindow.classList.contains("is-minimized") ? restoreNotepad() : activeWindow === xpWindow ? minimizeNotepad() : bringWindowToFront(xpWindow); });
xpTaskbarGallery.addEventListener("click", () => { playClickSound(); !photoGallery.classList.contains("is-open") || photoGallery.classList.contains("is-minimized") ? openGallery() : activeWindow === photoGallery ? closeGallery() : bringWindowToFront(photoGallery); });
xpTaskbarTrash.addEventListener("click", () => { playClickSound(); !trashWindow.classList.contains("is-open") || trashWindow.classList.contains("is-minimized") ? openTrash() : activeWindow === trashWindow ? closeTrash() : bringWindowToFront(trashWindow); });
xpTaskbarCmd.addEventListener("click", () => { playClickSound(); !cmdWindow.classList.contains("is-open") || cmdWindow.classList.contains("is-minimized") ? openCmd() : activeWindow === cmdWindow ? minimizeWindow(cmdWindow) : bringWindowToFront(cmdWindow); });

document.querySelector("#xp-quick-notepad").addEventListener("click", () => { playClickSound(); restoreNotepad(); });
document.querySelector("#xp-quick-gallery").addEventListener("click", () => { playClickSound(); openGallery(); });
document.querySelector("#xp-quick-trash").addEventListener("click", () => { playClickSound(); openTrash(); });

xpMenuButtons.forEach((button) => button.addEventListener("click", () => { playClickSound(); closeMenus(); xpMenuPopup.classList.add("is-open"); xpMenuPopup.setAttribute("aria-hidden", "false"); button.classList.add("is-selected"); }));
document.querySelectorAll("[data-xp-command]").forEach((button) => button.addEventListener("click", () => { playClickSound(); closeMenus(); if (button.dataset.xpCommand === "top") { storyScroll.scrollTop = 0; startAutoScroll(); } if (button.dataset.xpCommand === "photos") openGallery(); }));
document.querySelectorAll("[data-viewer-menu]").forEach((button) => button.addEventListener("click", () => { playClickSound(); const menu = document.querySelector("#photo-menu-popup"); closeMenus(); menu.classList.add("is-open"); menu.setAttribute("aria-hidden", "false"); button.classList.add("is-selected"); }));
document.querySelectorAll("[data-viewer-command]").forEach((button) => button.addEventListener("click", () => { closeMenus(); if (button.dataset.viewerCommand === "fit") { photoZoom = 1; updatePhotoZoom(); } if (button.dataset.viewerCommand === "actual") { photoZoom = 1.35; updatePhotoZoom(); } if (button.dataset.viewerCommand === "download") { const link = document.createElement("a"); link.href = photoViewerImage.src; link.download = getFileName(photoViewerImage.src); link.click(); } }));

document.querySelector("#photo-viewer-close").addEventListener("click", () => { playClickSound(); closePhoto(); });
document.querySelector("#photo-viewer-minimize").addEventListener("click", () => { playClickSound(); minimizeWindow(photoViewer, photoViewerWindow); });
document.querySelector("#photo-viewer-maximize").addEventListener("click", () => { playClickSound(); toggleMaximize(photoViewer, photoViewerWindow, document.querySelector("#photo-viewer-maximize")); });
document.querySelector("#photo-prev").addEventListener("click", () => showPhoto(activePhotoIndex - 1));
document.querySelector("#photo-next").addEventListener("click", () => showPhoto(activePhotoIndex + 1));
document.querySelector("#photo-zoom-out").addEventListener("click", () => { photoZoom = Math.max(.6, photoZoom - .15); updatePhotoZoom(); });
document.querySelector("#photo-zoom-in").addEventListener("click", () => { photoZoom = Math.min(2.4, photoZoom + .15); updatePhotoZoom(); });
document.querySelector("#photo-zoom-reset").addEventListener("click", () => { photoZoom = 1; updatePhotoZoom(); });
document.querySelector("#photo-slideshow").addEventListener("click", toggleSlideshow);
photoViewerImage.addEventListener("dblclick", () => { photoZoom = photoZoom === 1 ? 1.35 : 1; updatePhotoZoom(); });
photoViewer.addEventListener("click", (event) => { if (event.target === photoViewer) closePhoto(); });
photoGallery.addEventListener("click", (event) => { if (event.target === photoGallery) closeGallery(); });

cmdInput.addEventListener("input", resizeCmdInput);
cmdInput.addEventListener("input", playTypeSound);
cmdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        playTypeSound();
        executeCommand(cmdInput.value);
    }
});
cmdWindow.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    focusCmdInput();
});
cmdInput.addEventListener("focus", () => {
    cmdFocused = true;
    maximizeCmdForTyping();
    cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length);
});
document.addEventListener("keydown", (event) => {
    if (cmdFocused && cmdWindow.classList.contains("is-open") && !cmdWindow.classList.contains("is-minimized") && event.target !== cmdInput && !event.target.closest?.("button, input, textarea, select")) {
        if (event.key === "Enter") {
            event.preventDefault();
            executeCommand(cmdInput.value);
            return;
        }

        if (event.key === "Backspace") {
            event.preventDefault();
            playTypeSound();
            cmdInput.value = cmdInput.value.slice(0, -1);
            resizeCmdInput();
            return;
        }

        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            playTypeSound();
            cmdInput.value += event.key;
            resizeCmdInput();
            return;
        }
    }

    if (event.key === "Escape" && photoViewer.classList.contains("is-open")) closePhoto();
});

storyScroll.addEventListener("wheel", stopAutoScroll, { passive: true });
storyScroll.addEventListener("touchstart", stopAutoScroll, { passive: true });
storyScroll.addEventListener("touchmove", stopAutoScroll, { passive: true });
document.addEventListener("pointerdown", (event) => {
    if (!cmdWindow.contains(event.target)) cmdFocused = false;
    const inside = [xpStartMenu, xpStartButton, document.querySelector(".xp-menubar"), document.querySelector(".photo-viewer-menubar")].some((root) => root?.contains(event.target));
    if (!inside) closeMenus();
});
document.addEventListener("selectstart", (event) => { if (event.target.closest(".story-scroll, .photo-gallery-window, .photo-viewer-status, .trash-window-content")) event.preventDefault(); });
document.addEventListener("contextmenu", (event) => { if (event.target.closest(".story-scroll, .photo-gallery-window, .photo-viewer-status, .trash-window-content")) event.preventDefault(); });

document.querySelectorAll("[data-preferred-src]").forEach((icon) => { const fallback = icon.src; icon.addEventListener("error", () => { icon.src = fallback; }, { once: true }); icon.src = icon.dataset.preferredSrc; });
function updateClock() { xpClock.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }); }
updateClock();
window.setInterval(updateClock, 1000);
updateTaskbar();
resizeCmdInput();
startAutoScroll();
playStartupSound();
window.setTimeout(() => {
    xpThemeDelayElapsed = true;
    startXpTheme();
}, 5000);
document.addEventListener("pointerdown", () => {
    playStartupSound();
    startXpTheme();
});
