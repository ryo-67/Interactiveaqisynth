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

// Seeded random for consistent data across renders
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMockAQIData(): AQIDataPoint[] {
  const data: AQIDataPoint[] = [];
  const startDate = new Date("2025-08-01");
  const endDate = new Date("2026-02-09");
  const rand = seededRandom(42);

  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Create smoother trends with independent pollutant variation
  let prevAqi = 45;
  let prevPm25 = 12;
  let prevPm10 = 25;
  let prevO3 = 30;
  let prevNo2 = 20;

  for (let i = 0; i <= daysDiff; i += 3) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const month = currentDate.getMonth();
    // Summer has higher ozone, winter has higher PM
    const summerFactor = month >= 5 && month <= 8 ? 1 : 0;
    const winterFactor = month >= 10 || month <= 2 ? 1 : 0;

    // Random walk for AQI with mean reversion
    const aqiTarget =
      50 + summerFactor * 25 + winterFactor * 15;
    prevAqi =
      prevAqi +
      (aqiTarget - prevAqi) * 0.15 +
      (rand() - 0.5) * 40;
    const aqi = Math.max(8, Math.min(195, Math.round(prevAqi)));

    // Independent pollutant random walks with different seasonal patterns
    prevPm25 =
      prevPm25 + (rand() - 0.45) * 15 + winterFactor * 2;
    prevPm25 = Math.max(3, Math.min(90, prevPm25));

    prevPm10 =
      prevPm10 + (rand() - 0.48) * 20 + winterFactor * 3;
    prevPm10 = Math.max(8, Math.min(140, prevPm10));

    prevO3 = prevO3 + (rand() - 0.5) * 12 + summerFactor * 4;
    prevO3 = Math.max(5, Math.min(95, prevO3));

    prevNo2 = prevNo2 + (rand() - 0.47) * 10 + winterFactor * 2;
    prevNo2 = Math.max(4, Math.min(85, prevNo2));

    // Occasional spikes
    const spikeChance = rand();
    const pm25 = Math.round(
      spikeChance > 0.92 ? prevPm25 * 2.5 : prevPm25,
    );
    const pm10 = Math.round(
      spikeChance > 0.88 ? prevPm10 * 2 : prevPm10,
    );
    const o3 = Math.round(
      spikeChance > 0.95 ? prevO3 * 2.2 : prevO3,
    );
    const no2 = Math.round(
      spikeChance > 0.9 ? prevNo2 * 2 : prevNo2,
    );

    let category: string;
    if (aqi <= 50) category = "Good";
    else if (aqi <= 100) category = "Moderate";
    else if (aqi <= 150)
      category = "Unhealthy for Sensitive Groups";
    else if (aqi <= 200) category = "Unhealthy";
    else category = "Very Unhealthy";

    // Pick main pollutant based on which is highest relative to its threshold
    const ratios = [
      { name: "PM2.5", ratio: pm25 / 35 },
      { name: "PM10", ratio: pm10 / 150 },
      { name: "O3", ratio: o3 / 70 },
      { name: "NO2", ratio: no2 / 53 },
    ];
    const mainPollutant = ratios.sort(
      (a, b) => b.ratio - a.ratio,
    )[0].name;

    data.push({
      date: currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      aqi,
      category,
      mainPollutant,
      pm25,
      pm10,
      o3,
      no2,
    });
  }

  return data;
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#68d89b";
  if (aqi <= 100) return "#e8cf6a";
  if (aqi <= 150) return "#e89b6a";
  if (aqi <= 200) return "#e86a6a";
  return "#b06ae8";
}

export function getAQIColorRGB(aqi: number): {
  r: number;
  g: number;
  b: number;
} {
  const color = getAQIColor(aqi);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return { r, g, b };
}

export function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

// Musical mapping descriptions for UI
export interface MusicMapping {
  mood: string;
  moodDescription: string;
  scale: string;
  scaleDescription: string;
  bpm: number;
  bpmDescription: string;
  feeling: string;
}

export function getMusicMapping(
  aqi: number,
  isTimelapse: boolean,
): MusicMapping {
  const baseBpm = isTimelapse
    ? Math.round(100 + (aqi / 200) * 45) // 100–145
    : Math.round(72 + (aqi / 200) * 38); // 72–110

  if (aqi <= 35) {
    return {
      mood: "Serene",
      moodDescription: "Clean air, open sky",
      scale: "Major Pentatonic",
      scaleDescription: "Five bright tones, no dissonance",
      bpm: baseBpm,
      bpmDescription: "Slow, unhurried breathing",
      feeling:
        "The air is clear and the city exhales softly. Long, singing notes drift through open intervals\u2014unhurried, pure, almost still. There is nothing to strain against.",
    };
  }
  if (aqi <= 65) {
    return {
      mood: "Dreamy",
      moodDescription: "A faint haze drifts in",
      scale: "Whole Tone",
      scaleDescription: "Equal steps, weightless ambiguity",
      bpm: baseBpm,
      bpmDescription: "Gentle forward drift",
      feeling:
        "Something imperceptible has entered the air. The whole-tone scale suspends gravity\u2014each note equidistant, floating, like sunlight filtered through gauze. The rhythm stays steady but the texture thickens.",
    };
  }
  if (aqi <= 100) {
    return {
      mood: "Pensive",
      moodDescription: "The city catches its breath",
      scale: "Dorian",
      scaleDescription: "Minor mode with bittersweet warmth",
      bpm: baseBpm,
      bpmDescription: "Walking pace, contemplative",
      feeling:
        "The pollution is present now. Minor thirds introduce a quiet heaviness, though Dorian\u2019s raised sixth keeps a thread of hope. Notes come more often, the rhythm occasionally stumbles\u2014like breath drawn a little shorter.",
    };
  }
  if (aqi <= 150) {
    return {
      mood: "Uneasy",
      moodDescription: "Tension tightens the chest",
      scale: "Phrygian",
      scaleDescription: "Dark flat-second, unresolved tension",
      bpm: baseBpm,
      bpmDescription: "Quickening, unsteady pulse",
      feeling:
        "The air thickens. Phrygian\u2019s flat second presses like a weight on the chest\u2014tense, suffocating, refusing resolution. Notes stutter and skip like labored breathing. The bass grows heavy and insistent.",
    };
  }
  return {
    mood: "Turbulent",
    moodDescription: "The city is coughing",
    scale: "Chromatic",
    scaleDescription: "All twelve tones, no center",
    bpm: baseBpm,
    bpmDescription: "Rapid, arrhythmic, breathless",
    feeling:
      "Dangerous air. All twelve chromatic tones jostle for space\u2014there is no key, no home, no rest. The rhythm lurches and gasps, beats are skipped like stifled coughs. Distortion frays every note. The city cannot breathe.",
  };
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