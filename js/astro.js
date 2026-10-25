// Moon and equinox calculator. Runs fully offline on the phone.
// New and full moon times follow Jean Meeus, Astronomical Algorithms, chapter 49
// (accurate to about a minute). The March equinox uses chapter 27's mean formula
// (accurate to within an hour, which is enough to decide a date).

(function () {
  const rad = Math.PI / 180;
  const DELTA_T_DAYS = 70 / 86400; // Terrestrial Time runs about 70 seconds ahead of clock time

  function jdToDate(jd) {
    return new Date((jd - 2440587.5) * 86400000);
  }

  function s(x) { return Math.sin(x * rad); }

  // phase 0 = new moon, 0.5 = full moon. k counts lunations from January 6, 2000.
  function moonPhase(k, phase) {
    k = Math.floor(k) + phase;
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2
            - 0.000000150 * T3 + 0.00000000073 * T4;

    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
    const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;

    const isNew = phase === 0;
    let c =
        (isNew ? -0.40720 : -0.40614) * s(Mp)
      + (isNew ? 0.17241 : 0.17302) * E * s(M)
      + (isNew ? 0.01608 : 0.01614) * s(2 * Mp)
      + (isNew ? 0.01039 : 0.01043) * s(2 * F)
      + (isNew ? 0.00739 : 0.00734) * E * s(Mp - M)
      + (isNew ? -0.00514 : -0.00515) * E * s(Mp + M)
      + (isNew ? 0.00208 : 0.00209) * E * E * s(2 * M)
      - 0.00111 * s(Mp - 2 * F)
      - 0.00057 * s(Mp + 2 * F)
      + 0.00056 * E * s(2 * Mp + M)
      - 0.00042 * s(3 * Mp)
      + 0.00042 * E * s(M + 2 * F)
      + 0.00038 * E * s(M - 2 * F)
      - 0.00024 * E * s(2 * Mp - M)
      - 0.00017 * s(Om)
      - 0.00007 * s(Mp + 2 * M)
      + 0.00004 * s(2 * Mp - 2 * F)
      + 0.00004 * s(3 * M)
      + 0.00003 * s(Mp + M - 2 * F)
      + 0.00003 * s(2 * Mp + 2 * F)
      - 0.00003 * s(Mp + M + 2 * F)
      + 0.00003 * s(Mp - M + 2 * F)
      - 0.00002 * s(Mp - M - 2 * F)
      - 0.00002 * s(3 * Mp + M)
      + 0.00002 * s(4 * Mp);

    // Small corrections from the planets
    const A = [
      [0.000325, 299.77 + 0.107408 * k - 0.009173 * T2],
      [0.000165, 251.88 + 0.016321 * k],
      [0.000164, 251.83 + 26.651886 * k],
      [0.000126, 349.42 + 36.412478 * k],
      [0.000110, 84.66 + 18.206239 * k],
      [0.000062, 141.74 + 53.303771 * k],
      [0.000060, 207.14 + 2.453732 * k],
      [0.000056, 154.84 + 7.306860 * k],
      [0.000047, 34.52 + 27.261239 * k],
      [0.000042, 207.19 + 0.121824 * k],
      [0.000040, 291.34 + 1.844379 * k],
      [0.000037, 161.72 + 24.198154 * k],
      [0.000035, 239.56 + 25.513099 * k],
      [0.000023, 331.55 + 3.592518 * k]
    ];
    for (const [coef, ang] of A) c += coef * s(ang);

    return jdToDate(jde + c - DELTA_T_DAYS);
  }

  function kFor(date) {
    const years = date.getUTCFullYear() + (date.getUTCMonth() + 0.5) / 12;
    return Math.floor((years - 2000) * 12.3685);
  }

  // All new moons (phase 0) or full moons (phase 0.5) between two dates.
  function phasesBetween(from, to, phase) {
    const out = [];
    for (let k = kFor(from) - 2; ; k++) {
      const d = moonPhase(k, phase);
      if (d > to) break;
      if (d >= from) out.push(d);
    }
    return out;
  }

  function marchEquinox(year) {
    const Y = (year - 2000) / 1000;
    const jde = 2451623.80984 + 365242.37404 * Y + 0.05169 * Y * Y
              - 0.00411 * Y * Y * Y - 0.00057 * Y * Y * Y * Y;
    return jdToDate(jde - DELTA_T_DAYS);
  }

  window.Astro = { moonPhase, phasesBetween, marchEquinox };
})();
