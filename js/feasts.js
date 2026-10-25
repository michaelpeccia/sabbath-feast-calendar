// Feast calendar for the moon-based methods (sighted moon, conjunction, full moon).
// A biblical day runs from sunset to sunset. "Day n" below means the daylight date
// of day n; it begins at sunset the evening before.
//
// User adjustments (saved in settings):
//   settings.sightings[moonKey] = { shift: -1|0|1|2, confirmed: true|false }
//     moonKey is the UTC date of the new moon, e.g. "2026-09-11". Sighted moon only.
//   settings.yearStart = "equinox" | "aviv"
//   settings.aviv[gYear] = "confirmed" | "next"   (aviv mode only)

(function () {
  const JERUSALEM = { lat: 31.7683, lon: 35.2137 };
  const HOUR = 3600000;
  const SIGHT_AGE_HOURS = 20; // rough rule: a crescent is usually first seen when the moon is 20+ hours old at sunset

  function addDays(ymd, n) {
    const d = new Date(ymd.y, ymd.m, ymd.d + n);
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  }
  function toDate(ymd) { return new Date(ymd.y, ymd.m, ymd.d); }
  function sunsetAt(ymd, place) { return Sun.sunset(ymd.y, ymd.m, ymd.d, place.lat, place.lon); }
  function sameOrAfter(a, b) {
    return a.y !== b.y ? a.y > b.y : a.m !== b.m ? a.m > b.m : a.d >= b.d;
  }
  function moonKey(moon) { return moon.toISOString().slice(0, 10); }

  // The calculated evening the month begins (as a calendar date), before any user adjustment.
  function baseEvening(moon, method, settings, loc) {
    const place = method === "sighted" && settings.sight !== "local" ? JERUSALEM : loc;
    const minAge = method === "sighted" ? SIGHT_AGE_HOURS * HOUR : 0;
    let ymd = addDays({ y: moon.getUTCFullYear(), m: moon.getUTCMonth(), d: moon.getUTCDate() }, -1);
    for (let i = 0; i < 5; i++) {
      const ss = sunsetAt(ymd, place);
      if (ss && ss - moon >= minAge) return ymd;
      ymd = addDays(ymd, 1);
    }
    return ymd;
  }

  // One month: calculated evening plus the user's sighting adjustment.
  function makeMonth(moon, method, settings, loc) {
    const key = moonKey(moon);
    const adj = (method === "sighted" && settings.sightings && settings.sightings[key]) || {};
    const shift = adj.shift || 0;
    const base = baseEvening(moon, method, settings, loc);
    return {
      key,
      moon,
      evening: addDays(base, shift),
      shift,
      confirmed: method !== "sighted" || !!adj.confirmed
    };
  }

  // Builds the biblical year that begins in the spring of gregorian year gYear.
  function buildYear(gYear, loc, settings) {
    const method = settings.method || "sighted";
    const phase = method === "full" ? 0.5 : 0;
    const moons = Astro.phasesBetween(new Date(Date.UTC(gYear, 1, 1)), new Date(Date.UTC(gYear + 1, 5, 1)), phase);
    const eq = Astro.marchEquinox(gYear);
    const eqYmd = { y: eq.getUTCFullYear(), m: eq.getUTCMonth(), d: eq.getUTCDate() };

    // Month 1 by the equinox rule: the first month whose 14th day (Passover)
    // falls on or after the spring equinox.
    let first = -1;
    for (let i = 0; i < moons.length; i++) {
      const ev = makeMonth(moons[i], method, settings, loc).evening;
      if (sameOrAfter(addDays(ev, 14), eqYmd)) { first = i; break; }
    }
    if (first < 0) return null;

    // Aviv mode: the user can move month 1 a month later when the barley is not aviv.
    const avivMode = settings.yearStart === "aviv";
    const avivState = avivMode && settings.aviv ? settings.aviv[gYear] : undefined;
    if (avivState === "next") first += 1;
    const yearStartConfirmed = !avivMode || avivState === "confirmed" || avivState === "next";

    const months = [];
    for (let n = 1; n <= 13 && first + n - 1 < moons.length; n++) {
      const mo = makeMonth(moons[first + n - 1], method, settings, loc);
      mo.n = n;
      mo.start = sunsetAt(mo.evening, loc);
      mo.date = toDate(addDays(mo.evening, 1));
      months.push(mo);
    }
    if (months.length < 7) return null;

    // A span of days in a month -> start and end sunsets at the user's location.
    function span(monthNum, firstDay, lastDay) {
      const mo = months[monthNum - 1];
      const startEve = addDays(mo.evening, firstDay - 1);
      const lastDaylight = addDays(mo.evening, lastDay);
      return {
        start: sunsetAt(startEve, loc),
        end: sunsetAt(lastDaylight, loc),
        firstDate: toDate(addDays(mo.evening, firstDay)),
        lastDate: toDate(lastDaylight),
        expected: !mo.confirmed || !yearStartConfirmed
      };
    }

    const feasts = [];
    const add = (key, name, ref, s, dayLabel) => feasts.push(Object.assign({ key, name, ref, dayLabel }, s));

    add("passover", "Passover", "Leviticus 23:5", span(1, 14, 14), "Month 1, day 14");
    add("unleavened", "Unleavened Bread", "Leviticus 23:6-8", span(1, 15, 21), "Month 1, days 15 to 21");

    // Firstfruits: the day after the weekly Sabbath during Unleavened Bread (Leviticus 23:11)
    let ffDay = 16;
    for (let n = 16; n <= 22; n++) {
      if (toDate(addDays(months[0].evening, n)).getDay() === 0) { ffDay = n; break; }
    }
    add("firstfruits", "Firstfruits", "Leviticus 23:10-11", span(1, ffDay, ffDay), "Month 1, day " + ffDay);

    // Shavuot: count fifty days from Firstfruits (Leviticus 23:15-16)
    add("shavuot", "Shavuot (Weeks)", "Leviticus 23:15-21", span(1, ffDay + 49, ffDay + 49), "50 days from Firstfruits");

    add("trumpets", "Yom Teruah (Trumpets)", "Leviticus 23:24-25", span(7, 1, 1), "Month 7, day 1");
    add("atonement", "Yom Kippur (Atonement)", "Leviticus 23:27-32", span(7, 10, 10), "Month 7, day 10");
    add("tabernacles", "Sukkot (Tabernacles)", "Leviticus 23:34-36", span(7, 15, 21), "Month 7, days 15 to 21");
    add("eighthday", "The Eighth Day", "Leviticus 23:36", span(7, 22, 22), "Month 7, day 22");

    return {
      gYear, method, avivMode, avivState, yearStartConfirmed,
      equinox: eq,
      expected: feasts.some((f) => f.expected),
      feasts,
      months
    };
  }

  // The next appointed time that has not ended yet.
  function nextFeast(now, loc, settings) {
    const y = now.getFullYear();
    for (const gy of [y - 1, y, y + 1]) {
      const yr = buildYear(gy, loc, settings);
      if (!yr) continue;
      const f = yr.feasts.find((x) => x.end > now);
      if (f) return Object.assign({ gYear: gy }, f);
    }
    return null;
  }

  // Sighted moon only: an unconfirmed month whose crescent is due this evening or was due last evening.
  function sightingDue(now, loc, settings) {
    if ((settings.method || "sighted") !== "sighted") return null;
    const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
    const yesterday = addDays(today, -1);
    const same = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
    const y = now.getFullYear();
    for (const gy of [y - 1, y]) {
      const yr = buildYear(gy, loc, settings);
      if (!yr) continue;
      for (const mo of yr.months) {
        if (mo.confirmed) continue;
        if (same(mo.evening, today)) return Object.assign({ when: "tonight", gYear: gy }, mo);
        if (same(mo.evening, yesterday)) return Object.assign({ when: "last night", gYear: gy }, mo);
      }
    }
    return null;
  }

  window.Feasts = { buildYear, nextFeast, sightingDue };
})();
