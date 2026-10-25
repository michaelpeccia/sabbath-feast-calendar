// Prep checklists. Starter items for each appointed time; users can check, add and remove.
// Check marks are saved per occurrence (each week for the Sabbath, each year for a feast),
// so a fresh list is ready next time. Saved on the phone only.

(function () {
  const KEY = "sfc-checklists";

  const DEFAULTS = {
    sabbath: [
      "Finish work and errands before sunset",
      "Do the shopping before the Sabbath (Nehemiah 10:31)",
      "Prepare meals ahead",
      "Fill up the gas tank",
      "Set out your Bible and study for the day",
      "Plan worship and fellowship for the day"
    ],
    passover: [
      "Read Exodus 12 together",
      "Plan the evening of the fourteenth with your household",
      "Invite family or fellowship to join you"
    ],
    unleavened: [
      "Put away all yeast and leavened bread from your house (Exodus 12:15, 19)",
      "Check the pantry: bread, crackers, cereal, mixes and snacks",
      "Clean out the car, desk, lunch boxes and bags",
      "Decide how your household handles baking soda and baking powder",
      "Buy or bake unleavened bread for seven days",
      "Request time off for the first and seventh days (Leviticus 23:7-8)"
    ],
    shavuot: [
      "Request time off (Leviticus 23:21)",
      "Plan a way to give to the poor and the foreigner (Leviticus 23:22)",
      "Plan a gathering for the day"
    ],
    trumpets: [
      "Request time off (Leviticus 23:25)",
      "Have a shofar or trumpet ready",
      "Plan a gathering for the day"
    ],
    atonement: [
      "Request time off (Leviticus 23:28)",
      "Plan how you will deny yourself (Leviticus 23:27)",
      "Set aside time for repentance and prayer"
    ],
    tabernacles: [
      "Request time off for the first day and the eighth day (Leviticus 23:35-36)",
      "Plan where you will dwell in a temporary shelter (Leviticus 23:42)",
      "Gather branches: fruit of majestic trees, palm, thick trees and willows (Leviticus 23:40)",
      "Pack shelter or tent, bedding, chairs, lights and cooking gear",
      "Plan meals for the week",
      "Invite others, including the foreigner, the fatherless and the widow (Deuteronomy 16:14)"
    ]
  };

  // Feasts that share a list: the Eighth Day uses the Sukkot list.
  const SHARED = { eighthday: "tabernacles" };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function listKey(key) { return SHARED[key] || key; }

  function entry(state, key) {
    const k = listKey(key);
    if (!state[k]) {
      state[k] = {
        items: (DEFAULTS[k] || []).map((text, i) => ({ id: "d" + i, text })),
        done: {}
      };
    }
    return state[k];
  }

  function has(key) { return !!DEFAULTS[listKey(key)]; }

  function get(key, occ) {
    const state = load();
    const e = entry(state, key);
    const done = e.done[occ] || [];
    return e.items.map((it) => ({ id: it.id, text: it.text, done: done.indexOf(it.id) >= 0 }));
  }

  function toggle(key, occ, id) {
    const state = load();
    const e = entry(state, key);
    // Keep only this occurrence's marks so old weeks do not pile up.
    const done = e.done[occ] || [];
    e.done = {};
    e.done[occ] = done.indexOf(id) >= 0 ? done.filter((x) => x !== id) : done.concat(id);
    save(state);
  }

  function add(key, text) {
    text = (text || "").trim();
    if (!text) return;
    const state = load();
    entry(state, key).items.push({ id: "u" + Date.now(), text });
    save(state);
  }

  function remove(key, id) {
    const state = load();
    const e = entry(state, key);
    e.items = e.items.filter((it) => it.id !== id);
    save(state);
  }

  function reset(key) {
    const state = load();
    delete state[listKey(key)];
    save(state);
  }

  window.Checklists = { has, get, toggle, add, remove, reset };
})();
