// 14-day free trial, then a one-time unlock through Google Play.
// The trial counts from the day the app was first installed. Once the unlock is
// bought it is remembered on the phone, so the app keeps working offline.
// In a web browser (the preview page) there is no trial and nothing is locked.

(function () {
  const TRIAL_DAYS = 14;
  const DAY = 86400000;
  const KEY = "sfc-license";
  const FALLBACK_PRICE = "$4.99";
  const $ = (id) => document.getElementById(id);

  let state = { start: 0, unlocked: false };
  let price = FALLBACK_PRICE;
  let busy = false;

  function isNative() {
    const c = window.Capacitor;
    return !!(c && c.isNativePlatform && c.isNativePlatform());
  }
  function billing() {
    const c = window.Capacitor;
    if (!c) return null;
    if (c.Plugins && c.Plugins.PlayBilling) return c.Plugins.PlayBilling;
    return c.registerPlugin ? c.registerPlugin("PlayBilling") : null;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function daysLeft() {
    return Math.max(0, Math.ceil((state.start + TRIAL_DAYS * DAY - Date.now()) / DAY));
  }
  function expired() { return !state.unlocked && Date.now() >= state.start + TRIAL_DAYS * DAY; }

  // ---------- screen ----------
  function render() {
    if (!isNative()) return;
    const left = daysLeft();
    const card = $("trial-card");
    card.hidden = false;
    $("lock").hidden = !expired();
    document.body.classList.toggle("locked", expired());
    $("trial-banner").hidden = state.unlocked || expired() || left > 3;

    document.querySelectorAll(".unlock-price").forEach((el) => { el.textContent = price; });

    if (state.unlocked) {
      $("trial-title").textContent = "Unlocked";
      $("trial-text").textContent = "Thank you for supporting Kingdom Life Ministry. The full app is yours on this Google account.";
      $("trial-buy").hidden = true;
      $("trial-restore").hidden = true;
    } else {
      $("trial-title").textContent = "Your free trial";
      $("trial-text").textContent = left === 1
        ? "1 day left in your free trial."
        : left + " days left in your free trial.";
      $("trial-buy").hidden = false;
      $("trial-restore").hidden = false;
    }
    $("trial-banner-text").textContent = left === 1
      ? "Your free trial ends tomorrow."
      : "Your free trial ends in " + left + " days.";
  }

  function say(text) {
    $("lock-msg").textContent = text;
    $("trial-msg").textContent = text;
  }

  // ---------- Google Play ----------
  function applyStatus(res) {
    if (res && res.owned) {
      state.unlocked = true;
      save();
      say("");
    } else if (res && res.pending) {
      say("Your payment is pending. The app unlocks as soon as Google confirms it.");
    }
    render();
  }

  function checkStatus(fromButton) {
    const B = billing();
    if (!B) return Promise.resolve();
    return B.getStatus().then((res) => {
      applyStatus(res);
      if (fromButton && !(res && (res.owned || res.pending))) {
        say("No purchase found on this Google account. If you bought it on another account, switch to that account in the Play Store and try again.");
      }
    }).catch(() => {
      if (fromButton) say("Couldn't reach Google Play. Make sure you're online and signed in to the Play Store, then try again.");
    });
  }

  function buy() {
    const B = billing();
    if (!B || busy) return;
    busy = true;
    say("Opening Google Play...");
    B.buy().then((res) => {
      if (res && res.canceled) say("");
      else if (res && res.failed) say("The purchase didn't go through. Please try again.");
      applyStatus(res);
    }).catch((e) => {
      say(e && e.code === "noproduct"
        ? "The unlock isn't available yet. Please try again later."
        : "Couldn't reach Google Play. Make sure you're online and signed in to the Play Store, then try again.");
    }).then(() => { busy = false; });
  }

  // ---------- start ----------
  function init() {
    if (!isNative()) return;
    load();
    if (!state.start) state.start = Date.now();
    save();
    render();

    const B = billing();
    if (B) {
      // Count from the first install, so clearing the app's data doesn't restart the trial.
      B.getInstallTime().then((r) => {
        if (r && r.firstInstall > 0 && r.firstInstall < state.start) { state.start = r.firstInstall; save(); render(); }
      }).catch(() => {});
      B.getPrice().then((r) => { if (r && r.price) { price = r.price; render(); } }).catch(() => {});
    }
    checkStatus(false);

    ["lock-buy", "trial-buy", "trial-banner-buy"].forEach((id) => $(id).addEventListener("click", buy));
    ["lock-restore", "trial-restore"].forEach((id) => $(id).addEventListener("click", () => {
      say("Checking Google Play...");
      checkStatus(true);
    }));

    // Coming back to the app (after a pending payment clears, or the next day) updates everything.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      render();
      if (!state.unlocked) checkStatus(false);
    });
    setInterval(render, 60000);
  }

  window.Trial = { isLocked: () => isNative() && expired() };
  init();
})();
