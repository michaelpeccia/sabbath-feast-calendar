// Sabbath & Feast Days Calendar, version 0.5
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
    refreshAll();
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
  let settings = { method: "sighted", sight: "jerusalem", yearStart: "equinox", sightings: {}, aviv: {}, fatherName: "YHWH", sonName: "Yahshua" };
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

  // Swap in the user's chosen names (the World English Bible uses "Yahweh").
  function withNames(text) {
    const father = settings.fatherName || "YHWH";
    if (father === "LORD") {
      // Traditional style: "the LORD", capitalized at the start of a sentence.
      text = text
        .replace(/(^|[.!?]\s+|[“‘"]\s*)Yahweh/g, "$1The LORD")
        .replace(/Yahweh/g, "the LORD");
    }
    return text.replace(/Yahweh/g, father)
               .replace(/\{Son\}/g, settings.sonName || "Yahshua");
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
    box.dataset.page = f.key;
    box.innerHTML =
      '<p class="big-name">' + f.name + expectedTag(f.expected) + "</p>" +
      '<p class="when">' + line + "</p>" +
      '<p class="daylabel muted">' + f.dayLabel + " &middot; " + f.ref + "</p>" +
      '<p class="more">Tap to read what Scripture says</p>';
  }

  // ---- home: new moon watch (sighted moon only)
  function renderWatch() {
    const card = $("watch-card");
    if (!loc) { card.hidden = true; return; }
    const due = Feasts.sightingDue(new Date(), loc, settings);
    if (!due) { card.hidden = true; return; }
    card.hidden = false;
    const from = settings.sight === "local" ? "from your location" : "from Jerusalem";
    $("watch-text").textContent = due.when === "tonight"
      ? "The crescent for month " + due.n + " is expected " + from + " at sunset tonight. Was it seen?"
      : "The crescent for month " + due.n + " was expected " + from + " at sunset last night. Was it seen?";
    $("watch-seen").dataset.key = due.key;
    $("watch-not").dataset.key = due.key;
  }

  // ---- sighting and aviv changes
  function changeSighting(key, action) {
    settings.sightings = settings.sightings || {};
    const cur = settings.sightings[key] || { shift: 0, confirmed: false };
    if (action === "seen") cur.confirmed = true;
    if (action === "later") { cur.shift = Math.min(2, (cur.shift || 0) + 1); cur.confirmed = false; }
    if (action === "earlier") { cur.shift = Math.max(-1, (cur.shift || 0) - 1); cur.confirmed = true; }
    if (action === "reset") { delete settings.sightings[key]; }
    else settings.sightings[key] = cur;
    saveSettings();
    refreshAll();
  }

  function changeAviv(gYear, action) {
    settings.aviv = settings.aviv || {};
    if (action === "reset") delete settings.aviv[gYear];
    else settings.aviv[gYear] = action; // "confirmed" or "next"
    saveSettings();
    refreshAll();
  }

  // ---- feasts tab
  let viewYear = null;

  function renderFeastList() {
    if (!loc) {
      $("feast-list").innerHTML = '<p class="muted center">Set your location on the Home tab first.</p>';
      $("aviv-card").hidden = true;
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
      ? "Dates marked expected are calculated. Confirm them below as reports come in."
      : "";

    // Aviv card
    const av = $("aviv-card");
    av.hidden = !yr.avivMode;
    if (yr.avivMode) {
      const m1 = yr.months[0];
      let status;
      if (yr.avivState === "confirmed") status = "Aviv confirmed. Month 1 begins at sunset " + shortDay(m1.start) + ".";
      else if (yr.avivState === "next") status = "Not aviv, so month 1 moved a month later. It begins at sunset " + shortDay(m1.start) + ".";
      else status = "Month 1 is expected to begin at sunset " + shortDay(m1.start) + ". Confirm once the barley reports are in.";
      $("aviv-status").textContent = status;
      $("aviv-buttons").innerHTML = yr.avivState
        ? '<button type="button" class="pill" data-aviv="reset">Undo</button>'
        : '<button type="button" class="pill" data-aviv="confirmed">Aviv confirmed</button>' +
          '<button type="button" class="pill" data-aviv="next">Not aviv: a month later</button>';
    }

    $("feast-list").innerHTML = yr.feasts.map((f) => {
      const cls = f.end <= now ? "past" : (f.start <= now ? "now" : "");
      return '<section class="card feast ' + cls + '" data-page="' + f.key + '">' +
        '<div class="feast-head"><h3>' + f.name + expectedTag(f.expected) + "</h3>" +
        '<span class="ref">' + f.ref + "</span></div>" +
        '<p class="span">' + spanText(f) + "</p>" +
        '<p class="daylabel">' + f.dayLabel + "</p>" +
        '<p class="more">Read the Scripture</p></section>';
    }).join("");

    // Months, with sighting buttons for the sighted moon
    const sighted = yr.method === "sighted";
    $("months-hint").hidden = !sighted;
    $("month-list").innerHTML = yr.months.map((m) => {
      let note = "";
      if (m.shift) note += " (moved " + (m.shift > 0 ? "+" : "") + m.shift + " day" + (Math.abs(m.shift) > 1 ? "s" : "") + ")";
      const buttons = !sighted ? "" :
        '<div class="pills">' +
          (m.confirmed ? "" : '<button type="button" class="pill" data-key="' + m.key + '" data-act="seen">Seen</button>') +
          '<button type="button" class="pill" data-key="' + m.key + '" data-act="later">Not seen: +1 day</button>' +
          '<button type="button" class="pill" data-key="' + m.key + '" data-act="earlier">Seen a day earlier</button>' +
          ((m.shift || m.confirmed) ? '<button type="button" class="pill" data-key="' + m.key + '" data-act="reset">Reset</button>' : "") +
        "</div>";
      return "<li><span>Month " + m.n + ": begins at sunset " + shortDay(m.start) + note + "</span>" +
        (sighted ? (m.confirmed ? ' <span class="tag ok">sighted</span>' : expectedTag(true)) : "") +
        buttons + "</li>";
    }).join("");
  }

  function refreshAll() {
    renderFeastList();
    renderNextFeast();
    renderWatch();
    updateSabbathButton();
  }

  function syncSettingsUI() {
    $("sel-method").value = settings.method;
    $("sel-sight").value = settings.sight;
    $("sel-yearstart").value = settings.yearStart || "equinox";
    $("sight-wrap").hidden = settings.method !== "sighted";
    $("sel-father").value = settings.fatherName || "YHWH";
    $("sel-son").value = settings.sonName || "Yahshua";
  }

  $("sel-method").addEventListener("change", (e) => {
    settings.method = e.target.value;
    saveSettings(); syncSettingsUI(); viewYear = null; refreshAll();
  });
  $("sel-sight").addEventListener("change", (e) => {
    settings.sight = e.target.value;
    saveSettings(); viewYear = null; refreshAll();
  });
  $("sel-yearstart").addEventListener("change", (e) => {
    settings.yearStart = e.target.value;
    saveSettings(); viewYear = null; refreshAll();
  });
  $("yr-prev").addEventListener("click", () => { if (viewYear !== null) { viewYear--; renderFeastList(); } });
  $("yr-next").addEventListener("click", () => { if (viewYear !== null) { viewYear++; renderFeastList(); } });

  // Buttons inside lists (added after the page loads)
  $("month-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (b) changeSighting(b.dataset.key, b.dataset.act);
  });
  $("aviv-buttons").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-aviv]");
    if (b && viewYear !== null) changeAviv(viewYear, b.dataset.aviv);
  });
  $("watch-seen").addEventListener("click", (e) => changeSighting(e.target.dataset.key, "seen"));
  $("watch-not").addEventListener("click", (e) => changeSighting(e.target.dataset.key, "later"));


  // ---- feast and Sabbath pages
  let currentView = "home";
  let returnView = "home";

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== "view-" + name; });
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if (name !== "page") currentView = name;
    window.scrollTo(0, 0);
  }

  function openPage(key) {
    const c = window.CONTENT && window.CONTENT[key];
    if (!c) return;
    returnView = currentView;
    $("page-title").textContent = c.name;

    // This year's dates for the feast, when we have a location
    let dates = "";
    const now = new Date();
    let gy = now.getFullYear();
    if (key === "sabbath") {
      dates = "Every seventh day, from sunset to sunset.";
    } else if (loc) {
      gy = viewYear !== null ? viewYear : (Feasts.nextFeast(now, loc, settings) || { gYear: gy }).gYear;
      const yr = Feasts.buildYear(gy, loc, settings);
      const f = yr && yr.feasts.find((x) => x.key === key);
      if (f) dates = spanText(f) + (f.expected ? " (expected)" : "") + " · " + f.dayLabel;
    }
    $("page-dates").textContent = dates;

    pageKey = key;
    pageOcc = key === "sabbath" ? sabbathOcc() : "y" + gy;
    renderChecklist();

    $("page-instructs").innerHTML = c.instructs.map((i) =>
      "<li>" + withNames(i.text) + '<span class="ref">' + i.ref + "</span></li>"
    ).join("");

    $("page-passages").innerHTML = c.passages.map((p) =>
      '<section class="card passage"><h3>' + p.ref + "</h3><p>" +
      p.verses.map((v) => "<sup>" + v.v + "</sup>" + withNames(v.t)).join(" ") +
      "</p></section>"
    ).join("");

    showView("page");
  }

  // ---- prep checklists
  let pageKey = null;
  let pageOcc = null;

  // This week's Sabbath, so the Sabbath list starts fresh each week.
  function sabbathOcc() {
    const sab = loc ? findSabbath(new Date()) : null;
    const d = sab ? sab.start : new Date();
    return "w" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function escapeHtml(t) {
    return t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  function renderChecklist() {
    const card = $("check-card");
    if (!pageKey || !Checklists.has(pageKey)) { card.hidden = true; return; }
    card.hidden = false;
    const items = Checklists.get(pageKey, pageOcc);
    const doneCount = items.filter((i) => i.done).length;
    $("check-note").textContent = (pageKey === "sabbath" ? "For this week's Sabbath. " : "For this year. ") +
      doneCount + " of " + items.length + " done.";
    $("check-list").innerHTML = items.map((i) =>
      '<li class="' + (i.done ? "done" : "") + '">' +
      '<label><input type="checkbox" data-check="' + i.id + '"' + (i.done ? " checked" : "") + ">" +
      "<span>" + escapeHtml(withNames(i.text)) + "</span></label>" +
      '<button type="button" class="x" data-remove="' + i.id + '" aria-label="Remove">&times;</button></li>'
    ).join("");
  }

  function updateSabbathButton() {
    const items = Checklists.get("sabbath", sabbathOcc());
    const done = items.filter((i) => i.done).length;
    $("sabbath-btn").textContent = "Sabbath prep (" + done + " of " + items.length + ") and Scripture";
  }

  $("check-list").addEventListener("change", (e) => {
    const box = e.target.closest("input[data-check]");
    if (!box) return;
    Checklists.toggle(pageKey, pageOcc, box.dataset.check);
    renderChecklist(); updateSabbathButton();
  });
  $("check-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-remove]");
    if (!b) return;
    Checklists.remove(pageKey, b.dataset.remove);
    renderChecklist(); updateSabbathButton();
  });
  function addItem() {
    Checklists.add(pageKey, $("check-input").value);
    $("check-input").value = "";
    renderChecklist(); updateSabbathButton();
  }
  $("check-add").addEventListener("click", addItem);
  $("check-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addItem(); });
  $("check-reset").addEventListener("click", () => {
    if (!confirm("Put back the starter list? Your own items will be removed.")) return;
    Checklists.reset(pageKey);
    renderChecklist(); updateSabbathButton();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("button[data-act], button[data-aviv], #check-card")) return;
    const el = e.target.closest("[data-page]");
    if (el && el.dataset.page) openPage(el.dataset.page);
  });
  $("page-back").addEventListener("click", () => {
    showView(returnView);
    if (returnView === "feasts") renderFeastList();
  });

  // ---- names
  $("sel-father").addEventListener("change", (e) => { settings.fatherName = e.target.value; saveSettings(); });
  $("sel-son").addEventListener("change", (e) => { settings.sonName = e.target.value; saveSettings(); });

  // ---- tabs
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      showView(btn.dataset.view);
      if (btn.dataset.view === "feasts") renderFeastList();
    });
  });

  syncSettingsUI();
  showLocation();
  tick();
  renderNextFeast();
  renderWatch();
  updateSabbathButton();
  setInterval(tick, 1000);
  setInterval(() => { renderNextFeast(); renderWatch(); updateSabbathButton(); }, 60000);
})();
