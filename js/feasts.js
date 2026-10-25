// Feast and Sabbath calendar for every calendar the app offers.
// A biblical day runs from sunset to sunset. "Day n" below means the daylight date
// of day n; it begins at sunset the evening before.
//
// Calendars (settings.method):
//   Moon:   "sighted" (default), "conjunction", "full", "lunar" (lunar Sabbath)
//   Solar:  "enoch", "qumran", "zadok"   (364-day year: months of 30, 30, 31 days)
//   Fixed:  "rabbinic"                   (the calculated Hebrew calendar)
//
// User adjustments (saved in settings):
//   settings.sightings[moonKey] = { shift, confirmed }   sighted crescent only
//   settings.yearStart = "equinox" | "aviv"              moon calendars
//   settings.aviv[gYear] = "confirmed" | "next"
//   settings.lunarStart = "sighted" | "conjunction"      lunar Sabbath month start
//   settings.enochStart = "wed" | "sun" | "after"        Enoch year start
//   settings.qumranStart = "wedBefore" | "wedAfter"      Qumran year start

(function () {
  const JERUSALEM = { lat: 31.7683, lon: 35.2137 };
  const HOUR = 3600000;
  const SIGHT_AGE_HOURS = 20; // rough rule: a crescent is usually first seen when the moon is 20+ hours old at sunset

  const MOON = ["sighted", "conjunction", "full", "lunar"];
  const SOLAR = ["enoch", "qumran", "zadok"];

  // ---------- date helpers (calendar dates as {y, m, d}, m = 0-11) ----------
  function addDays(ymd, n) {
    const d = new Date(ymd.y, ymd.m, ymd.d + n);
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  }
  function toDate(ymd) { return new Date(ymd.y, ymd.m, ymd.d); }
  function fromDate(d) { return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }; }
  function utcYmd(d) { return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
  function sunsetAt(ymd, place) { return Sun.sunset(ymd.y, ymd.m, ymd.d, place.lat, place.lon); }
  function sameOrAfter(a, b) {
    return a.y !== b.y ? a.y > b.y : a.m !== b.m ? a.m > b.m : a.d >= b.d;
  }
  function dayNumber(ymd) { return Math.round(Date.UTC(ymd.y, ymd.m, ymd.d) / 86400000); }
  function weekday(ymd) { return new Date(Date.UTC(ymd.y, ymd.m, ymd.d)).getUTCDay(); } // 0 = Sunday
  function moonKey(moon) { return moon.toISOString().slice(0, 10); }

  function methodOf(settings) { return settings.method || "sighted"; }
  // How a moon calendar starts its months.
  function moonMode(settings) {
    const m = methodOf(settings);
    return m === "lunar" ? (settings.lunarStart || "sighted") : m;
  }
  function isSighted(settings) { return MOON.indexOf(methodOf(settings)) >= 0 && moonMode(settings) === "sighted"; }

  // ---------- shared: the Leviticus 23 feasts from a "day of month" lookup ----------
  // dayOf(month, day) returns the calendar date {y,m,d} of that day's daylight.
  // isExpected(month) says whether dates in that month are still unconfirmed.
  function leviticusFeasts(dayOf, isExpected, loc, firstfruitsDay, firstfruitsLabel) {
    function span(month, firstDay, lastDay) {
      const firstDaylight = dayOf(month, firstDay);
      const lastDaylight = dayOf(month, lastDay);
      return {
        start: sunsetAt(addDays(firstDaylight, -1), loc),
        end: sunsetAt(lastDaylight, loc),
        firstDate: toDate(firstDaylight),
        lastDate: toDate(lastDaylight),
        expected: isExpected(month)
      };
    }
    const feasts = [];
    const add = (key, name, ref, s, dayLabel) => feasts.push(Object.assign({ key, name, ref, dayLabel }, s));

    add("passover", "Passover", "Leviticus 23:5", span(1, 14, 14), "Month 1, day 14");
    add("unleavened", "Unleavened Bread", "Leviticus 23:6-8", span(1, 15, 21), "Month 1, days 15 to 21");
    add("firstfruits", "Firstfruits", "Leviticus 23:10-11", span(1, firstfruitsDay, firstfruitsDay), firstfruitsLabel);

    // Shavuot: fifty days from Firstfruits (Leviticus 23:15-16), counted as days.
    const ff = dayOf(1, firstfruitsDay);
    const sh = addDays(ff, 49);
    feasts.push({
      key: "shavuot", name: "Shavuot (Weeks)", ref: "Leviticus 23:15-21", dayLabel: "50 days from Firstfruits",
      start: sunsetAt(addDays(sh, -1), loc), end: sunsetAt(sh, loc),
      firstDate: toDate(sh), lastDate: toDate(sh), expected: isExpected(1)
    });

    add("trumpets", "Yom Teruah (Trumpets)", "Leviticus 23:24-25", span(7, 1, 1), "Month 7, day 1");
    add("atonement", "Yom Kippur (Atonement)", "Leviticus 23:27-32", span(7, 10, 10), "Month 7, day 10");
    add("tabernacles", "Sukkot (Tabernacles)", "Leviticus 23:34-36", span(7, 15, 21), "Month 7, days 15 to 21");
    add("eighthday", "The Eighth Day", "Leviticus 23:36", span(7, 22, 22), "Month 7, day 22");
    return feasts;
  }

  // ======================= MOON CALENDARS =======================

  function baseEvening(moon, mode, settings, loc) {
    const place = mode === "sighted" && settings.sight !== "local" ? JERUSALEM : loc;
    const minAge = mode === "sighted" ? SIGHT_AGE_HOURS * HOUR : 0;
    let ymd = addDays(utcYmd(moon), -1);
    for (let i = 0; i < 5; i++) {
      const ss = sunsetAt(ymd, place);
      if (ss && ss - moon >= minAge) return ymd;
      ymd = addDays(ymd, 1);
    }
    return ymd;
  }

  function makeMonth(moon, mode, settings, loc) {
    const key = moonKey(moon);
    const adj = (mode === "sighted" && settings.sightings && settings.sightings[key]) || {};
    const shift = adj.shift || 0;
    return {
      key,
      moon,
      evening: addDays(baseEvening(moon, mode, settings, loc), shift),
      shift,
      confirmed: mode !== "sighted" || !!adj.confirmed
    };
  }

  function buildMoonYear(gYear, loc, settings) {
    const method = methodOf(settings);
    const mode = moonMode(settings);
    const phase = mode === "full" ? 0.5 : 0;
    const moons = Astro.phasesBetween(new Date(Date.UTC(gYear, 1, 1)), new Date(Date.UTC(gYear + 1, 5, 1)), phase);
    const eqYmd = utcYmd(Astro.marchEquinox(gYear));

    // Month 1 by the equinox rule: the first month whose 14th day falls on or after the spring equinox.
    let first = -1;
    for (let i = 0; i < moons.length; i++) {
      if (sameOrAfter(addDays(makeMonth(moons[i], mode, settings, loc).evening, 14), eqYmd)) { first = i; break; }
    }
    if (first < 0) return null;

    const avivMode = settings.yearStart === "aviv";
    const avivState = avivMode && settings.aviv ? settings.aviv[gYear] : undefined;
    if (avivState === "next") first += 1;
    const yearStartConfirmed = !avivMode || !!avivState;

    const months = [];
    for (let n = 1; n <= 13 && first + n - 1 < moons.length; n++) {
      const mo = makeMonth(moons[first + n - 1], mode, settings, loc);
      mo.n = n;
      mo.start = sunsetAt(mo.evening, loc);
      mo.date = toDate(addDays(mo.evening, 1));
      months.push(mo);
    }
    if (months.length < 8) return null;

    const dayOf = (month, day) => addDays(months[month - 1].evening, day);
    const isExpected = (month) => !months[month - 1].confirmed || !yearStartConfirmed;

    // Firstfruits: the day after the weekly Sabbath during Unleavened Bread (Leviticus 23:11).
    let ffDay = 16;
    if (method === "lunar") {
      ffDay = 16; // day 15 is a lunar Sabbath
    } else {
      for (let n = 16; n <= 22; n++) {
        if (weekday(dayOf(1, n)) === 0) { ffDay = n; break; }
      }
    }
    const feasts = leviticusFeasts(dayOf, isExpected, loc, ffDay, "Month 1, day " + ffDay);

    // Lunar Sabbath: days 8, 15, 22 and 29 of each month (Sabbath days of this year's months).
    let sabbaths = null;
    if (method === "lunar") {
      sabbaths = [];
      months.forEach((mo, i) => {
        const nextEve = months[i + 1] ? months[i + 1].evening : addDays(mo.evening, 30);
        [8, 15, 22, 29].forEach((d) => {
          const day = addDays(mo.evening, d);
          if (dayNumber(day) <= dayNumber(nextEve)) sabbaths.push(day);
        });
      });
    }

    return {
      gYear, method, family: "moon", avivMode, avivState, yearStartConfirmed,
      sightable: mode === "sighted",
      expected: feasts.some((f) => f.expected),
      feasts, months, sabbaths
    };
  }

  // ======================= 364-DAY SOLAR CALENDARS =======================

  const SOLAR_MONTH_LENGTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  const ZADOK_EPOCH = { y: 2025, m: 2, d: 19 }; // Wednesday, March 19, 2025: year 1 of a 6-year priestly cycle

  // Calendar date of day 1 of the solar year that begins in the spring of gYear.
  function solarYearStart(gYear, settings) {
    const method = methodOf(settings);
    const eq = utcYmd(Astro.marchEquinox(gYear));
    const WED = 3, SUN = 0;

    if (method === "zadok") {
      // Continuous 364-day years, with a leap week at the start of every 6-year priestly cycle.
      const n = gYear - ZADOK_EPOCH.y;
      return addDays(ZADOK_EPOCH, 364 * n + 7 * Math.floor(n / 6));
    }
    if (method === "qumran" && (settings.qumranStart || "wedBefore") === "wedBefore") {
      // The Wednesday on or before the equinox. A leap week falls when the equinox reaches a Wednesday.
      return addDays(eq, -((weekday(eq) - WED + 7) % 7));
    }
    if (method === "enoch" && settings.enochStart === "after") {
      return addDays(eq, 1); // the day after the equinox
    }
    const target = method === "enoch" && settings.enochStart === "sun" ? SUN : WED;
    return addDays(eq, (target - weekday(eq) + 7) % 7); // first target weekday on or after the equinox
  }

  function buildSolarYear(gYear, loc, settings) {
    const method = methodOf(settings);
    const day1 = solarYearStart(gYear, settings);
    const next1 = solarYearStart(gYear + 1, settings);

    const monthStart = [];
    let offset = 0;
    SOLAR_MONTH_LENGTHS.forEach((len) => { monthStart.push(offset); offset += len; });

    const dayOf = (month, day) => addDays(day1, monthStart[month - 1] + day - 1);
    const months = SOLAR_MONTH_LENGTHS.map((len, i) => {
      const date = dayOf(i + 1, 1);
      return { n: i + 1, key: "s" + gYear + "-" + (i + 1), start: sunsetAt(addDays(date, -1), loc), date: toDate(date), confirmed: true, length: len };
    });

    // Weekly Sabbath: Saturday when the year starts on a set weekday. With the
    // day-after-equinox start the week restarts each year, so the Sabbath is every 7th day of the year.
    const restartsWeek = method === "enoch" && settings.enochStart === "after";
    let sabbaths = null;
    if (restartsWeek) {
      sabbaths = [];
      for (let d = 7; d <= 364; d += 7) sabbaths.push(addDays(day1, d - 1));
    }

    // Firstfruits: the day after the first weekly Sabbath that follows Unleavened Bread
    // (the 26th of month 1 in the Qumran and Jubilees calendar).
    let ffDay = 23;
    for (let n = 23; n <= 29; n++) {
      const prev = dayOf(1, n - 1);
      const prevIsSabbath = restartsWeek ? ((monthStart[0] + n - 1) % 7 === 0) : weekday(prev) === 6;
      if (prevIsSabbath) { ffDay = n; break; }
    }
    const feasts = leviticusFeasts(dayOf, () => false, loc, ffDay, "Month 1, day " + ffDay + " (after the Sabbath that follows Unleavened Bread)");

    const yearLength = dayNumber(next1) - dayNumber(day1);
    return {
      gYear, method, family: "solar",
      yearStartDate: toDate(day1),
      extraDays: yearLength - 364, // a leap week or the days added before the next year
      expected: false, feasts, months, sabbaths
    };
  }

  // ======================= RABBINIC (calculated Hebrew calendar) =======================
  // Arithmetic from Reingold and Dershowitz, Calendrical Calculations.

  const HEBREW_EPOCH_RD = -1373427;
  const RD_UNIX_EPOCH = 719163; // RD day number of January 1, 1970

  function hLeap(y) { return ((7 * y + 1) % 19) < 7; }
  function hElapsed(y) {
    const months = Math.floor((235 * y - 234) / 19);
    const parts = 12084 + 13753 * months;
    let day = 29 * months + Math.floor(parts / 25920);
    if ((3 * (day + 1)) % 7 < 3) day += 1;
    return day;
  }
  function hNewYear(y) {
    const ny0 = hElapsed(y - 1), ny1 = hElapsed(y), ny2 = hElapsed(y + 1);
    const corr = ny2 - ny1 === 356 ? 2 : (ny1 - ny0 === 382 ? 1 : 0);
    return HEBREW_EPOCH_RD + ny1 + corr;
  }
  function hYearDays(y) { return hNewYear(y + 1) - hNewYear(y); }
  function hMonthDays(y, m) {
    if ([2, 4, 6, 10, 13].indexOf(m) >= 0) return 29;
    if (m === 12 && !hLeap(y)) return 29;
    if (m === 8 && hYearDays(y) % 10 !== 5) return 29;
    if (m === 9 && hYearDays(y) % 10 === 3) return 29;
    return 30;
  }
  function hLastMonth(y) { return hLeap(y) ? 13 : 12; }
  function hFixed(y, m, d) { // RD of Hebrew date; m: 1 = Nisan, 7 = Tishrei
    let rd = hNewYear(y) + d - 1;
    if (m < 7) {
      for (let k = 7; k <= hLastMonth(y); k++) rd += hMonthDays(y, k);
      for (let k = 1; k < m; k++) rd += hMonthDays(y, k);
    } else {
      for (let k = 7; k < m; k++) rd += hMonthDays(y, k);
    }
    return rd;
  }
  function rdToYmd(rd) {
    const d = new Date((rd - RD_UNIX_EPOCH) * 86400000);
    return utcYmd(d);
  }

  function buildRabbinicYear(gYear, loc) {
    const springYear = gYear + 3760; // Nisan of this spring
    const fallYear = gYear + 3761;   // Tishrei of this fall
    const dayOf = (month, day) => rdToYmd(month >= 7 ? hFixed(fallYear, month, day) : hFixed(springYear, month, day));
    const feasts = leviticusFeasts(dayOf, () => false, loc, 16, "16 Nisan (rabbinic count)");

    const names = ["Nisan", "Iyar", "Sivan", "Tammuz", "Av", "Elul", "Tishrei", "Cheshvan", "Kislev", "Tevet", "Shevat", "Adar"];
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const date = dayOf(m, 1);
      months.push({ n: m, label: names[m - 1], key: "h" + gYear + "-" + m, start: sunsetAt(addDays(date, -1), loc), date: toDate(date), confirmed: true });
    }
    return { gYear, method: "rabbinic", family: "rabbinic", expected: false, feasts, months, sabbaths: null };
  }

  // ======================= PUBLIC =======================

  function buildYear(gYear, loc, settings) {
    const method = methodOf(settings);
    if (SOLAR.indexOf(method) >= 0) return buildSolarYear(gYear, loc, settings);
    if (method === "rabbinic") return buildRabbinicYear(gYear, loc);
    return buildMoonYear(gYear, loc, settings);
  }

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

  // The current or next weekly Sabbath: { start, end } as sunset times.
  // Saturday for most calendars; follows the calendar for the lunar Sabbath and Enoch's day-after-equinox start.
  function findSabbath(now, loc, settings) {
    const y = now.getFullYear();
    let days = null;
    for (const gy of [y - 1, y]) {
      const yr = buildYear(gy, loc, settings);
      if (yr && yr.sabbaths) days = (days || []).concat(yr.sabbaths);
    }
    if (days) {
      days.sort((a, b) => dayNumber(a) - dayNumber(b));
      for (const day of days) {
        const end = sunsetAt(day, loc);
        if (end && end > now) return { start: sunsetAt(addDays(day, -1), loc), end };
      }
      return null;
    }
    const today = fromDate(now);
    for (let i = -1; i <= 8; i++) {
      const sat = addDays(today, i);
      if (weekday(sat) !== 6) continue;
      const start = sunsetAt(addDays(sat, -1), loc);
      const end = sunsetAt(sat, loc);
      if (!start || !end) return null;
      if (end > now) return { start, end };
    }
    return null;
  }

  function sightingDue(now, loc, settings) {
    if (!isSighted(settings)) return null;
    const today = fromDate(now);
    const yesterday = addDays(today, -1);
    const same = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
    const y = now.getFullYear();
    for (const gy of [y - 1, y]) {
      const yr = buildYear(gy, loc, settings);
      if (!yr || !yr.months) continue;
      for (const mo of yr.months) {
        if (mo.confirmed || !mo.evening) continue;
        if (same(mo.evening, today)) return Object.assign({ when: "tonight", gYear: gy }, mo);
        if (same(mo.evening, yesterday)) return Object.assign({ when: "last night", gYear: gy }, mo);
      }
    }
    return null;
  }

  window.Feasts = { buildYear, nextFeast, findSabbath, sightingDue, MOON, SOLAR, _h: { hFixed, rdToYmd } };
})();
