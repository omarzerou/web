"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect } from "react";
import { MapPin, Star, Clock, ChevronLeft, Store, X } from "lucide-react";

// ─── DATA: restaurantes con coordenadas (Algeciras y alrededores) ─────────────
const MAP_RESTAURANTS = [
  {
    id: "demo1",
    name: "McDonald's | Centro",
    description: "I'm Lovin' it",
    address: "Calle Juan de la Cosa, 2, Algeciras",
    category: "Hamburguesas",
    deliveryTime: "10-20",
    rating: "8.0",
    priceLevel: "€€",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    lat: 36.1344,
    lng: -5.4530,
  },
  {
    id: "demo2",
    name: "Chinacy",
    description: "Cocina china auténtica",
    address: "Av. Virgen del Carmen, 45, Algeciras",
    category: "Asiático",
    deliveryTime: "15-25",
    rating: "9.2",
    priceLevel: "€€€",
    img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
    lat: 36.1280,
    lng: -5.4512,
  },
  {
    id: "demo3",
    name: "Five Guys Burguer",
    description: "Hamburguesas artesanas desde 1986",
    address: "Centro Comercial La Línea, Local 12",
    category: "Hamburguesas",
    deliveryTime: "15-25",
    rating: "9.4",
    priceLevel: "€€€",
    img: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop",
    lat: 36.1410,
    lng: -5.3580,
  },
  {
    id: "demo4",
    name: "Spicy Sichuan",
    description: "Alta cocina picante, servida con alma",
    address: "Calle Tarifa, 18, Algeciras",
    category: "Asiático",
    deliveryTime: "25-35",
    rating: "9.4",
    priceLevel: "€€€",
    img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop",
    lat: 36.1315,
    lng: -5.4498,
  },
  {
    id: "demo5",
    name: "Taste of India",
    description: "Auténtica cocina india con especias frescas",
    address: "Paseo de la Conferencia, 8, Algeciras",
    category: "India",
    deliveryTime: "20-30",
    rating: "9.0",
    priceLevel: "€€",
    img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
    lat: 36.1295,
    lng: -5.4560,
  },
  {
    id: "demo6",
    name: "Vapiano Algeciras",
    description: "Pasta casera, pizza aromática y crujiente",
    address: "Av. del Puerto, 23, Algeciras",
    category: "Pasta",
    deliveryTime: "15-25",
    rating: "8.4",
    priceLevel: "€€€",
    img: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=400&h=300&fit=crop",
    lat: 36.1358,
    lng: -5.4488,
  },
  {
    id: "demo7",
    name: "Paloma Blanca",
    description: "Comida para llevar (100% Halal)",
    address: "Avda Andalucia, N. 47, Palmones",
    category: "Kebabs",
    deliveryTime: "10-20",
    rating: "9.5",
    priceLevel: "€",
    img: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",
    lat: 36.1770,
    lng: -5.4410,
  },
  {
    id: "demo8",
    name: "Tokyo Sushi",
    description: "Sushi y rolls artesanos al momento",
    address: "Calle San Bernardo, 10, Algeciras",
    category: "Sushi",
    deliveryTime: "20-35",
    rating: "9.1",
    priceLevel: "€€€",
    img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
    lat: 36.1302,
    lng: -5.4520,
  },
  {
    id: "demo9",
    name: "Kebab Istanbul",
    description: "Auténtico sabor turco en cada bocado",
    address: "Calle Alfonso XI, 5, Algeciras",
    category: "Kebabs",
    deliveryTime: "10-15",
    rating: "8.6",
    priceLevel: "€",
    img: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",
    lat: 36.1370,
    lng: -5.4505,
  },
  {
    id: "demo10",
    name: "Pizza Roma",
    description: "Pizza napolitana al horno de leña",
    address: "Calle Cayetano del Toro, 15, Algeciras",
    category: "Pizza",
    deliveryTime: "20-30",
    rating: "9.3",
    priceLevel: "€€",
    img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
    lat: 36.1320,
    lng: -5.4470,
  },
];

const CATEGORIES = ["Todos", "Kebabs", "Hamburguesas", "Pizza", "Asiático", "Sushi", "Pasta", "India"];

// Colores por categoría
const CAT_COLOR: Record<string, string> = {
  Kebabs: "#FF6B35",
  Hamburguesas: "#E63946",
  Pizza: "#F4A261",
  Asiático: "#2A9D8F",
  Sushi: "#264653",
  Pasta: "#E9C46A",
  India: "#E76F51",
};

// ─── Leaflet Map (dynamic, no SSR) ────────────────────────────────────────────
const MapView = dynamic(() => import("./MapView"), { ssr: false });

const CITY_COORDS: Record<string, [number, number]> = {
  // España
  "Algeciras": [36.133, -5.451],
  "Málaga": [36.721, -4.421],
  "Sevilla": [37.389, -5.984],
  "Madrid": [40.416, -3.703],
  "Barcelona": [41.385, 2.173],
  // Marruecos
  "Tánger": [35.759, -5.834],
  "Rabat": [34.020, -6.841],
  "Casablanca": [33.573, -7.589],
  "Marrakech": [31.629, -7.981],
  // Francia
  "París": [48.856, 2.352],
  "Lyon": [45.764, 4.835],
  "Marsella": [43.296, 5.369],
  // Portugal
  "Lisboa": [38.722, -9.139],
  "Oporto": [41.157, -8.629],
  "Faro": [37.019, -7.932],
  // Italia
  "Roma": [41.902, 12.496],
  "Milán": [45.464, 9.190],
  "Nápoles": [40.851, 14.268],
  "Turín": [45.070, 7.686],
  // Alemania
  "Berlín": [52.520, 13.405],
  "Múnich": [48.135, 11.582],
  "Fráncfort": [50.110, 8.682],
  "Hamburgo": [53.551, 9.993],
  // Suiza
  "Zúrich": [47.376, 8.541],
  "Ginebra": [46.204, 6.143],
  "Basilea": [47.559, 7.588],
  "Berna": [46.948, 7.447]
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  useEffect(() => {
    fetch("http://localhost:4000/api/restaurants")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((r: any, index: number) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || r.address || "Local asociado",
            address: r.address || "Dirección no disponible",
            category: r.categories?.[0] || "Hamburguesas",
            deliveryTime: r.delivery || "15-30",
            rating: r.rating || "Nuevo",
            priceLevel: "€€",
            img: r.imageUrl || "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",
            lat: r.lat || (36.1330 + (index * 0.003)),
            lng: r.lng || (-5.4510 - (index * 0.002))
          }));
          setRestaurants(mapped);
        }
      })
      .catch(console.error);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const city = params.get("city");
      if (city && CITY_COORDS[city]) {
        setMapCenter(CITY_COORDS[city]);
      }
    }
  }, []);

  const filtered = activeCategory === "Todos"
    ? restaurants
    : restaurants.filter(r => r.category === activeCategory);

  return (
    <div className="map-page" style={{ fontFamily: "'Inter', system-ui, sans-serif", height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F7F7" }}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 60, background: "#fff", borderBottom: "1px solid #EFEFEF",
        display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
        position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          background: "#F5F5F5", borderRadius: 12, padding: "7px 12px",
          textDecoration: "none", color: "#1B1B1B", fontWeight: 700, fontSize: 14,
          border: "none", cursor: "pointer", transition: "background .2s",
        }}>
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Volver</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#FF6B35,#FFBE00)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <MapPin size={18} color="#fff" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1B1B1B", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Mapa de Locales
            </div>
            <div style={{ fontSize: 12, color: "#AAAAAA", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Restaurantes disponibles · {filtered.length} locales
            </div>
          </div>
        </div>

        {/* Counter badge */}
        <div style={{
          background: "#FF6B35", color: "#fff", fontSize: 12, fontWeight: 800,
          borderRadius: 20, padding: "4px 10px", flexShrink: 0
        }}>
          {filtered.length} locales
        </div>
      </header>

      {/* ── CATEGORY FILTER ──────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #EFEFEF",
        padding: "10px 16px", overflowX: "auto", display: "flex", gap: 8,
        flexShrink: 0, scrollbarWidth: "none",
      }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: "7px 16px", borderRadius: 20, border: "2px solid",
            borderColor: activeCategory === cat ? "#FF6B35" : "#EFEFEF",
            background: activeCategory === cat ? "#FF6B35" : "#fff",
            color: activeCategory === cat ? "#fff" : "#555",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap", transition: "all .2s",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── MAIN: MAP + SIDEBAR ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── MAP ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapView
            restaurants={filtered}
            selected={selected}
            onSelect={setSelected}
            center={mapCenter}
          />
        </div>

        {/* ── SIDEBAR LIST (desktop) ─────────────────────────────────────── */}
        <aside style={{
          width: 340, background: "#fff", borderLeft: "1px solid #EFEFEF",
          overflowY: "auto", display: "flex", flexDirection: "column",
          flexShrink: 0,
        }} className="map-sidebar">
          <div style={{ padding: "16px 16px 8px", fontWeight: 800, fontSize: 15, color: "#1B1B1B" }}>
            Restaurantes cercanos
          </div>
          {filtered.map(r => (
            <button key={r.id} onClick={() => setSelected(r === selected ? null : r)}
              style={{
                display: "flex", gap: 12, padding: "12px 16px",
                background: selected?.id === r.id ? "#FFF8F5" : "transparent",
                border: "none", borderBottom: "1px solid #F5F5F5",
                cursor: "pointer", textAlign: "left", transition: "background .15s",
                borderLeft: selected?.id === r.id ? "4px solid #FF6B35" : "4px solid transparent",
              }}>
              <img src={r.img} alt={r.name} style={{
                width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1B1B1B", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={{
                    background: CAT_COLOR[r.category] || "#FF6B35",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    borderRadius: 6, padding: "2px 6px",
                  }}>{r.category}</span>
                  <span style={{ fontSize: 11, color: "#888" }}>• {r.priceLevel}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                  <Star size={11} color="#FFBE00" fill="#FFBE00" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1B1B1B" }}>{r.rating}</span>
                  <span style={{ color: "#AAAAAA", fontSize: 12 }}>·</span>
                  <Clock size={11} color="#AAAAAA" />
                  <span style={{ fontSize: 12, color: "#AAAAAA" }}>{r.deliveryTime} min</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={11} color="#FF6B35" />
                  <span style={{ fontSize: 11, color: "#AAAAAA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.address}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </aside>
      </div>

      {/* ── MOBILE: CARD POPUP ────────────────────────────────────────────── */}
      {selected && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: "#fff", borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          padding: "16px 16px 32px",
          display: "none",
        }} className="map-mobile-card">
          <div style={{ display: "flex", gap: 12 }}>
            <img src={selected.img} alt={selected.name} style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 14, right: 14,
                background: "#F5F5F5", border: "none", borderRadius: 8,
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <X size={16} />
              </button>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#1B1B1B", marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 6 }}>{selected.description}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Star size={13} color="#FFBE00" fill="#FFBE00" />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{selected.rating}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={13} color="#AAAAAA" />
                  <span style={{ fontSize: 13, color: "#AAAAAA" }}>{selected.deliveryTime} min</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                <MapPin size={13} color="#FF6B35" />
                <span style={{ fontSize: 12, color: "#AAAAAA" }}>{selected.address}</span>
              </div>
            </div>
          </div>
          <Link href={`/restaurant/${selected.slug || selected.id}`} style={{
            display: "block", marginTop: 14,
            background: "linear-gradient(135deg,#FF6B35,#FFBE00)",
            color: "#fff", fontWeight: 800, fontSize: 15, textAlign: "center",
            padding: "13px", borderRadius: 14, textDecoration: "none",
          }}>
            Ver menú y pedir →
          </Link>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .map-sidebar { display: flex; }
        .map-mobile-card { display: none; }
        @media (max-width: 768px) {
          .map-sidebar { display: none !important; }
          .map-mobile-card { display: block !important; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      `}</style>
    </div>
  );
}
