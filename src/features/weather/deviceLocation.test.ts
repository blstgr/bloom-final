import { searchLocations } from '../../services/weatherApi';

import { detectDeviceLocation, getDeviceTimeZoneCity } from './deviceLocation';

const mockedSearchLocations = searchLocations as jest.MockedFunction<typeof searchLocations>;

function mockTimeZone(timeZone: string | undefined) {
  jest
    .spyOn(Intl, 'DateTimeFormat')
    .mockReturnValue({ resolvedOptions: () => ({ timeZone }) } as unknown as Intl.DateTimeFormat);
}

afterEach(() => {
  jest.restoreAllMocks();
  mockedSearchLocations.mockReset();
});

describe('getDeviceTimeZoneCity', () => {
  it('takes the city segment of an IANA zone', () => {
    mockTimeZone('Europe/Kyiv');

    expect(getDeviceTimeZoneCity()).toBe('Kyiv');
  });

  it('turns underscores back into spaces', () => {
    mockTimeZone('America/New_York');

    expect(getDeviceTimeZoneCity()).toBe('New York');
  });

  it('takes the last segment of a three-part zone', () => {
    mockTimeZone('America/Argentina/Buenos_Aires');

    expect(getDeviceTimeZoneCity()).toBe('Buenos Aires');
  });

  it('gives up on a zone that names no city', () => {
    mockTimeZone('UTC');

    expect(getDeviceTimeZoneCity()).toBeNull();
  });

  it('gives up when the platform reports no zone at all', () => {
    mockTimeZone(undefined);

    expect(getDeviceTimeZoneCity()).toBeNull();
  });
});

describe('detectDeviceLocation', () => {
  it('keeps the device spelling of the city and the geocoder coordinates', async () => {
    // Open-Meteo answers the query "Kyiv" with a place it calls "Kiev".
    mockTimeZone('Europe/Kyiv');
    mockedSearchLocations.mockResolvedValue([
      {
        country: 'Ukraine',
        latitude: 50.45,
        locationId: '703448',
        longitude: 30.52,
        name: 'Kiev',
        timezone: 'Europe/Kyiv',
      },
    ]);

    await expect(detectDeviceLocation()).resolves.toMatchObject({
      latitude: 50.45,
      longitude: 30.52,
      name: 'Kyiv',
    });
  });

  it('resolves to null when the geocoder knows no such place', async () => {
    mockTimeZone('Europe/Kyiv');
    mockedSearchLocations.mockResolvedValue([]);

    await expect(detectDeviceLocation()).resolves.toBeNull();
  });

  it('does not call the geocoder when no city can be derived', async () => {
    mockTimeZone('UTC');

    await expect(detectDeviceLocation()).resolves.toBeNull();
    expect(mockedSearchLocations).not.toHaveBeenCalled();
  });
});

describe('renamed time zones', () => {
  it('reports the current name for a zone IANA has since renamed', () => {
    // Devices still report the backward-compatible alias years later; this machine does.
    mockTimeZone('Europe/Kiev');

    expect(getDeviceTimeZoneCity()).toBe('Kyiv');
  });

  it('reports the current name when the device already uses the new zone', () => {
    mockTimeZone('Europe/Kyiv');

    expect(getDeviceTimeZoneCity()).toBe('Kyiv');
  });

  it('matches on the whole zone, not the city segment', () => {
    // A same-named city in another region must not inherit the rename.
    mockTimeZone('America/Kiev');

    expect(getDeviceTimeZoneCity()).toBe('Kiev');
  });
});
