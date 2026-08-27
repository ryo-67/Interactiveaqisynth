export interface AQIDataPoint {
  date: string;
  aqi: number;
  category: string;
  mainPollutant: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#68d89b";
  if (aqi <= 100) return "#e8cf6a";
  if (aqi <= 150) return "#e89b6a";
  if (aqi <= 200) return "#e86a6a";
  return "#b06ae8";
}

export function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

// Poetic descriptions of what each pollutant is doing to the sound
export function getEffectProse(pollutants: {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}): string {
  const pm25n = Math.min(pollutants.pm25 / 80, 1);
  const pm10n = Math.min(pollutants.pm10 / 120, 1);
  const o3n = Math.min(pollutants.o3 / 80, 1);
  const no2n = Math.min(pollutants.no2 / 70, 1);

  const reverbWord =
    pm25n < 0.2
      ? "a gentle concert-hall glow"
      : pm25n < 0.45
        ? "a thickening reverberant haze"
        : pm25n < 0.7
          ? "dense, suffocating reverb fog"
          : "an overwhelming wall of reverb";
  const delayWord =
    pm10n < 0.2
      ? "soft rhythmic echoes"
      : pm10n < 0.45
        ? "cascading delay trails"
        : pm10n < 0.7
          ? "feedback-heavy repetitions"
          : "chaotic, self-amplifying echoes";
  const brightWord =
    o3n < 0.2
      ? "warm, open clarity"
      : o3n < 0.45
        ? "a slightly veiled brightness"
        : o3n < 0.7
          ? "darkening, closing overtones"
          : "suffocated, filtered darkness";
  const distWord =
    no2n < 0.15
      ? "clean warmth"
      : no2n < 0.35
        ? "subtle harmonic grit"
        : no2n < 0.6
          ? "prominent distortion, fraying edges"
          : "harsh, fractured signal\u2014like a cough";

  return `PM2.5 wraps each note in ${reverbWord}. Coarse particles scatter into ${delayWord}. Ozone shapes ${brightWord}. Nitrogen dioxide adds ${distWord}.`;
}