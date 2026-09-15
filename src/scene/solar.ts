// solar.ts — sunrise, sunset, and solar noon for a date at a fixed location (§5.2 as amended: the sun runs on the clock, not the phrase).
// NOAA's simplified solar-position equations; accuracy within a few minutes, which is more than the scene needs. No API.

export interface SolarTimes {
  sunrise: number; // local fractional hours (e.g., 5.42)
  sunset: number;
  solarNoon: number;
  polar: "day" | "night" | null; // NYC never hits these, but the math shouldn't NaN
}

export function solarTimes(dateIso: string, lat: number, lon: number, tzOffsetHours: number): SolarTimes {
  const d = new Date(dateIso + "T12:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start) / 86400000);

  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  // Equation of time (minutes) and solar declination (radians), NOAA approximation.
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const latRad = (lat * Math.PI) / 180;
  // 90.833° zenith accounts for refraction and the solar disc.
  const cosHa = Math.cos((90.833 * Math.PI) / 180) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);
  if (cosHa > 1) return { sunrise: NaN, sunset: NaN, solarNoon: NaN, polar: "night" };
  if (cosHa < -1) return { sunrise: NaN, sunset: NaN, solarNoon: NaN, polar: "day" };

  const haDeg = (Math.acos(cosHa) * 180) / Math.PI;
  const solarNoonUtcMin = 720 - 4 * lon - eqTime;
  const sunriseUtcMin = solarNoonUtcMin - 4 * haDeg;
  const sunsetUtcMin = solarNoonUtcMin + 4 * haDeg;

  const toLocal = (utcMin: number) => utcMin / 60 + tzOffsetHours;
  return { sunrise: toLocal(sunriseUtcMin), sunset: toLocal(sunsetUtcMin), solarNoon: toLocal(solarNoonUtcMin), polar: null };
}

// Offset hours from an ISO local-hour timestamp like "2023-06-07T13:00:00-04:00".
// The clock hour a reading belongs to, from its own timestamp. An archive day is indexed 0..23 by clock hour, but the live series is the last 24 published hours and starts wherever AirNow's window starts, so the index is the transport position and only the timestamp knows the time of day.
export function hourOfTs(ts: string): number {
  return Number(ts.slice(11, 13));
}

export function tzOffsetFromTs(ts: string): number {
  const m = ts.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return -5;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) + Number(m[3]) / 60);
}

// Sun azimuth and elevation for a fractional local hour (NOAA hour-angle form, same equations as above). Elevation is degrees above the horizon (negative at night); azimuth is degrees clockwise from north.
export interface SunAngles {
  azimuthDeg: number;
  elevationDeg: number;
}

export function sunAnglesAt(dateIso: string, hourFloat: number, lat: number, lon: number, tzOffsetHours: number): SunAngles {
  const d = new Date(dateIso + "T12:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start) / 86400000);
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);

  // True solar time → hour angle (degrees; 0 at solar noon, negative in the morning).
  const trueSolarMin = hourFloat * 60 + eqTime + 4 * lon - 60 * tzOffsetHours;
  const ha = ((trueSolarMin / 4) - 180) * (Math.PI / 180);

  const latRad = (lat * Math.PI) / 180;
  const sinEl = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(ha);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const cosAz =
    (Math.sin(decl) - Math.sin(elevation) * Math.sin(latRad)) / (Math.cos(elevation) * Math.cos(latRad));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (ha > 0) azimuth = 2 * Math.PI - azimuth; // afternoon: sun west of south

  return { azimuthDeg: (azimuth * 180) / Math.PI, elevationDeg: (elevation * 180) / Math.PI };
}

// The three.js Sky shader wants a direction vector. +Y is up, and the camera looks toward -Z, so north sits at -Z and east at +X.
export function sunPositionVector(angles: SunAngles, distance = 1): [number, number, number] {
  const el = (angles.elevationDeg * Math.PI) / 180;
  const az = (angles.azimuthDeg * Math.PI) / 180;
  const cosEl = Math.cos(el);
  return [distance * cosEl * Math.sin(az), distance * Math.sin(el), -distance * cosEl * Math.cos(az)];
}

