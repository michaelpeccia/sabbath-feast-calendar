// Reminders and home-screen widget data. Both only run inside the Android app.
// Reminders are scheduled on the phone with the Local Notifications plugin:
// the next 12 Sabbaths and every feast in the next 12 months. They are rebuilt
// whenever the app opens or a setting, location or calendar changes.

(function () {
  const DEFAULTS = {
    before: true,      // reminder before the Sabbath begins
    beforeLead: 120,   // minutes before sunset; -1 = the morning of (9:00 AM)
    atStart: true,     // when the Sabbath begins
    atEnd: false,      // when the Sabbath ends
    feast: true,       // before each appointed time
    feastLead: 1440    // minutes before the feast begins
  };
  const SABBATHS_AHEAD = 12;
  const WIDGET_SABBATHS = 26;
  const DAY = 86400000;

  let ctx = null;          // { getLoc, getSettings, saveSettings }
  let timer = null;
  let lastNote = "";

  function cap() { return window.Capacitor; }
  function isNative() {
    const c = cap();
    return !!(c && c.isNativePlatform && c.isNativePlatform());
  }
  function plugin(name) {
    const c = cap();
    if (!c) return null;
    if (c.Plugins && c.Plugins[name]) return c.Plugins[name];
    return c.registerPlugin ? c.registerPlugin(name) : null;
  }

  function prefs() {
    const s = ctx.getSettings();
    s.reminders = Object.assign({}, DEFAULTS, s.reminders || {});
    return s.reminders;
  }

  function dayText(d) { return d.toLocaleString(undefined, { weekday: "long" }); }
  function timeText(d) { return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" }); }
  function leadText(min) {
    if (min >= 1440) return min === 1440 ? "tomorrow" : "in " + Math.round(min / 1440) + " days";
    if (min >= 60) return "in " + (min / 60) + (min === 60 ? " hour" : " hours");
    return "in " + min + " minutes";
  }

  // ---------- collect upcoming Sabbaths and feasts ----------
  function upcomingSabbaths(count) {
    const loc = ctx.getLoc();
    const out = [];
    let t = new Date();
    for (let i = 0; i < count; i++) {
      const sab = Feasts.findSabbath(t, loc, ctx.getSettings());
      if (!sab) break;
      out.push(sab);
      t = new Date(sab.end.getTime() + 60000);
    }
    return out;
  }

  function upcomingFeasts(days) {
    const loc = ctx.getLoc();
    const now = new Date();
    const until = new Date(now.getTime() + days * DAY);
    const seen = {};
    const out = [];
    const y = now.getFullYear();
    for (const gy of [y - 1, y, y + 1]) {
      const yr = Feasts.buildYear(gy, loc, ctx.getSettings());
      if (!yr) continue;
      for (const f of yr.feasts) {
        const id = f.key + f.start.getTime();
        if (seen[id] || f.end <= now || f.start > until) continue;
        seen[id] = true;
        out.push(f);
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // ---------- build the list of notifications ----------
  function buildNotifications() {
    const p = prefs();
    const now = new Date();
    const list = [];
    const add = (at, title, body) => { if (at > now) list.push({ at, title, body }); };

    for (const sab of upcomingSabbaths(SABBATHS_AHEAD)) {
      if (p.before) {
        let at;
        if (p.beforeLead === -1) {
          at = new Date(sab.start); at.setHours(9, 0, 0, 0);
        } else {
          at = new Date(sab.start.getTime() - p.beforeLead * 60000);
        }
        add(at, "Sabbath begins at sunset",
          "The Sabbath begins " + dayText(sab.start) + " at " + timeText(sab.start) + ". Time to finish preparing.");
      }
      if (p.atStart) add(sab.start, "Shabbat Shalom", "The Sabbath has begun. It ends at sunset " + dayText(sab.end) + ", " + timeText(sab.end) + ".");
      if (p.atEnd) add(sab.end, "The Sabbath has ended", "Have a blessed week.");
    }

    if (p.feast) {
      for (const f of upcomingFeasts(365)) {
        const at = new Date(f.start.getTime() - p.feastLead * 60000);
        add(at, f.name + " begins " + leadText(p.feastLead),
          f.name + " begins at sunset " + dayText(f.start) + ", " + timeText(f.start) + ". " + f.ref + ".");
      }
    }
    list.sort((a, b) => a.at - b.at);
    return list.map((n, i) => ({
      id: i + 1,
      title: n.title,
      body: n.body,
      schedule: { at: n.at, allowWhileIdle: true }
    }));
  }

  // ---------- schedule ----------
  async function schedule() {
    const LN = plugin("LocalNotifications");
    if (!LN) return;
    try {
      const pending = await LN.getPending();
      if (pending.notifications && pending.notifications.length) {
        await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      }
      const p = prefs();
      if (window.Trial && Trial.locked()) { setNote("Reminders are paused until the app is unlocked."); return; }
      if (!ctx.getLoc() || !(p.before || p.atStart || p.atEnd || p.feast)) { setNote(""); return; }

      let perm = await LN.checkPermissions();
      if (perm.display !== "granted") perm = await LN.requestPermissions();
      if (perm.display !== "granted") {
        setNote("Notifications are turned off for this app. Turn them on in your phone's Settings, then reopen the app.");
        return;
      }
      const notifications = buildNotifications();
      if (notifications.length) await LN.schedule({ notifications });
      setNote(notifications.length + " reminders set for the coming weeks.");
    } catch (e) {
      setNote("Reminders could not be set: " + (e && e.message ? e.message : e));
    }
  }

  // ---------- widget ----------
  async function updateWidget() {
    const W = plugin("WidgetBridge");
    if (!W || !ctx.getLoc()) return;
    if (window.Trial && Trial.locked()) {
      // An empty list makes the widget show "Open the app" instead of stale times.
      try { await W.setData({ json: JSON.stringify({ updated: Date.now(), sabbaths: [], feasts: [] }) }); } catch (e) { /* ignore */ }
      return;
    }
    const st = ctx.getSettings();
    const theme = !st.widgetTheme || st.widgetTheme === "match" ? (st.palette || "midnight") : st.widgetTheme;
    const data = {
      updated: Date.now(),
      theme,
      sabbaths: upcomingSabbaths(WIDGET_SABBATHS).map((s) => ({ start: s.start.getTime(), end: s.end.getTime() })),
      feasts: upcomingFeasts(400).slice(0, 12).map((f) => ({ name: f.name, start: f.start.getTime(), end: f.end.getTime() }))
    };
    try { await W.setData({ json: JSON.stringify(data) }); } catch (e) { /* widget not added yet, or older build */ }
  }

  // ---------- settings card ----------
  function setNote(text) {
    lastNote = text;
    const el = document.getElementById("rem-note");
    if (el) el.textContent = isNative() ? text : "Reminders and the home-screen widget work in the Android app.";
  }

  function syncUI() {
    const p = prefs();
    const $ = (id) => document.getElementById(id);
    $("rem-before").checked = p.before;
    $("rem-before-lead").value = String(p.beforeLead);
    $("rem-before-lead").disabled = !p.before;
    $("rem-start").checked = p.atStart;
    $("rem-end").checked = p.atEnd;
    $("rem-feast").checked = p.feast;
    $("rem-feast-lead").value = String(p.feastLead);
    $("rem-feast-lead").disabled = !p.feast;
    setNote(lastNote);
  }

  function bindUI() {
    const map = [
      ["rem-before", "before", "checked"],
      ["rem-before-lead", "beforeLead", "number"],
      ["rem-start", "atStart", "checked"],
      ["rem-end", "atEnd", "checked"],
      ["rem-feast", "feast", "checked"],
      ["rem-feast-lead", "feastLead", "number"]
    ];
    map.forEach(([id, key, kind]) => {
      document.getElementById(id).addEventListener("change", (e) => {
        const p = prefs();
        p[key] = kind === "checked" ? e.target.checked : parseInt(e.target.value, 10);
        ctx.saveSettings();
        syncUI();
        refresh();
      });
    });
  }

  // Rebuild reminders and the widget a moment after things settle.
  function refresh() {
    if (!ctx || !isNative()) return;
    clearTimeout(timer);
    timer = setTimeout(() => { schedule(); updateWidget(); }, 800);
  }

  function init(options) {
    ctx = options;
    prefs();
    bindUI();
    syncUI();
    refresh();
  }

  window.Reminders = { init, refresh, isNative, _build: buildNotifications, _sabbaths: upcomingSabbaths, _feasts: upcomingFeasts };
})();
