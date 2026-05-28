import { useEffect, useMemo, useState } from 'react';

const OPEN_SKY_URL = 'https://opensky-network.org/api/states/all?lamin=-40&lomin=-75&lamax=10&lomax=-3';
const PROXY_URL = '/api/opensky?lamin=-40&lomin=-75&lamax=10&lomax=-3';
const INITIAL_REFRESH_MS = 6000;
const MAX_RETRY_MS = 60000;
const CLIENT_ID = 'armeneze-api-client';
const PASSWORD = 'adminmais';

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

function parseAircraft(raw, index) {
  if (!raw) return null;

  const isStateArray = Array.isArray(raw);
  const latitude = Number(
    isStateArray
      ? raw[6]
      : raw.latitude ?? raw.lat ?? raw[6] ?? raw[1]
  );
  const longitude = Number(
    isStateArray
      ? raw[5]
      : raw.longitude ?? raw.lon ?? raw.lng ?? raw[2]
  );
  const altitude = Number(
    isStateArray ? raw[13] ?? raw[7] : raw.geo_altitude ?? raw.altitude ?? raw[4] ?? raw[7] ?? 0
  );
  const speed = Number(
    isStateArray ? raw[9] : raw.velocity ?? raw.speed ?? raw.gs ?? raw[9] ?? 0
  );
  const heading = Number(
    isStateArray ? raw[10] : raw.heading ?? raw.track ?? raw.true_track ?? raw[10] ?? 0
  );
  const callsign = isStateArray
    ? raw[1] ?? raw[0] ?? `AIR-${index}`
    : raw.callsign ?? raw.registration ?? raw.icao24 ?? raw[0] ?? `AIR-${index}`;
  const id = isStateArray
    ? raw[0] ?? callsign ?? `aircraft-${index}`
    : raw.icao24 ?? raw.id ?? callsign ?? `aircraft-${index}`;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      id,
      callsign: callsign.toString().trim() || `AIR-${index}`,
      latitude,
      longitude,
      altitude: Number.isFinite(altitude) ? altitude : 0,
      speed: Number.isFinite(speed) ? speed : 0,
      heading: normalizeHeading(heading)
    };
  }

  return null;
}

function normalizeResponse(body) {
  if (!body) return [];

  if (Array.isArray(body)) {
    return body.map((item, index) => parseAircraft(item, index)).filter(Boolean);
  }

  if (Array.isArray(body.states)) {
    return body.states.map((item, index) => parseAircraft(item, index)).filter(Boolean);
  }

  if (Array.isArray(body.data)) {
    return body.data.map((item, index) => parseAircraft(item, index)).filter(Boolean);
  }

  if (Array.isArray(body.results)) {
    return body.results.map((item, index) => parseAircraft(item, index)).filter(Boolean);
  }

  return [];
}

function useAircraftData(useApi = true) {
  const [aircraft, setAircraft] = useState(AIRCRAFT_MOCK);
  const [apiSource, setApiSource] = useState(useApi ? 'api' : 'mock');
  const [statusMessage, setStatusMessage] = useState(
    useApi ? 'Tentando carregar dados da API OpenSky...' : 'Modo simulação local ativado.'
  );

  useEffect(() => {
    let active = true;
    let timer = 0;
    let delay = INITIAL_REFRESH_MS;

    async function refresh() {
      if (!active) return;

      if (!useApi) {
        setApiSource('mock');
        setStatusMessage('Modo simulação local ativado.');
        setAircraft((prev) => driftAircraft(prev));
        timer = window.setTimeout(refresh, INITIAL_REFRESH_MS);
        return;
      }

      try {
        const apiUrl = import.meta.env.DEV ? PROXY_URL : OPEN_SKY_URL;
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa(CLIENT_ID + ':' + PASSWORD));
        const response = await fetch(apiUrl, { 
          cache: 'no-store',
          headers: headers
        });
        if (!active) return;

        if (!response.ok) {
          setApiSource('mock');
          if (response.status === 429) {
            delay = Math.min(delay * 2, MAX_RETRY_MS);
            setStatusMessage(`Taxa limite atingida (429). Usando simulação local e tentando novamente em ${delay / 1000}s.`);
          } else {
            delay = 30000;
            setStatusMessage(`API indisponível (${response.status}). Usando simulação local.`);
          }
          setAircraft((prev) => driftAircraft(prev));
        } else {
          const body = await response.json();
          const parsed = normalizeResponse(body);

          if (parsed.length > 0) {
            setAircraft(parsed);
            setApiSource('api');
            setStatusMessage('Dados reais carregados da API OpenSky.');
            delay = INITIAL_REFRESH_MS;
          } else {
            setApiSource('mock');
            setStatusMessage('API retornou sem aeronaves válidas. Usando simulação local.');
            setAircraft((prev) => driftAircraft(prev));
            delay = 30000;
          }
        }
      } catch (error) {
        delay = Math.min(delay * 2, MAX_RETRY_MS);
        setApiSource('mock');
        setStatusMessage('Falha na conexão com a API. Usando simulação local.');
        setAircraft((prev) => driftAircraft(prev));
      } finally {
        if (active) {
          timer = window.setTimeout(refresh, delay);
        }
      }
    }

    refresh();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [useApi]);

  return useMemo(
    () => ({ aircraft, apiSource, statusMessage }),
    [aircraft, apiSource, statusMessage]
  );
}

export default useAircraftData;
