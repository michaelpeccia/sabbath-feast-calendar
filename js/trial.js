// 14-day free trial and the one-time unlock (Google Play in-app product).
// Only runs inside the Android app. The web preview is never locked.
//
// How it works:
// - The first time the app opens, the trial start date is saved on the phone.
// - For 14 days everything works. Home shows how many trial days are left.
// - After 14 days a screen asks for the one-time unlock. Reminders and the
//   widget pause until the app is unlocked.
// - Buying the unlock (product ID below) unlocks the app for good. "Restore
//   purchase" finds an earlier purchase on the same Google account, for example
//   after reinstalling or on a new phone.

(function () {
  const PRODUCT_ID = "full_unlock";     // must match the product ID in Play Console
  const TRIAL_DAYS = 14;
  const FALLBACK_PRICE = "$4.99";
  const KEY = "sfc-trial";
  const DAY = 86400000;

  let state = { start: 0, unlocked: false };
  let price = FALLBACK_PRICE;
  let busy = false;
  let onChange = function () {};

  const $ = (id) => document.getElementById(id);

  function cap() { return window.Capacitor; }
  function isNative() {
    const c = cap();
    return !!(c && c.isNativePlatform && c.isNativePlatform());
  }
  function store() {
    const c = cap();
    if (!c) return null;
    if (c.Plugins && c.Plugins.NativePurchases) return c.Plugins.NativePurchases;
    return c.registerPlugin ? c.registerPlugin("NativePurchases") : null;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    if (!state.start) { state.start = Date.now(); save(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function daysLeft() {
    const used = Math.floor((Date.now() - state.start) / DAY);
    return Math.max(0, TRIAL_DAYS - used);
  }
  function unlocked() { return !isNative() || state.unlocked; }
  function locked() { return isNative() && !state.unlocked && daysLeft() <= 0; }

  function setUnlocked(v) {
    if (state.unlocked === v) return;
    state.unlocked = v;
    save();
    render();
    onChange();
  }

  function setStatus(text) {
    ["lock-status", "full-status-note"].forEach((id) => { const el = $(id); if (el) el.textContent = text || ""; });
  }

  // ---------- talk to Google Play ----------
  function ownsUnlock(purchases) {
    return (purchases || []).find((p) => p.productIdentifier === PRODUCT_ID);
  }

  async function checkPurchases(showResult) {
    const S = store();
    if (!S) { if (showResult) setStatus("Google Play is not available on this phone."); return; }
    try {
      const res = await S.getPurchases({ productType: "inapp" });
      const p = ownsUnlock(res && res.purchases);
      if (p && String(p.purchaseState) === "1") {
        if (p.isAcknowledged === false && p.purchaseToken) {
          try { await S.acknowledgePurchase({ purchaseToken: p.purchaseToken }); } catch (e) { /* retried next launch */ }
        }
        setUnlocked(true);
        if (showResult) setStatus("Purchase restored. Thank you!");
      } else if (p && String(p.purchaseState) === "0") {
        if (showResult) setStatus("Your payment is still pending with Google Play. The app unlocks as soon as it goes through.");
      } else if (showResult) {
        setStatus("No purchase found on this Google account.");
      }
    } catch (e) {
      if (showResult) setStatus("Could not reach Google Play. Check your connection and try again.");
    }
  }

  async function loadPrice() {
    const S = store();
    if (!S) return;
    try {
      const res = await S.getProducts({ productIdentifiers: [PRODUCT_ID], productType: "inapp" });
      const prod = res && res.products && res.products[0];
      if (prod && prod.priceString) { price = prod.priceString; render(); }
    } catch (e) { /* keep the fallback price */ }
  }

  async function buy() {
    if (busy) return;
    const S = store();
    if (!S) { setStatus("Google Play is not available on this phone."); return; }
    busy = true; render();
    setStatus("Opening Google Play...");
    try {
      const t = await S.purchaseProduct({ productIdentifier: PRODUCT_ID, productType: "inapp" });
      if (t && String(t.purchaseState) === "0") {
        setStatus("Your payment is pending with Google Play. The app unlocks as soon as it goes through.");
      } else {
        setUnlocked(true);
        setStatus("Thank you! The full version is unlocked.");
      }
    } catch (e) {
      const msg = String((e && e.message) || e || "");
      if (/cancel/i.test(msg)) setStatus("");
      else if (/already/i.test(msg)) { await checkPurchases(true); }
      else setStatus("The purchase did not go through. " + msg);
    }
    busy = false; render();
  }

  // ---------- screen ----------
  function render() {
    const native = isNative();
    const left = daysLeft();
    const isLocked = locked();

    const lock = $("lock");
    if (lock) lock.hidden = !isLocked;
    document.body.classList.toggle("is-locked", isLocked);

    const card = $("trial-card");
    if (card) {
      card.hidden = !native || state.unlocked || isLocked;
      $("trial-text").textContent = left === 1
        ? "Free trial: 1 day left"
        : "Free trial: " + left + " days left";
    }

    const full = $("full-card");
    if (full) {
      full.hidden = !native;
      $("full-status").textContent = state.unlocked
        ? "Full version unlocked. Thank you for supporting Kingdom Life Ministry."
        : isLocked
          ? "Your free trial has ended."
          : "Free trial: " + left + (left === 1 ? " day" : " days") + " left. Unlock once for " + price + ". No subscription, no ads.";
      $("full-buy").hidden = state.unlocked;
    }

    document.querySelectorAll(".js-price").forEach((el) => { el.textContent = price; });
    document.querySelectorAll(".js-buy").forEach((el) => { el.disabled = busy; });
  }

  function bind() {
    document.querySelectorAll(".js-buy").forEach((el) => el.addEventListener("click", buy));
    document.querySelectorAll(".js-restore").forEach((el) => el.addEventListener("click", () => {
      setStatus("Checking Google Play...");
      checkPurchases(true);
    }));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { render(); onChange(); }
    });
  }

  function init(options) {
    if (options && options.onChange) onChange = options.onChange;
    if (!isNative()) { render(); return; }
    load();
    bind();
    render();
    checkPurchases(false);
    loadPrice();
    const S = store();
    if (S && S.addListener) {
      try {
        S.addListener("transactionUpdated", (t) => {
          if (t && t.productIdentifier === PRODUCT_ID && String(t.purchaseState) === "1") setUnlocked(true);
        });
      } catch (e) { /* older plugin */ }
    }
  }

  window.Trial = { init, locked, unlocked, daysLeft, PRODUCT_ID };
})();
