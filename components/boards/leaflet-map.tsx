import { useEffect, useRef } from "react";
import L from "leaflet";

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  tasks: any[];
  count: number;
  color: string;
}

interface LeafletMapProps {
  locations: MapLocation[];
  selectedLocation: string | null;
  onSelectLocation: (name: string | null) => void;
}

function createColoredIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

export default function LeafletMap({ locations, selectedLocation, onSelectLocation }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (locations.length === 0) return;

    const markers: L.Marker[] = locations.map((loc) => {
      const isSelected = selectedLocation === loc.name;
      const icon = createColoredIcon(loc.color);

      const marker = L.marker([loc.lat, loc.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:12px;font-weight:600;margin-bottom:4px">${loc.name}</div>` +
          `<div style="font-size:10px;color:#666">${loc.count} task${loc.count !== 1 ? "s" : ""}</div>`
        );

      marker.on("click", () => {
        onSelectLocation(isSelected ? null : loc.name);
      });

      return marker;
    });

    markersRef.current = markers;

    if (locations.length > 0 && !selectedLocation) {
      const lats = locations.map((l) => l.lat);
      const lngs = locations.map((l) => l.lng);
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }

    if (selectedLocation) {
      const loc = locations.find((l) => l.name === selectedLocation);
      if (loc) {
        map.setView([loc.lat, loc.lng], 8);
      }
    }
  }, [locations, selectedLocation, onSelectLocation]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px] z-0" />;
}
