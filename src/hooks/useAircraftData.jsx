import { useEffect, useMemo, useState } from 'react';

const ADSB_LOL_URL = 'https://api.adsb.lol/v2/lat/-23.55/lon/-46.63/dist/250';
const REFRESH_INTERVAL_MS = 5500;

const AIRCRAFT_MOCK = [
  {
    id: 'AZU7427',
    callsign: 'AZU7427',
    latitude: -23.6316,
    longitude: -46.6574,
    altitude: 34000,
    speed: 450,
    heading: 55
  },
  {
    id: 'GLO1921',
    callsign: 'GLO1921',
    latitude: -3.1190,
    longitude: -60.0217,
    altitude: 38000,
    speed: 470,
    heading: 120
  },
  {
    id: 'LAT6075',
    callsign: 'LAT6075',
    latitude: -12.9868,
    longitude: -38.5108,
    altitude: 31000,
    speed: 430,
    heading: 250
  },
  {
    id: 'IBE3344',
    callsign: 'IBE3344',
    latitude: -1.4558,
    longitude: -48.5048,
    altitude: 36000,
    speed: 460,
    heading: 310
  }
];

function normalizeHeading(heading) {
  return ((heading % 360) + 360) % 360;
}

function driftPosition(latitude, longitude, heading, speed) {
  const distance = 0.04 + speed / 10000;
  const rad = (heading * Math.PI) / 180;
  return {
    latitude: latitude + Math.cos(rad) * distance * (Math.random() * 0.3 + 0.7),
    longitude: longitude + Math.sin(rad) * distance * (Math.random() * 0.3 + 0.7)
  };
}

function driftAircraft(planes) {
  return planes.map((plane) => {
    const nextHeading = normalizeHeading(plane.heading + (Math.random() * 12 - 6));
    const nextPos = driftPosition(plane.latitude, plane.longitude, nextHeading, plane.speed);

    return {
      ...plane,
      latitude: nextPos.latitude,
      longitude: nextPos.longitude,
      heading: nextHeading
    };
  });
}

function parseAdsbAircraft(raw, index) {
  if (!raw || typeof raw !== 'object') return null;

  const latitude = Number(raw.lat ?? 0);
  const longitude = Number(raw.lon ?? 0);
  const altitude = raw.alt_baro === 'ground' ? 0 : Number(raw.alt_baro ?? 0);
  const speed = Number(raw.gs ?? 0);
  const heading = Number(raw.track ?? 0);
  const callsignRaw = typeof raw.flight === 'string' ? raw.flight.trim() : '';
  const callsign = callsignRaw || 'UNK';
  const id = raw.icao ?? raw.hex ?? `aircraft-${index}`;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id,
    callsign,
    latitude,
    longitude,
    altitude: Number.isFinite(altitude) ? altitude : 0,
    speed: Number.isFinite(speed) ? speed : 0,
    heading: normalizeHeading(heading)
  };
}

function normalizeResponse(body) {
  if (!body || !Array.isArray(body.ac)) {
    return [];
  }

  return body.ac
    .map((item, index) => parseAdsbAircraft(item, index))
    .filter(Boolean);
}

function useAircraftData(useApi = true) {
  const [aircraft, setAircraft] = useState(AIRCRAFT_MOCK);
  const [apiSource, setApiSource] = useState(useApi ? 'api' : 'mock');
  const [statusMessage, setStatusMessage] = useState(
    useApi ? 'Tentando carregar dados da API ADSB.lol...' : 'Modo simulação local ativado.'
  );

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (!active) return;

      if (!useApi) {
        setApiSource('mock');
        setStatusMessage('Modo simulação local ativado.');
        setAircraft((prev) => driftAircraft(prev));
        return;
      }

      try {
        const response = await fetch(ADSB_LOL_URL, {
          cache: 'no-store'
        });

        if (!active) return;

        if (!response.ok) {
          setApiSource('mock');
          setStatusMessage(`ADSB.lol indisponível (${response.status}). Exibindo simulação local.`);
          setAircraft((prev) => driftAircraft(prev));
          return;
        }

        const body = await response.json();
        const parsed = normalizeResponse(body);

        if (parsed.length > 0) {
          setAircraft(parsed);
          setApiSource('api');
          setStatusMessage('Dados reais carregados da API ADSB.lol.');
        } else {
          setApiSource('mock');
          setStatusMessage('ADSB.lol retornou aeronaves inválidas. Usando simulação local.');
          setAircraft((prev) => driftAircraft(prev));
        }
      } catch (error) {
        setApiSource('mock');
        setStatusMessage('Falha ao carregar ADSB.lol. Usando simulação local.');
        setAircraft((prev) => driftAircraft(prev));
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [useApi]);

  return useMemo(
    () => ({ aircraft, apiSource, statusMessage }),
    [aircraft, apiSource, statusMessage]
  );
}

export default useAircraftData;
