// Sabbath & Feast Days Calendar, version 0.1
// Home screen: Sabbath countdown from the user's location.
// The weekly Sabbath runs from sunset Friday to sunset Saturday.

(function () {
  const STORE_KEY = "sfc-location";
  const $ = (id) => document.getElementById(id);

  // ---- saved location (wrapped in try/catch so private mode never breaks the app)
  function loadLocation() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveLocation(loc) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(loc)); } catch (e) { /* ignore */ }
  }

  let loc = loadLocation();

  // ---- find the current or next Sabbath
  function sunsetOn(date) {
    return Sun.sunset(date.getFullYear(), date.getMonth(), date.getDate(), loc.lat, loc.lon);
  }

  function findSabbath(now) {
    // Start from yesterday so a Saturday still finds Friday's start.
    for (let i = -1; i <= 8; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (day.getDay() !== 5) continue; // 5 = Friday
      const sat = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const start = sunsetOn(day);
      const end = sunsetOn(sat);
      if (!start || !end) return null;
      if (end > now) return { start, end };
    }
    return null;
  }

  // ---- formatting
  function pad(n) { return String(n).padStart(2, "0"); }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const clock = pad(h) + ":" + pad(m) + ":" + pad(s);
    return d > 0 ? d + "d " + clock : clock;
  }

  function formatWhen(date) {
    return date.toLocaleString(undefined, {
      weekday: "long", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  }

  // ---- render every second
  function tick() {
    if (!loc) return;
    const now = new Date();
    const sab = findSabbath(now);
    const card = $("countdown-card");

    if (!sab) {
      $("cd-label").textContent = "Sabbath times";
      $("cd-timer").textContent = "--:--:--";
      $("cd-when").textContent = "The sun does not set at this location this week.";
      return;
    }

    const inSabbath = now >= sab.start;
    card.classList.toggle("in-sabbath", inSabbath);
    $("cd-label").textContent = inSabbath ? "Shabbat Shalom! Sabbath ends in" : "Sabbath begins in";
    $("cd-timer").textContent = formatCountdown((inSabbath ? sab.end : sab.start) - now);
    $("cd-when").textContent = "at sunset " + formatWhen(inSabbath ? sab.end : sab.start);

    $("week-card").hidden = false;
    $("t-start").textContent = formatWhen(sab.start);
    $("t-end").textContent = formatWhen(sab.end);
  }

  function showLocation() {
    $("loc-status").textContent = loc
      ? "Using " + loc.lat.toFixed(4) + ", " + loc.lon.toFixed(4) + (loc.source ? " (" + loc.source + ")" : "")
      : "No location set.";
  }

  function setLocation(lat, lon, source) {
    loc = { lat, lon, source };
    saveLocation(loc);
    showLocation();
    tick();
  }

  // ---- buttons
  $("btn-gps").addEventListener("click", () => {
    if (!navigator.geolocation) {
      $("loc-status").textContent = "This browser can't read your location. Enter it by hand.";
      return;
    }
    $("loc-status").textContent = "Finding your location...";
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords.latitude, pos.coords.longitude, "GPS"),
      () => { $("loc-status").textContent = "Couldn't get your location. Enter it by hand."; },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  });

  $("btn-save").addEventListener("click", () => {
    const lat = parseFloat($("in-lat").value);
    const lon = parseFloat($("in-lon").value);
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      $("loc-status").textContent = "Check the numbers. West longitudes are negative.";
      return;
    }
    setLocation(lat, lon, "entered");
  });

  showLocation();
  tick();
  setInterval(tick, 1000);
})();
