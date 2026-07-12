"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  MapPin, Store, ChevronLeft, ChevronRight,
  Truck, Search, User, X
} from "lucide-react";
import { auth } from "@/lib/firebase";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Product = { id: string; name: string; price: number; imageUrl: string };
type Restaurant = {
  id: string; name: string; description: string;
  address: string; imageUrl: string; products: Product[];
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Restaurantes", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop" },
  { label: "Supermercado", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop" },
  { label: "Salud",        img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&h=200&fit=crop" },
  { label: "Belleza",      img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop" },
  { label: "Bebidas",      img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&h=200&fit=crop" },
  { label: "Mascotas",     img: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop" },
  { label: "Electrónica",  img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop" },
  { label: "Juguetes",     img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop" },
  { label: "Hogar",        img: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200&h=200&fit=crop" },
  { label: "Flores",       img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop" },
  { label: "Regalos",      img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop" },
  { label: "Alcohol",      img: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=200&fit=crop" },
];
// Duplicated to give enough items for the carousel to scroll
const CAROUSEL_ITEMS = [...CATEGORIES, ...CATEGORIES];

const DEMO_RESTAURANTS = [
  { id: "demo1", name: "McDonald's | Centro",  description: "I'm Lovin' it",                             deliveryTime: "10-20", rating: "8.0", deliveryCost: "€0.00", priceLevel: "€€",  img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo2", name: "Chinacy",               description: "Cocina china auténtica",                   deliveryTime: "15-25", rating: "9.2", deliveryCost: "€0.00", priceLevel: "€€€", img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=640&h=400&fit=crop", badge: "20% dto" },
  { id: "demo3", name: "Five Guys Burguer",     description: "Hamburguesas artesanas desde 1986",         deliveryTime: "15-25", rating: "9.4", deliveryCost: "€0.00", priceLevel: "€€€", img: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo4", name: "Spicy Sichuan",         description: "Alta cocina picante, servida con alma",     deliveryTime: "25-35", rating: "9.4", deliveryCost: "€0.00", priceLevel: "€€€", img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo5", name: "Taste of India",        description: "Auténtica cocina india con especias frescas", deliveryTime: "20-30", rating: "9.0", deliveryCost: "€0.00", priceLevel: "€€",  img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo6", name: "Vapiano Algeciras",     description: "Pasta casera, pizza aromática y crujiente", deliveryTime: "15-25", rating: "8.4", deliveryCost: "€0.00", priceLevel: "€€€", img: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo7", name: "El Kebab Real",         description: "El mejor kebab de la ciudad",              deliveryTime: "10-20", rating: "8.8", deliveryCost: "€0.00", priceLevel: "€",   img: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=640&h=400&fit=crop", badge: "5€ dto" },
  { id: "demo8", name: "Tokyo Sushi",           description: "Sushi y rolls artesanos al momento",       deliveryTime: "20-35", rating: "9.1", deliveryCost: "€0.00", priceLevel: "€€€", img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=640&h=400&fit=crop", badge: "5€ dto" },
];

const CAT_GRID = [
  { name: "Street Food", desc: "30 locales",  img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop" },
  { name: "Burger",      desc: "256 locales", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop" },
  { name: "American",    desc: "131 locales", img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=400&fit=crop" },
  { name: "Pollo",       desc: "98 locales",  img: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&h=400&fit=crop" },
  { name: "Pizza",       desc: "323 locales", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop" },
  { name: "Asiático",    desc: "218 locales", img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop" },
  { name: "Kebab",       desc: "89 locales",  img: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop" },
  { name: "Sushi",       desc: "45 locales",  img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop" },
];

// ─── RESTAURANT CARD ─────────────────────────────────────────────────────────
function RestaurantCard({ rest }: { rest: any }) {
  const href = `/restaurant/${rest.id}`;
  const imgSrc = rest.img || rest.imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&h=400&fit=crop";

  return (
    <Link href={href} className="block bg-white rounded-2xl overflow-hidden border border-[#EFEFEF] shadow-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 group">
      {/* Photo */}
      <div className="relative h-[180px] overflow-hidden bg-[#F5F5F5]">
        <img src={imgSrc} alt={rest.name} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        {rest.badge && (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#009DE0] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
            </svg>
            {rest.badge}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-[#1B1B1B] text-[15px] leading-tight truncate flex-1">{rest.name}</h3>
          <span className="shrink-0 bg-[#EBF6FB] text-[#009DE0] text-[12px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">
            {rest.deliveryTime || "15-25"} min
          </span>
        </div>
        <p className="text-[13px] text-[#888] font-medium truncate mb-3">{rest.description || "Deliciosa comida a domicilio"}</p>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#999] pt-3 border-t border-[#F5F5F5]">
          <Truck className="w-3.5 h-3.5" />
          <span>{rest.deliveryCost || "€0.00"}</span>
          <span className="text-[#DDD]">·</span>
          <span>{rest.priceLevel || "€€€"}</span>
          <span className="text-[#DDD]">·</span>
          <span>😊 {rest.rating || "9.0"}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [restaurants, setRestaurants] = useState<any[]>(DEMO_RESTAURANTS);
  const [loading, setLoading]         = useState(true);
  const [user, setUser]               = useState<any>(null);
  const [query, setQuery]             = useState("");
  const [dropOpen, setDropOpen]       = useState(false);

  // Carousel drag state
  const carouselRef  = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);
  const startX       = useRef(0);
  const scrollStart  = useRef(0);

  // ── auth ──
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  // ── restaurants ──
  useEffect(() => {
    try {
      const localStr = localStorage.getItem("tastio_restaurants");
      const local = localStr ? JSON.parse(localStr) : [];
      if (Array.isArray(local) && local.length > 0) {
        setRestaurants([...local, ...DEMO_RESTAURANTS]);
      }
    } catch (e) {
      console.error("Error loading local restaurants", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── drag-to-scroll for carousel (window-level so drag works anywhere) ──
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent) => {
      isDragging.current  = true;
      startX.current      = e.pageX;
      scrollStart.current = el.scrollLeft;
      el.style.cursor     = "grabbing";
      document.body.style.userSelect = "none";
    };
    const onUp = () => {
      isDragging.current = false;
      el.style.cursor    = "grab";
      document.body.style.userSelect = "";
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const walk = (e.pageX - startX.current) * 1.8;
      el.scrollLeft = scrollStart.current - walk;
    };
    // touch
    const onTouchDown = (e: TouchEvent) => {
      startX.current      = e.touches[0].pageX;
      scrollStart.current = el.scrollLeft;
    };
    const onTouchMove = (e: TouchEvent) => {
      const walk = (e.touches[0].pageX - startX.current) * 1.8;
      el.scrollLeft = scrollStart.current - walk;
    };

    // mousedown on element, move/up on WINDOW so drag continues outside element
    el.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("mousemove",  onMove);
    el.addEventListener("touchstart", onTouchDown, { passive: true });
    el.addEventListener("touchmove",  onTouchMove, { passive: true });
    // ⬇ prevent browser ghost-image drag on images inside the carousel
    const onDragStart = (e: DragEvent) => e.preventDefault();
    el.addEventListener("dragstart", onDragStart);

    return () => {
      el.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("mousemove",  onMove);
      el.removeEventListener("touchstart", onTouchDown);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  const scrollCarousel = (dir: "left" | "right") => {
    carouselRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  // search
  const q = query.toLowerCase().trim();
  const results = q.length > 1
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      )
    : restaurants;

  return (
    <div className="min-h-screen bg-[#F7F7F7]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#EFEFEF]">
        <div className="max-w-[1400px] mx-auto px-4 h-[60px] flex items-center gap-3">

          {/* LEFT – Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 no-underline">
            <img src="/logo.png" alt="Tastio" className="w-[34px] h-[34px] object-contain" />
            <span className="hidden sm:block text-[20px] font-extrabold text-[#1B1B1B] tracking-tight leading-none">
              Tasti<span className="text-[#FF6B35]">o</span>
            </span>
          </Link>

          {/* CENTER – Location + Search (takes remaining space) */}
          <div className="flex flex-1 items-center gap-2 relative" id="search-wrapper">
            <button className="hidden md:flex shrink-0 items-center gap-1.5 bg-[#F5F5F5] hover:bg-[#EBEBEB] text-[#1B1B1B] text-[13px] font-semibold px-3 py-2 rounded-xl border-none cursor-pointer transition-colors">
              <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
              Algeciras
            </button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AAAAAA] pointer-events-none" />
              <input
                type="text"
                placeholder="Busca restaurantes o platos..."
                value={query}
                onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                className="w-full bg-[#F5F5F5] rounded-2xl pl-9 pr-8 py-[9px] text-[14px] text-[#1B1B1B] font-medium placeholder:text-[#AAAAAA] border-2 border-transparent focus:border-[#FF6B35] focus:bg-white outline-none transition-all"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAAAAA] bg-transparent border-none cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Dropdown */}
              {dropOpen && q.length > 1 && query !== "" && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-[#EFEFEF] overflow-hidden z-50">
                  {results.length === 0 ? (
                    <div className="px-4 py-5 text-center text-[14px] text-[#AAAAAA]">
                      Sin resultados para «<strong className="text-[#555]">{query}</strong>»
                    </div>
                  ) : (
                    results.slice(0, 5).map((r, i) => (
                      <Link key={i} href={`/restaurant/${r.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#FFF8F5] border-b border-[#F5F5F5] last:border-b-0 no-underline transition-colors">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                          <img src={r.img || r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] text-[#1B1B1B] truncate">{r.name}</div>
                          <div className="text-[12px] text-[#AAAAAA] truncate">{r.description}</div>
                        </div>
                        <span className="shrink-0 bg-[#EBF6FB] text-[#009DE0] text-[12px] font-bold px-2 py-1 rounded-lg">
                          {r.deliveryTime || "15-25"} min
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT – Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <Link href="/profile" className="hidden sm:flex items-center gap-2 bg-[#F5F5F5] hover:bg-[#EBEBEB] px-3 py-1.5 rounded-xl no-underline transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="perfil" className="w-7 h-7 rounded-full object-cover border border-[#E8E8E8]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#FF6B35,#FFBE00)" }}>
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[13px] font-semibold text-[#1B1B1B] max-w-[90px] truncate">
                    {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
                  </span>
                </Link>
                {/* Mobile: just avatar */}
                <Link href="/profile" className="sm:hidden w-8 h-8 rounded-full overflow-hidden flex items-center justify-center no-underline shrink-0"
                  style={{ background: user.photoURL ? "transparent" : "linear-gradient(135deg,#FF6B35,#FFBE00)" }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-white text-[12px] font-bold">{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
                  }
                </Link>
                <button onClick={() => auth.signOut()} className="hidden sm:block text-[13px] font-semibold text-[#888] hover:text-[#1B1B1B] bg-transparent border-none cursor-pointer transition-colors px-2">
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="text-[14px] font-semibold text-[#1B1B1B] hover:bg-[#F5F5F5] px-3 py-2 rounded-xl no-underline transition-colors">
                  Acceder
                </Link>
                <Link href="/register"
                  className="hidden sm:flex items-center gap-1.5 text-white text-[13px] font-bold px-4 py-[9px] rounded-xl no-underline transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(255,107,53,0.4)]"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                  <User className="w-3.5 h-3.5" />
                  Regístrate
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══ CATEGORY CAROUSEL ══════════════════════════════════════════════ */}
      <section className="bg-white border-b border-[#F0F0F0] py-5">
        <div className="max-w-[1400px] mx-auto px-4 relative">
          {/* Arrow left */}
          <button
            onClick={() => scrollCarousel("left")}
            className="absolute left-1 top-1/2 -translate-y-[60%] z-10 w-9 h-9 rounded-full bg-white border border-[#E8E8E8] shadow-md flex items-center justify-center cursor-pointer hover:bg-[#F5F5F5] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#555]" />
          </button>
          {/* Arrow right */}
          <button
            onClick={() => scrollCarousel("right")}
            className="absolute right-1 top-1/2 -translate-y-[60%] z-10 w-9 h-9 rounded-full bg-white border border-[#E8E8E8] shadow-md flex items-center justify-center cursor-pointer hover:bg-[#F5F5F5] transition-colors">
            <ChevronRight className="w-4 h-4 text-[#555]" />
          </button>

          {/* Fade edges */}
          <div className="absolute left-4 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-[5] pointer-events-none" />
          <div className="absolute right-4 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-[5] pointer-events-none" />

          {/* Scrollable strip */}
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto px-8 pb-1"
            style={{ scrollbarWidth: "none", cursor: "grab", userSelect: "none", WebkitUserSelect: "none" }}
          >
            {CAROUSEL_ITEMS.map((cat, i) => (
              <button key={i}
                onClick={() => {
                  setQuery(cat.label);
                  document.getElementById("restaurants-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex flex-col items-center gap-2 shrink-0 bg-transparent border-none cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="w-[84px] h-[84px] rounded-[20px] overflow-hidden border-2 border-transparent group-hover:border-[#FF6B35] group-hover:shadow-[0_4px_16px_rgba(255,107,53,0.2)] transition-all duration-300">
                  <img src={cat.img} alt={cat.label} draggable={false} className="w-full h-full object-cover pointer-events-none group-hover:scale-[1.07] group-active:scale-100 transition-transform duration-500" />
                </div>
                <span className="text-[12px] font-semibold text-[#1B1B1B] whitespace-nowrap">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROMO BANNERS ═══════════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-4 pt-8 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Banner 1 */}
          <div 
            onClick={() => { setQuery(""); document.getElementById("restaurants-section")?.scrollIntoView({ behavior: "smooth" }); }}
            className="relative rounded-[20px] h-[230px] sm:h-[260px] overflow-hidden cursor-pointer group"
          >
            <img
              src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=900&h=500&fit=crop"
              alt="Promo"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#00B4D8]/90 via-[#00B4D8]/55 to-transparent" />
            <div className="relative z-10 p-7 h-full flex flex-col justify-center max-w-[58%]">
              <div className="bg-white/25 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg w-fit mb-3">Solo hoy</div>
              <h2 className="text-[44px] sm:text-[52px] font-black text-white leading-none mb-2 drop-shadow-md tracking-tight">2×5€<br />DTO</h2>
              <p className="text-white/90 text-[14px] font-medium">En tus restaurantes favoritos</p>
            </div>
          </div>

          {/* Banner 2 */}
          <div 
            onClick={() => { setQuery("Burger"); document.getElementById("restaurants-section")?.scrollIntoView({ behavior: "smooth" }); }}
            className="relative rounded-[20px] h-[230px] sm:h-[260px] overflow-hidden cursor-pointer group"
          >
            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=500&fit=crop"
              alt="Burger King"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1B1B1B]/85 via-[#1B1B1B]/50 to-transparent" />
            <div className="relative z-10 p-7 h-full flex flex-col justify-center max-w-[58%]">
              <div className="bg-[#FFBE00] text-[#1B1B1B] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg w-fit mb-3">Oferta</div>
              <h2 className="text-[32px] sm:text-[40px] font-black text-white leading-tight mb-2 drop-shadow-md tracking-tight">Burger King<br />Ofertas 2×1</h2>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RESTAURANTS ═════════════════════════════════════════════════════ */}
      <section id="restaurants-section" className="max-w-[1400px] mx-auto px-4 py-8 scroll-mt-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-extrabold text-[#1B1B1B] tracking-tight">Restaurantes cerca de ti</h2>
          <div className="flex gap-1.5">
            <button className="w-8 h-8 rounded-full bg-[#EBF6FB] text-[#009DE0] flex items-center justify-center hover:bg-[#D1ECF7] transition-colors border-none cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-full bg-[#EBF6FB] text-[#009DE0] flex items-center justify-center hover:bg-[#D1ECF7] transition-colors border-none cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#EFEFEF] animate-pulse">
                <div className="h-[180px] bg-[#F0F0F0]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#F0F0F0] rounded w-3/4" />
                  <div className="h-3 bg-[#F5F5F5] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.length > 0 ? (
              results.map((rest, idx) => <RestaurantCard key={rest.id || idx} rest={rest} />)
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-[16px] text-[#888] font-medium">No hay restaurantes para "{query}"</p>
                <button onClick={() => setQuery("")} className="mt-3 text-[#FF6B35] font-bold bg-[#FFF3EE] px-4 py-2 rounded-xl cursor-pointer border-none hover:bg-[#FFE8DE] transition-colors">Ver todos</button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ══ CATEGORIES GRID ═════════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-4 pb-14">
        <h2 className="text-[22px] font-extrabold text-[#1B1B1B] tracking-tight mb-5">Categorías</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CAT_GRID.map((cat, i) => (
            <div key={i}
              onClick={() => {
                setQuery(cat.name);
                document.getElementById("restaurants-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-white rounded-2xl overflow-hidden border border-[#EFEFEF] cursor-pointer group transition-all duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-1">
              <div className="h-[145px] overflow-hidden">
                <img
                  src={cat.img} alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500"
                />
              </div>
              <div className="px-3 py-3">
                <div className="font-bold text-[15px] text-[#1B1B1B]">{cat.name}</div>
                <div className="text-[12px] text-[#AAAAAA] mt-0.5">{cat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-[#EFEFEF] pt-12 pb-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-[#F5F5F5]">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Tastio" className="w-[28px] h-[28px] object-contain" />
                <span className="text-[18px] font-extrabold text-[#1B1B1B]">Tasti<span className="text-[#FF6B35]">o</span></span>
              </div>
              <p className="text-[13px] text-[#888] leading-relaxed">Los mejores locales de tu ciudad, conectados contigo.</p>
            </div>
            {[
              { title: "Plataforma", links: [["Explorar", "#"], ["Trabaja con nosotros", "#"], ["Ayuda", "#"]] },
              { title: "Negocios",   links: [["Registra tu local", "/register"], ["Panel de control", "/login"]] },
              { title: "Legal",      links: [["Términos de uso", "#"], ["Privacidad", "#"], ["Cookies", "#"]] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[13px] font-bold text-[#1B1B1B] mb-4">{col.title}</h4>
                <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                  {col.links.map(([text, href], j) => (
                    <li key={j}>
                      <Link href={href} className="text-[14px] text-[#666] no-underline hover:text-[#FF6B35] transition-colors">
                        {text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-[13px] text-[#BBBBBB] pt-8">
            © {new Date().getFullYear()} Tastio · Todos los derechos reservados
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
