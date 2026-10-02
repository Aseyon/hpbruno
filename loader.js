(() => {
    const loader = document.querySelector("#site-loader");
    const progress = document.querySelector("#site-loader-progress");
    const detail = document.querySelector("#site-loader-detail");
    if (!loader || !progress || !detail) return;

    const images = [...document.images];
    const needsAppReady = Boolean(document.querySelector("#game"));
    const total = Math.max(1, images.length + (needsAppReady ? 1 : 0));
    let completed = images.filter((image) => image.complete).length;
    let appReady = !needsAppReady;
    let finished = false;

    const updateProgress = () => {
        const done = completed + (appReady ? 1 : 0);
        const percent = Math.min(100, Math.round((done / total) * 100));
        progress.style.width = `${percent}%`;
        detail.textContent = `${percent}%`;
    };

    const waitForImage = (image) => {
        if (image.complete) return Promise.resolve();

        return new Promise((resolve) => {
            let settled = false;
            const settle = () => {
                if (settled) return;
                settled = true;
                completed += 1;
                updateProgress();
                resolve();
            };

            image.addEventListener("load", settle, { once: true });
            image.addEventListener("error", settle, { once: true });
        });
    };

    const imagesReady = Promise.all(images.map(waitForImage));
    const fontsReady = document.fonts?.ready || Promise.resolve();
    const pageReady = new Promise((resolve) => {
        if (document.readyState === "complete") resolve();
        else window.addEventListener("load", resolve, { once: true });
    });
    const applicationReady = needsAppReady
        ? new Promise((resolve) => {
            window.addEventListener("site:app-ready", () => {
                appReady = true;
                updateProgress();
                resolve();
            }, { once: true });
        })
        : Promise.resolve();

    updateProgress();

    Promise.all([imagesReady, fontsReady, pageReady, applicationReady]).then(() => {
        if (finished) return;
        finished = true;
        progress.style.width = "100%";
        detail.textContent = "100%";
        window.requestAnimationFrame(() => {
            loader.classList.add("is-hidden");
            window.setTimeout(() => loader.remove(), 240);
        });
    });
})();
