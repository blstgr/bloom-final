import type { OpenMeteoForecastResponse, OpenMeteoGeocodingResponse } from './types';
import { getForecast, reverseGeocode, searchLocations } from './weatherApi';

function mockFetchOnce(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValueOnce(response) as unknown as typeof fetch;
}

function mockFetchRejectionOnce() {
  global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('offline')) as unknown as typeof fetch;
}

function lastRequestedUrl(): string {
  return (global.fetch as unknown as jest.Mock).mock.calls[0][0] as string;
}

describe('searchLocations', () => {
  it('maps a geocoding result onto the app-facing shape', async () => {
    const payload: OpenMeteoGeocodingResponse = {
      results: [
        {
          admin1: 'Kyiv City',
          country: 'Ukraine',
          id: 703448,
          latitude: 50.45,
          longitude: 30.52,
          name: 'Kyiv',
          timezone: 'Europe/Kyiv',
        },
      ],
    };
    mockFetchOnce({ json: () => Promise.resolve(payload), ok: true });

    await expect(searchLocations('Kyiv')).resolves.toEqual([
      {
        admin1: 'Kyiv City',
        country: 'Ukraine',
        latitude: 50.45,
        locationId: '703448',
        longitude: 30.52,
        name: 'Kyiv',
        timezone: 'Europe/Kyiv',
      },
    ]);
  });

  it('treats an omitted results field as no matches', async () => {
    // Open-Meteo leaves `results` out entirely rather than returning an empty array.
    mockFetchOnce({ json: () => Promise.resolve({}), ok: true });

    await expect(searchLocations('Nowherecity')).resolves.toEqual([]);
  });

  it('does not call the API at all for a blank query', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(searchLocations('   ')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('percent-encodes a city name with a space', async () => {
    mockFetchOnce({ json: () => Promise.resolve({}), ok: true });

    await searchLocations('New York');

    expect(lastRequestedUrl()).toContain('name=New%20York');
  });

  it('reports an unreachable network as a network failure', async () => {
    mockFetchRejectionOnce();

    await expect(searchLocations('Kyiv')).rejects.toMatchObject({
      kind: 'network',
      name: 'WeatherApiError',
    });
  });
});

describe('getForecast', () => {
  const payload: OpenMeteoForecastResponse = {
    daily: {
      et0_fao_evapotranspiration: [2.24, 2.97],
      precipitation_sum: [0.6, 0],
      relative_humidity_2m_mean: [71, 68],
      temperature_2m_max: [21.2, 24.4],
      time: ['2026-09-19', '2026-09-20'],
    },
    latitude: 50.4375,
    longitude: 30.5,
    timezone: 'Europe/Kyiv',
  };

  it('zips the parallel daily arrays into one series per day', async () => {
    mockFetchOnce({ json: () => Promise.resolve(payload), ok: true });

    const forecast = await getForecast(50.45, 30.52);

    expect(forecast.days).toEqual([
      { date: '2026-09-19', et0: 2.24, humidityMean: 71, precipitation: 0.6, temperatureMax: 21.2 },
      { date: '2026-09-20', et0: 2.97, humidityMean: 68, precipitation: 0, temperatureMax: 24.4 },
    ]);
    expect(forecast.timezone).toBe('Europe/Kyiv');
  });

  it('requests evapotranspiration, which is what the adjustment actually reads', async () => {
    mockFetchOnce({ json: () => Promise.resolve(payload), ok: true });

    await getForecast(50.45, 30.52);

    expect(lastRequestedUrl()).toContain('et0_fao_evapotranspiration');
  });

  it('surfaces a rate limit distinctly from other failures', async () => {
    mockFetchOnce({ ok: false, status: 429, text: () => Promise.resolve('slow down') });

    await expect(getForecast(50.45, 30.52)).rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it('reports any other bad status as unknown, keeping the status in the message', async () => {
    mockFetchOnce({ ok: false, status: 500, text: () => Promise.resolve('boom') });

    await expect(getForecast(50.45, 30.52)).rejects.toMatchObject({
      kind: 'unknown',
      message: expect.stringContaining('500'),
      name: 'WeatherApiError',
    });
  });
});

describe('reverseGeocode', () => {
  it('prefers the city boundary over the city field where they disagree', async () => {
    // Real response shape for Kharkiv: `city` names the surrounding raion, the level-8
    // administrative boundary names the city itself.
    mockFetchOnce({
      json: () => Promise.resolve({
        city: 'Kharkiv Raion',
        countryName: 'Ukraine',
        localityInfo: {
          administrative: [
            { adminLevel: 4, name: 'Kharkivska oblast' },
            { adminLevel: 6, name: 'Kharkiv Raion' },
            { adminLevel: 8, name: 'Kharkiv' },
          ],
        },
        principalSubdivision: 'Kharkivska oblast',
      }),
      ok: true,
    });

    await expect(reverseGeocode(49.9935, 36.2304)).resolves.toMatchObject({ name: 'Kharkiv' });
  });

  it('falls back to the city field where no city boundary is mapped', async () => {
    // Kyiv has no level-8 boundary, and its `city` field is already correct.
    mockFetchOnce({
      json: () => Promise.resolve({
        city: 'Kyiv',
        countryName: 'Ukraine',
        localityInfo: { administrative: [{ adminLevel: 4, name: 'Kyiv City' }] },
      }),
      ok: true,
    });

    await expect(reverseGeocode(50.4501, 30.5234)).resolves.toMatchObject({ name: 'Kyiv' });
  });

  it('keeps the coordinates usable when the service names nothing', async () => {
    // The forecast only ever needs the coordinates, so a nameless answer is still a working one.
    mockFetchOnce({ json: () => Promise.resolve({}), ok: true });

    await expect(reverseGeocode(49.9935, 36.2304)).resolves.toMatchObject({
      latitude: 49.9935,
      longitude: 36.2304,
      name: 'Current location',
    });
  });

  it('keeps the coordinates usable when the service is unreachable', async () => {
    mockFetchRejectionOnce();

    await expect(reverseGeocode(49.9935, 36.2304)).resolves.toMatchObject({
      latitude: 49.9935,
      name: 'Current location',
    });
  });
});
