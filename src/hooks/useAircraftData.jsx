// src/hooks/useAircraftData.jsx
import { useEffect, useMemo, useState } from 'react';

const ADSB_LOL_URL = 'https://api.adsb.lol/v2/lat/-23.55/lon/-46.63/dist/250';
// Proxy CORS públicos alternativos
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const REFRESH_INTERVAL_MS = 5500;

const AIRCRAFT_MOCK = [
  // ... seu mock aqui (sem alterações)
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

async function fetchAircraftDataWithFallback() {
  // Tentativa 1: URL direta (pode falhar com CORS, mas tenta)
  try {
    const response = await fetch(ADSB_LOL_URL, {
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = normalizeResponse(data);
      if (parsed.length > 0) {
        return { data: parsed, source: 'api-direct', status: 'success' };
      }
    }
  } catch (error) {
    // Silenciosamente falha, tenta proxy
  }

  // Tentativa 2: Usar proxy CORS
  for (const proxyUrl of CORS_PROXIES) {
    try {
      const proxiedUrl = proxyUrl + encodeURIComponent(ADSB_LOL_URL);
      const response = await fetch(proxiedUrl, {
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = normalizeResponse(data);
        if (parsed.length > 0) {
          return { data: parsed, source: 'api-proxy', status: 'success' };
        }
      }
    } catch (error) {
      // Continua para próximo proxy
    }
  }

  // Falha em todas as tentativas
  return { data: null, source: 'error', status: 'failed' };
}

function useAircraftData(useApi = true) {
  const [aircraft, setAircraft] = useState(AIRCRAFT_MOCK);
  const [apiSource, setApiSource] = useState(useApi ? 'api' : 'mock');
  const [statusMessage, setStatusMessage] = useState(
    useApi ? 'Carregando dados de aeronaves...' : 'Modo simulação local ativado.'
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

      const result = await fetchAircraftDataWithFallback();

      if (!active) return;

      if (result.status === 'success' && result.data.length > 0) {
        setAircraft(result.data);
        setApiSource('api');
        setStatusMessage('✓ Dados reais da API ADSB.lol');
      } else {
        // Fallback para mock se API falhar
        setApiSource('mock');
        setStatusMessage('API indisponível • Usando simulação local');
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