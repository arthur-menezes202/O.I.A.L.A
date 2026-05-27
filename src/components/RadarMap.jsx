import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import useAircraftData from '../hooks/useAircraftData.jsx';
import styles from './RadarMap.module.css';

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createAircraftIcon(heading) {
  return new DivIcon({
    className: styles.aircraftMarker,
    html: `<div class="${styles.aircraftIcon}" style="transform: rotate(${heading}deg)">✈</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function SetMapView({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RadarMap() {
  const [useApi, setUseApi] = useState(true);
  const { aircraft, apiSource, statusMessage } = useAircraftData(useApi);
  const initialCenter = useMemo(() => [-14.235004, -51.92528], []);
  const [userLocation, setUserLocation] = useState(null);
  const [zoom, setZoom] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCenter, setSearchCenter] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setZoom(12);
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const visibleAircraft = useMemo(() => {
    if (!userLocation) return aircraft;
    const filtered = aircraft.filter((plane) => distanceKm(userLocation, [plane.latitude, plane.longitude]) <= 10);
    return filtered.length > 0 ? filtered : aircraft;
  }, [aircraft, userLocation]);

  const center = searchCenter || userLocation || initialCenter;

  function handleSearch(event) {
    event.preventDefault();
    const query = searchTerm.trim().toUpperCase();

    if (!query) {
      setSearchMessage('Digite uma sigla ou callsign para pesquisar.');
      setSearchCenter(null);
      return;
    }

    const target = aircraft.find((plane) => plane.callsign.trim().toUpperCase() === query || plane.id.trim().toUpperCase() === query);

    if (target) {
      setSearchCenter([target.latitude, target.longitude]);
      setZoom(11);
      setSearchMessage(`Avião ${target.callsign} encontrado. Centralizando no mapa.`);
      return;
    }

    setSearchCenter(null);
    setSearchMessage('Avião não existe ou não está voando na área atual.');
  }

  return (
    <div className={styles.mapRoot}>
      <div className={styles.statusBar} role="status">
        <div className={styles.statusLeft}>
          <span className={styles.statusBadge}>{apiSource === 'api' ? 'LIVE' : 'MOCK'}</span>
          <span className={styles.statusText}>{statusMessage}</span>
        </div>
        <div className={styles.statusRight}>
          <button
            className={styles.smallAction}
            onClick={() => {
              setUseApi((c) => !c);
            }}
          >
            {useApi ? 'Simulação' : 'API'}
          </button>
        </div>
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchHeader}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              className={styles.searchInput}
              placeholder="Pesquisar sigla de avião"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Pesquisar sigla de avião"
            />
          </form>

          <div className={styles.searchActions}>
            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
            >
              Buscar
            </button>
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => {
                setUseApi((current) => !current);
                setSearchMessage('');
              }}
            >
              {useApi ? 'Usar simulação' : 'Usar API'}
            </button>
          </div>
        </div>
        {searchMessage && <div className={styles.searchMessage}>{searchMessage}</div>}
      </div>

      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className={styles.mapContainer}>
        <SetMapView center={center} zoom={zoom} />
        <TileLayer url={DARK_TILE} attribution={ATTRIBUTION} />

        {visibleAircraft.map((plane) => (
          <Marker
            key={plane.id}
            position={[plane.latitude, plane.longitude]}
            icon={createAircraftIcon(plane.heading)}
          >
            <Popup className={styles.popup}>
              <div className={styles.popupContent}>
                <h2>{plane.callsign}</h2>
                <p>
                  <strong>Altitude:</strong> {plane.altitude.toLocaleString()} ft
                </p>
                <p>
                  <strong>Velocidade:</strong> {plane.speed} kt
                </p>
                <p>
                  <strong>Heading:</strong> {plane.heading}&deg;
                </p>
                <p>
                  <strong>Coordenadas:</strong> {plane.latitude.toFixed(4)}, {plane.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default RadarMap;
