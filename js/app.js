// Sabbath & Feast Days Calendar, version 0.2
// Home screen: Sabbath countdown and next appointed time. Feasts tab: the year's dates.
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
    // Location changes refresh the feast dates too.
    viewYear = null;
    renderNextFeast();
    renderFeastList();
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

  // ---- calendar settings
  const SETTINGS_KEY = "sfc-settings";
  let settings = { method: "sighted", sight: "jerusalem" };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = Object.assign(settings, JSON.parse(raw));
  } catch (e) { /* ignore */ }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  function shortDay(date) {
    return date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function shortTime(date) {
    return date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function spanText(f) {
    return "Sunset " + shortDay(new Date(f.start)) + " to sunset " + shortDay(new Date(f.end));
  }
  function expectedTag(isExpected) {
    return isExpected ? '<span class="tag">expected</span>' : "";
  }

  // ---- home: next appointed time
  function renderNextFeast() {
    if (!loc) return;
    const now = new Date();
    const f = Feasts.nextFeast(now, loc, settings);
    const box = $("next-feast");
    if (!f) { box.innerHTML = '<p class="muted">No feast dates found.</p>'; return; }

    let line;
    if (f.start <= now) {
      line = "Happening now. Ends at sunset " + shortDay(f.end) + ", " + shortTime(f.end);
    } else {
      const days = Math.ceil((f.start - now) / 86400000);
      line = "Begins at sunset " + shortDay(f.start) + ", " + shortTime(f.start) +
             " (" + (days === 1 ? "1 day" : days + " days") + ")";
    }
    box.innerHTML =
      '<p class="big-name">' + f.name + expectedTag(f.expected) + "</p>" +
      '<p class="when">' + line + "</p>" +
      '<p class="daylabel muted">' + f.dayLabel + " &middot; " + f.ref + "</p>";
  }

  // ---- feasts tab
  let viewYear = null;

  function renderFeastList() {
    if (!loc) {
      $("feast-list").innerHTML = '<p class="muted center">Set your location on the Home tab first.</p>';
      return;
    }
    const now = new Date();
    if (viewYear === null) {
      // Open on the year that holds the next appointed time.
      const next = Feasts.nextFeast(now, loc, settings);
      viewYear = next ? next.gYear : now.getFullYear();
    }
    const yr = Feasts.buildYear(viewYear, loc, settings);
    if (!yr) { $("feast-list").innerHTML = '<p class="muted center">No dates for this year.</p>'; return; }

    $("yr-title").textContent = "Appointed times " + viewYear + " to " + (viewYear + 1);
    $("yr-note").textContent = yr.expected
      ? "Dates are expected from astronomy until the crescent is sighted."
      : "";

    $("feast-list").innerHTML = yr.feasts.map((f) => {
      const cls = f.end <= now ? "past" : (f.start <= now ? "now" : "");
      return '<section class="card feast ' + cls + '">' +
        '<div class="feast-head"><h3>' + f.name + expectedTag(yr.expected) + "</h3>" +
        '<span class="ref">' + f.ref + "</span></div>" +
        '<p class="span">' + spanText(f) + "</p>" +
        '<p class="daylabel">' + f.dayLabel + "</p></section>";
    }).join("");

    $("newmoon-list").innerHTML = yr.newMoons.map((m) =>
      "<li>Month " + m.n + ": begins at sunset " + shortDay(m.start) + "</li>"
    ).join("");
  }

  function syncSettingsUI() {
    $("sel-method").value = settings.method;
    $("sel-sight").value = settings.sight;
    $("sight-wrap").hidden = settings.method !== "sighted";
  }

  $("sel-method").addEventListener("change", (e) => {
    settings.method = e.target.value;
    saveSettings(); syncSettingsUI(); viewYear = null;
    renderFeastList(); renderNextFeast();
  });
  $("sel-sight").addEventListener("change", (e) => {
    settings.sight = e.target.value;
    saveSettings(); viewYear = null;
    renderFeastList(); renderNextFeast();
  });
  $("yr-prev").addEventListener("click", () => { if (viewYear !== null) { viewYear--; renderFeastList(); } });
  $("yr-next").addEventListener("click", () => { if (viewYear !== null) { viewYear++; renderFeastList(); } });

  // ---- tabs
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== "view-" + btn.dataset.view; });
      if (btn.dataset.view === "feasts") renderFeastList();
      window.scrollTo(0, 0);
    });
  });

  syncSettingsUI();
  showLocation();
  tick();
  renderNextFeast();
  setInterval(tick, 1000);
  setInterval(renderNextFeast, 60000);
})();
