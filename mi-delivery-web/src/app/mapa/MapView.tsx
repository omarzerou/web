"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CAT_COLOR: Record<string, string> = {
  Kebabs: "#FF6B35",
  Hamburguesas: "#E63946",
  Pizza: "#F4A261",
  Asiático: "#2A9D8F",
  Sushi: "#264653",
  Pasta: "#E9C46A",
  India: "#6C5DD3",
};

function makeIcon(color: string, selected: boolean) {
  const size = selected ? 48 : 38;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="${color}" stroke="white" stroke-width="3" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.3))"/>
      <text x="24" y="30" text-anchor="middle" font-size="20" fill="white">🍽️</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

type Restaurant = {
  id: string;
  name: string;
  description: string;
  address: string;
  category: string;
  deliveryTime: string;
  rating: string;
  priceLevel: string;
  img: string;
  lat: number;
  lng: number;
};

interface MapViewProps {
  restaurants: Restaurant[];
  selected: Restaurant | null;
  onSelect: (r: Restaurant | null) => void;
  center?: [number, number];
}

export default function MapView({ restaurants, selected, onSelect, center }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: center || [36.133, -5.451], // Default Algeciras
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Intentionally only run once

  // Recenter if center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, 13);
    }
  }, [center]);

  // Update markers whenever restaurants or selected changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    // Add new markers
    restaurants.forEach(r => {
      const isSelected = selected?.id === r.id;
      const color = CAT_COLOR[r.category] || "#FF6B35";
      const icon = makeIcon(color, isSelected);

      const marker = L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;padding:4px">
            <img src="${r.img}" alt="${r.name}"
              style="width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px" />
            <div style="font-weight:800;font-size:15px;color:#1B1B1B;margin-bottom:4px">${r.name}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="background:${color};color:#fff;font-size:10px;font-weight:700;border-radius:6px;padding:2px 7px">${r.category}</span>
              <span style="font-size:12px;color:#888">${r.priceLevel}</span>
              <span style="font-size:12px;font-weight:700;color:#FFBE00">★ ${r.rating}</span>
            </div>
            <div style="font-size:12px;color:#AAAAAA;margin-bottom:4px">📍 ${r.address}</div>
            <div style="font-size:12px;color:#AAAAAA;margin-bottom:10px">🕐 ${r.deliveryTime} min de entrega</div>
            <a href="/restaurant/${(r as any).slug || r.id}"
              style="display:block;background:linear-gradient(135deg,#FF6B35,#FFBE00);color:#fff;
                     font-weight:800;font-size:13px;text-align:center;padding:10px;
                     border-radius:10px;text-decoration:none">
              Ver menú y pedir →
            </a>
          </div>
        `, { maxWidth: 260 });

      marker.on("click", () => onSelect(r));
      markersRef.current.set(r.id, marker);
    });
  }, [restaurants, selected, onSelect]);

  // Pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo([selected.lat, selected.lng], 16, { duration: 0.8 });
    const marker = markersRef.current.get(selected.id);
    if (marker) marker.openPopup();
  }, [selected]);

  return (
    <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
  );
}
