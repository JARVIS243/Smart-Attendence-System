// Shared by index.html and app.html.

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

let deferredPrompt = null;

// buttonEl: the visible "Install app" button.
// iosHintEl: optional element shown instead on iOS Safari, where the
// native install prompt doesn't exist — it needs the manual Share ->
// "Add to Home Screen" flow.
export function initInstallPrompt(buttonEl, iosHintEl) {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (isStandalone) {
    // Already installed and running as an app — nothing to offer.
    if (buttonEl) buttonEl.style.display = "none";
    if (iosHintEl) iosHintEl.style.display = "none";
    return;
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    if (buttonEl) buttonEl.style.display = "none";
    if (iosHintEl) iosHintEl.style.display = "block";
    return;
  }

  if (!buttonEl) return;
  buttonEl.style.display = "none";

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    buttonEl.style.display = "inline-flex";
  });

  buttonEl.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    buttonEl.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    buttonEl.style.display = "none";
    buttonEl.disabled = false;
  });

  window.addEventListener("appinstalled", () => {
    buttonEl.style.display = "none";
    deferredPrompt = null;
  });
}
