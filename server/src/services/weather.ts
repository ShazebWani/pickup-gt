interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
}

export interface WeatherSnapshot {
  tempF: number;
  precipProbability: number;
  conditionCode: number;
}

/**
 * Fetches Open-Meteo's hourly forecast and picks the bucket nearest to
 * `startTime`. Returns null if the forecast can't be fetched (start time
 * far outside the forecast window, network error, etc.) so callers can
 * store weather: null rather than fail game creation.
 */
export async function getWeatherAt(
  lat: number,
  lng: number,
  startTime: Date
): Promise<WeatherSnapshot | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set(
    'hourly',
    'temperature_2m,precipitation_probability,weather_code'
  );
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('forecast_days', '16');
  url.searchParams.set('timezone', 'America/New_York');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as OpenMeteoResponse;
    const times = data.hourly.time.map((t) => new Date(t).getTime());
    if (times.length === 0) return null;

    const target = startTime.getTime();
    let closestIndex = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(times[i] - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return {
      tempF: data.hourly.temperature_2m[closestIndex],
      precipProbability: data.hourly.precipitation_probability[closestIndex],
      conditionCode: data.hourly.weather_code[closestIndex],
    };
  } catch {
    return null;
  }
}
