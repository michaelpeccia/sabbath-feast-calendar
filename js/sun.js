// Sunset calculator. Runs fully offline on the phone.
// Based on the NOAA / Almanac for Computers sunrise-sunset formula.
// Accurate to about 1 to 2 minutes, which is fine for Sabbath times.

(function () {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const ZENITH = 90.833; // official sunset: sun's upper edge at the horizon, with refraction

  function dayOfYear(y, m, d) {
    return Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000);
  }

  function norm(x, max) {
    return ((x % max) + max) % max;
  }

  // Returns a Date for sunset on the given calendar day (year, month 0-11, day)
  // at latitude/longitude (west longitudes are negative). Returns null where the
  // sun does not set that day (far north or south in summer/winter).
  function sunset(y, m, d, lat, lon) {
    const N = dayOfYear(y, m, d);
    const lngHour = lon / 15;
    const t = N + ((18 - lngHour) / 24);

    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634;
    L = norm(L, 360);

    let RA = deg * Math.atan(0.91764 * Math.tan(L * rad));
    RA = norm(RA, 360);
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;

    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(ZENITH * rad) - sinDec * Math.sin(lat * rad)) /
                 (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null;

    const H = (deg * Math.acos(cosH)) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = norm(T - lngHour, 24);

    // Put the result on the right UTC day: local sunset is near 18:00 solar time.
    let ms = Date.UTC(y, m, d) + UT * 3600000;
    const expected = Date.UTC(y, m, d) + (18 - lngHour) * 3600000;
    while (ms - expected > 12 * 3600000) ms -= 86400000;
    while (expected - ms > 12 * 3600000) ms += 86400000;
    return new Date(ms);
  }

  window.Sun = { sunset };
})();
