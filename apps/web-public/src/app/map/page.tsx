'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  : '/api';

interface ProjectLocation {
  location_id: string;
  latitude: number;
  longitude: number;
  project_id: string;
  project_name: string;
  case_id: string;
  case_title: string;
  risk_score: number;
  awarded_amount?: number;
  agency_acronym?: string;
  agency_name?: string;
}

function formatPHP(amount?: number): string {
  if (amount == null) return '—';
  if (amount >= 1_000_000_000) return `₱ ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000)     return `₱ ${(amount / 1_000_000).toFixed(1)}M`;
  return '₱ ' + amount.toLocaleString('en-PH');
}

export default function MapPage() {
  const [locations, setLocations] = useState<ProjectLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<ProjectLocation[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  // Load locations from API
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${API_URL}/projects/locations`, { next: { revalidate: 30 } });
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
          setFilteredLocations(data);
        }
      } catch (err) {
        console.error('Error fetching project locations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  // Filter locations based on search and risk filter
  useEffect(() => {
    let result = locations;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.project_name.toLowerCase().includes(q) ||
          (l.agency_name && l.agency_name.toLowerCase().includes(q)) ||
          (l.agency_acronym && l.agency_acronym.toLowerCase().includes(q))
      );
    }
    if (riskFilter !== 'all') {
      result = result.filter((l) => {
        if (riskFilter === 'high') return l.risk_score >= 0.70;
        if (riskFilter === 'medium') return l.risk_score >= 0.40 && l.risk_score < 0.70;
        return l.risk_score < 0.40;
      });
    }
    setFilteredLocations(result);
  }, [search, riskFilter, locations]);

  // Inject Leaflet scripts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet styles already added
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Check if Leaflet JS already added
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // Initialize and update the Leaflet map
  useEffect(() => {
    if (!mapLoaded || loading || typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map container if not already initialized
    if (!mapRef.current) {
      const map = L.map('map-viewport', { zoomControl: false }).setView([14.5995, 120.9842], 11);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Custom SVG Pin Creator
    const createMarkerIcon = (color: string) => {
      return L.divIcon({
        html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        </svg>`,
        className: styles.customPin,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -24],
      });
    };

    // Plot pins
    filteredLocations.forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;

      const score = loc.risk_score ?? 0;
      const color = score >= 0.70 ? '#C0392B' : score >= 0.40 ? '#D4821A' : '#1A5C2A';
      
      const icon = createMarkerIcon(color);
      const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(map);

      const popupHtml = `
        <div style="font-family: var(--font-ui), sans-serif; font-size: 13px; color: var(--color-ink); min-width: 220px; padding: 4px;">
          <h4 style="margin: 0 0 6px 0; font-family: var(--font-display); font-size: 15px; border-bottom: 1px solid var(--color-rule); padding-bottom: 4px; line-height: 1.2;">
            ${loc.project_name}
          </h4>
          <p style="margin: 4px 0;"><strong>Agency:</strong> ${loc.agency_acronym ?? loc.agency_name ?? 'Unknown'}</p>
          <p style="margin: 4px 0;"><strong>Award Value:</strong> ${formatPHP(loc.awarded_amount)}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <span style="font-size: 11px; font-weight: 600; padding: 2px 6px; background: ${score >= 0.7 ? 'var(--color-flag-light)' : score >= 0.4 ? 'var(--color-medium-light)' : 'var(--color-confirm-light)'}; color: ${score >= 0.7 ? 'var(--color-flag)' : score >= 0.4 ? 'var(--color-medium)' : 'var(--color-confirm)'}; border: 1px solid currentColor;">
              RISK: ${(score * 100).toFixed(0)}%
            </span>
            <a href="/cases/${loc.case_id}" style="font-size: 11px; font-weight: 600; color: var(--color-data-blue); text-decoration: underline;">
              View Case &rarr;
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersRef.current.set(loc.location_id, marker);
    });

    // Fit map bounds to show NCR if filtered list is not empty
    if (filteredLocations.length > 0) {
      const latlngs = filteredLocations
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => [l.latitude, l.longitude]);
      if (latlngs.length > 0) {
        map.fitBounds(latlngs, { maxZoom: 13, padding: [40, 40] });
      }
    }
  }, [mapLoaded, filteredLocations, loading]);

  const selectProject = (loc: ProjectLocation) => {
    if (!mapRef.current) return;
    const marker = markersRef.current.get(loc.location_id);
    if (marker) {
      mapRef.current.setView([loc.latitude, loc.longitude], 14);
      marker.openPopup();
    }
  };

  return (
    <div className={styles.pageShell}>

      {/* Main Layout Container */}
      <div className={styles.contentWrap}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={`${styles.sidebarTitle} font-display`}>Procurement Map</h1>
            <p className={`${styles.sidebarSubtitle} font-ui`}>
              Geospatial view of project integrity risks
            </p>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.inputGroup}>
              <label className="font-ui">Search Projects</label>
              <input
                type="text"
                placeholder="Search name, agency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${styles.textInput} font-body`}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className="font-ui">Risk Classification</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className={`${styles.selectInput} font-ui`}
              >
                <option value="all">All Risk Levels</option>
                <option value="high">Critical (≥ 70%)</option>
                <option value="medium">Moderate (40% - 69%)</option>
                <option value="low">Low (&lt; 40%)</option>
              </select>
            </div>
          </div>

          {/* Project List */}
          <div className={styles.projectList}>
            {loading ? (
              <div className={`${styles.statusMessage} font-ui`}>Loading project details...</div>
            ) : filteredLocations.length === 0 ? (
              <div className={`${styles.statusMessage} font-ui`}>No projects found.</div>
            ) : (
              filteredLocations.map((loc) => {
                const score = loc.risk_score ?? 0;
                const riskColorClass =
                  score >= 0.7
                    ? styles.pipCritical
                    : score >= 0.4
                    ? styles.pipModerate
                    : styles.pipLow;

                return (
                  <button
                    key={loc.location_id}
                    onClick={() => selectProject(loc)}
                    className={styles.projectItem}
                  >
                    <div className={styles.projectHeader}>
                      <span className={`${styles.projectTitleText} font-body`}>
                        {loc.project_name}
                      </span>
                      <span className={`${styles.riskPip} ${riskColorClass} font-mono`}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className={`${styles.projectMeta} font-ui`}>
                      <span>{loc.agency_acronym ?? 'Agency'}</span>
                      <span>&bull;</span>
                      <span>{formatPHP(loc.awarded_amount)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Map Container */}
        <div className={styles.mapContainer}>
          {loading && (
            <div className={styles.mapLoadingOverlay}>
              <span className="font-display">Initializing Map...</span>
            </div>
          )}
          <div id="map-viewport" className={styles.mapViewport} />
        </div>
      </div>
    </div>
  );
}
