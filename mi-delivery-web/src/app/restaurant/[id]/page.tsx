"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, ShoppingBag, Plus, Minus, X, Check, Clock, Star, MapPin, Search } from "lucide-react";

import { Option, SecDef, Product, MenuCat, RestInfo, CartItem, DB, BURGER_SECS } from "@/lib/demo-data";

// ── CUSTOMIZATION MODAL ───────────────────────────────────────────────────────
function CustomModal({ product, restId, restName, onClose, onAdd }: {
  product: Product; restId: string; restName: string;
  onClose: () => void; onAdd: (item: CartItem) => void;
}) {
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const allOpts  = (product.sections || []).flatMap(s => s.options);
  const selIds   = Object.values(sel).flat();
  const ep       = allOpts.filter(o => o.price > 0 && selIds.includes(o.id)).reduce((sum, o) => sum + o.price, 0);
  const total    = product.price + ep;

  const toggle = (secId: string, optId: string, max?: number) => {
    setSel(prev => {
      const cur = prev[secId] || [];
      if (max === 1) return { ...prev, [secId]: [optId] }; // Radio behavior
      if (cur.includes(optId)) return { ...prev, [secId]: cur.filter(x => x !== optId) };
      if (max && cur.length >= max) return prev;
      return { ...prev, [secId]: [...cur, optId] };
    });
  };

  const handleAdd = () => {
    const extrasLabels = product.sections?.flatMap(sec => {
      const selectedIds = sel[sec.id] || [];
      return selectedIds.map(id => {
        const opt = sec.options.find(o => o.id === id);
        if (!opt) return "";
        if (sec.id === "veg") return `Sin ${opt.label.replace(/^[^\w\s]*\s*/, "")}`;
        return opt.label.replace(/^[^\w\s]*\s*/, "");
      });
    }).filter(Boolean) || [];

    onAdd({ cid: Math.random().toString(36).slice(2), pid: product.id, name: product.name,
      basePrice: product.price, extrasPrice: ep, img: product.img, qty: 1,
      extras: extrasLabels, restId, restName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:items-center sm:justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-[var(--theme-card,#fff)] w-full sm:max-w-[500px] sm:rounded-[32px] rounded-t-[32px] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-[100%] sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>
        
        {/* Header Image */}
        <div className="relative h-[220px] sm:h-[260px] shrink-0 overflow-hidden sm:rounded-t-[32px] rounded-t-[32px]">
          <img src={product.img} alt={product.name} draggable={false} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--theme-card,#fff)]/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:bg-[var(--theme-card,#fff)]/40 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-[26px] font-black text-white leading-tight drop-shadow-md">{product.name}</h2>
            <p className="text-[13px] text-white/90 font-medium mt-1 line-clamp-2 drop-shadow-md">{product.desc}</p>
          </div>
        </div>

        {/* Scrollable Options */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          {(product.sections || []).map(sec => (
            <div key={sec.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-extrabold text-[var(--theme-text,#1B1B1B)]">{sec.title}</h3>
                {sec.max === 1 && <span className="text-[11px] font-black text-white bg-[#1B1B1B] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Obligatorio</span>}
                {sec.max && sec.max > 1 && <span className="text-[11px] font-black text-[var(--theme-primary,#FF6B35)] bg-[#FFF3EE] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Máx {sec.max}</span>}
              </div>

              {sec.type === "card" ? (
                <div className="grid grid-cols-2 gap-3">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    return (
                      <div key={opt.id} onClick={() => toggle(sec.id, opt.id, sec.max)}
                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] h-28 ${on ? 'border-[#FF6B35] shadow-[0_4px_16px_rgba(255,107,53,0.3)]' : 'border-[var(--theme-border,#F0F0F0)]'}`}>
                        {opt.img && <img src={opt.img} alt={opt.label} className="w-full h-full object-cover" draggable={false} />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3">
                           <div className="flex items-center justify-between">
                             <span className="text-[13px] font-bold text-white drop-shadow-md leading-tight">{sec.id === "veg" && on ? <span className="text-red-400 line-through decoration-2 mr-1">Sin</span> : ""}{opt.label}</span>
                             {opt.price > 0 && <span className="text-[11px] font-black text-white bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-sm">+€{opt.price.toFixed(2)}</span>}
                           </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-colors ${on ? 'border-[#FF6B35] bg-[var(--theme-card,#fff)]' : 'border-white/50 bg-black/20'}`}>
                             {on && (sec.id === "veg" ? <X className="w-3.5 h-3.5 text-red-500 stroke-[3]"/> : <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-primary,#FF6B35)]"/>)}
                          </div>
                        </div>
                        {on && sec.id === "veg" && (
                           <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex items-center justify-center">
                              <X className="w-12 h-12 text-white opacity-80" strokeWidth={3} />
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : sec.type === "pill" ? (
                <div className="flex flex-wrap gap-2.5">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => toggle(sec.id, opt.id, sec.max)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold border-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${on ? 'border-[#FF6B35] bg-[#FFF8F5] text-[var(--theme-primary,#FF6B35)] shadow-[0_4px_12px_rgba(255,107,53,0.2)]' : 'border-[var(--theme-border,#F0F0F0)] bg-[var(--theme-card,#fff)] text-[var(--theme-text-mute,#555)]'}`}>
                        {on ? <Check className="w-4 h-4 stroke-[3]"/> : null}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    const maxed = !on && sec.max !== undefined && sec.max > 1 && (sel[sec.id]||[]).length >= sec.max;
                    return (
                      <div key={opt.id} onClick={() => !maxed && toggle(sec.id, opt.id, sec.max)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${maxed ? 'opacity-40 grayscale cursor-not-allowed border-[var(--theme-border,#F0F0F0)] bg-[#F9F9F9]' : 'cursor-pointer hover:border-[#FF6B35]'} ${on ? 'border-[#FF6B35] bg-[#FFF8F5] shadow-[0_4px_16px_rgba(255,107,53,0.15)]' : 'border-[var(--theme-border,#F0F0F0)] bg-[var(--theme-card,#fff)]'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${on ? 'bg-[var(--theme-primary,#FF6B35)] text-white shadow-md' : 'bg-[#F0F0F0] text-transparent'}`}>
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <span className="text-[15px] font-bold text-[var(--theme-text,#1B1B1B)]">{opt.label}</span>
                        </div>
                        {opt.price > 0 && <span className="text-[14px] font-black text-[var(--theme-primary,#FF6B35)]">+€{opt.price.toFixed(2)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--theme-border,#F0F0F0)] bg-[var(--theme-card,#fff)] rounded-b-[32px] shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={handleAdd}
            className="w-full flex items-center justify-between text-white px-6 py-4 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,107,53,0.35)] active:scale-95 group"
            style={{ background: "var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
            <span className="font-extrabold text-[16px] tracking-wide">Añadir al pedido</span>
            <span className="font-black text-[16px] bg-[var(--theme-card,#fff)]/25 px-4 py-1.5 rounded-xl group-hover:bg-[var(--theme-card,#fff)]/30 transition-colors">€{total.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CART DRAWER ───────────────────────────────────────────────────────────────
function CartDrawer({ cart, restName, onClose, onQty, onOrder, orderType, setOrderType, paymentMethod, setPaymentMethod }: {
  cart: CartItem[]; restName: string; onClose: () => void;
  onQty: (id: string, d: number) => void; onOrder: () => void;
  orderType: string; setOrderType: (t: string) => void;
  paymentMethod: string; setPaymentMethod: (t: string) => void;
}) {
  const count = cart.reduce((c, i) => c + i.qty, 0);
  const total = cart.reduce((c, i) => c + (i.basePrice + i.extrasPrice) * i.qty, 0);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative bg-[var(--theme-card,#fff)] w-full sm:w-[400px] h-full shadow-2xl flex flex-col overflow-hidden border-l border-[var(--theme-border,#F0F0F0)]"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#F5F5F5] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[17px] font-extrabold text-[var(--theme-text,#1B1B1B)]">Tu pedido</h2>
            <p className="text-[12px] text-[#AAAAAA] font-medium">{restName} · {count} {count === 1 ? "artículo" : "artículos"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--theme-tab-inactive,#F5F5F5)] flex items-center justify-center border-none cursor-pointer hover:bg-[#EBEBEB] transition-colors">
            <X className="w-4 h-4 text-[var(--theme-text-mute,#555)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.map(item => (
            <div key={item.cid} className="flex items-center gap-3 bg-[#FAFAFA] rounded-2xl p-3 border border-[var(--theme-border,#F0F0F0)]">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <img src={item.img} alt={item.name} draggable={false} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[var(--theme-text,#1B1B1B)] truncate">{item.name}</div>
                {item.extras.length > 0 && <div className="text-[11px] text-[#AAAAAA] truncate mt-0.5">{item.extras.join(", ")}</div>}
                <div className="text-[13px] font-bold text-[var(--theme-primary,#FF6B35)] mt-0.5">€{((item.basePrice + item.extrasPrice) * item.qty).toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onQty(item.cid, -1)} className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center border-none cursor-pointer hover:bg-[#E5E5E5] transition-colors">
                  <Minus className="w-3 h-3 text-[var(--theme-text-mute,#555)]" />
                </button>
                <span className="text-[14px] font-bold w-4 text-center">{item.qty}</span>
                <button onClick={() => onQty(item.cid, 1)} className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer text-white transition-all" style={{ background: "var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-[#F5F5F5] shrink-0">
          <div className="flex bg-[#F0F0F0] p-1 rounded-xl mb-3 text-[11px] font-bold">
            <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'DELIVERY' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>A Domicilio</button>
            <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'PICKUP' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>Para Llevar</button>
            <button onClick={() => setOrderType('DINE_IN')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'DINE_IN' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>Comer Allí</button>
          </div>
          <div className="flex bg-[#F0F0F0] p-1 rounded-xl mb-4 text-[11px] font-bold">
            <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2 rounded-lg transition-colors ${paymentMethod === 'CASH' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[#10B981]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>💵 Efectivo</button>
            <button onClick={() => setPaymentMethod('DATAPHONE')} className={`flex-1 py-2 rounded-lg transition-colors ${paymentMethod === 'DATAPHONE' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[#10B981]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>💳 Datáfono/Tarjeta</button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-[var(--theme-text-sec,#888)]">Total</span>
            <span className="text-[22px] font-extrabold text-[var(--theme-text,#1B1B1B)]">€{total.toFixed(2)}</span>
          </div>
          <button onClick={onOrder}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-[15px] py-4 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
            style={{ background: "var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
            Realizar pedido · €{total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
const getCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("tastio_cart") || "[]"); } catch { return []; }
};

const setCart = (cart: CartItem[]) => {
  if (typeof window !== "undefined") localStorage.setItem("tastio_cart", JSON.stringify(cart));
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RestaurantPage() {
  const params  = useParams<{ id: string }>();
  const id      = params.id;
  const [rest, setRest] = useState<RestInfo | null>(DB[id] || null);
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [modal,     setModal]     = useState<Product | null>(null);
  const [drawer,    setDrawer]    = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked,     setLiked]     = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      const uid = u ? u.uid : "guest";
      setUserId(uid);
      try {
        const favs = JSON.parse(localStorage.getItem(`tastio_favorites_${uid}`) || "[]");
        setLiked(favs.includes(id));
      } catch (e) {}
    });
    setCartState(getCart());
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!DB[id]) {
      fetch("http://localhost:4000/api/restaurants")
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) {
            console.error("API Error or Rate Limit:", data);
            return;
          }
          const apiRest = data.find((r: any) => r.id === id);
          if (apiRest) {
            setRest({
              id,
              name: apiRest.name,
              tagline: apiRest.address || "Local asociado a Tastio",
              subscriptionPlan: apiRest.subscriptionPlan,
              heroImg: apiRest.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop",
              time: "15-30 min", rating: "Nuevo", delivery: "€1.99", minOrder: "€8.00", openUntil: "23:00",
              menu: (() => {
                if (!apiRest.products || apiRest.products.length === 0) return [
                  {
                    id: "gen", name: "Menú Principal", items: [
                      {id: `${id}_1`, name: "Hamburguesa Premium", desc: "Doble carne y queso fundido", price: 8.50, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", sections: BURGER_SECS},
                      {id: `${id}_2`, name: "Pizza Artesanal", desc: "Masa fina, tomate, queso y pepperoni", price: 10.00, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop"},
                      {id: `${id}_3`, name: "Ensalada César", desc: "Lechuga, pollo crujiente y salsa", price: 6.50, img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"},
                      {id: `${id}_4`, name: "Refresco", desc: "Lata 330ml", price: 2.00, img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop"},
                    ]
                  }
                ];

                const categories = Array.from(new Set(apiRest.products.map((p: any) => p.category || "Sin Categoría")));
                return categories.map((catName, idx) => ({
                  id: `cat_${idx}`,
                  name: catName as string,
                  items: apiRest.products.filter((p: any) => (p.category || "Sin Categoría") === catName).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    desc: p.description || "",
                    price: p.price,
                    img: p.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
                    sections: p.sectionsData ? JSON.parse(p.sectionsData) : undefined
                  }))
                }));
              })()
            });
          }
        })
        .catch(console.error);
    }
  }, [id]);

  const filteredMenu = rest?.menu.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0) || [];

  useEffect(() => {
    if (searchQuery || filteredMenu.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length > 0) {
        // Find the one that is closest to the top
        const target = visible[0].target;
        const index = sectionRefs.current.findIndex(ref => ref === target);
        if (index !== -1 && index !== activeTab) {
          setActiveTab(index);
        }
      }
    }, { rootMargin: '-120px 0px -60% 0px', threshold: 0.1 });
    
    sectionRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [filteredMenu, searchQuery, activeTab]);


  const toggleLike = () => {
    if (!userId) return;
    try {
      const favKey = `tastio_favorites_${userId}`;
      const favs: string[] = JSON.parse(localStorage.getItem(favKey) || "[]");
      let nextFavs;
      if (favs.includes(id)) {
        nextFavs = favs.filter(f => f !== id);
        setLiked(false);
      } else {
        nextFavs = [...favs, id];
        setLiked(true);
      }
      localStorage.setItem(favKey, JSON.stringify(nextFavs));
    } catch (e) {}
  };

  const handleOrder = async () => {
    if (cart.length === 0) return;
    if (!userId || userId === "guest") {
      alert("Debes iniciar sesión para realizar el pedido de forma segura.");
      return;
    }
    setLoadingOrder(true);
    try {
      if (DB[id]) {
        setTimeout(() => {
          updateCart([]);
          setDrawer(false);
          setOrderSuccessId("DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase());
          setLoadingOrder(false);
        }, 800);
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          restaurantId: id,
          totalAmount: cartTotal,
          items: cart.map(item => ({
            productId: item.pid,
            quantity: item.qty,
            price: item.basePrice + item.extrasPrice,
            options: item.extras
          })),
          paymentMethod: paymentMethod,
          deliveryAddress: orderType === 'DELIVERY' ? "Dirección del usuario" : null,
          orderType: orderType
        })
      });
      const data = await res.json();
      if (res.ok) {
        updateCart([]);
        setDrawer(false);
        setOrderSuccessId(data.id);
      } else {
        alert("Hubo un error al procesar el pedido.");
      }
    } catch (e) {
      alert("Error de conexión al servidor.");
    } finally {
      setLoadingOrder(false);
    }
  };

  const themeStyles = {};

  if (!rest) return <div className="min-h-screen bg-[var(--theme-bg,#F7F7F7)] p-8 text-center font-bold">Cargando restaurante...</div>;

  if (orderSuccessId) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg-alt,#F8F9FA)] flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif", ...themeStyles as React.CSSProperties }}>
        <div className="bg-[var(--theme-card,#fff)] p-8 rounded-3xl shadow-[var(--theme-shadow,0_8px_30px_rgba(0,0,0,0.04))] border border-[var(--theme-border,#EFEFEF)] max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-[24px] font-extrabold text-[var(--theme-text,#1B1B1B)] mb-2">¡Pedido Confirmado!</h2>
          <p className="text-[15px] text-[var(--theme-text-sec,#888)] mb-6">Tu pedido ha sido recibido y el restaurante ya ha sido notificado. Comenzarán a prepararlo en breve.</p>
          <div className="bg-[var(--theme-bg-alt,#F8F9FA)] border border-[var(--theme-border,#EFEFEF)] rounded-2xl p-4 mb-8">
            <p className="text-[12px] text-[#A0AEC0] font-bold uppercase tracking-wider mb-1">Número de Pedido</p>
            <p className="font-mono text-[18px] font-extrabold text-[var(--theme-primary,#FF6B35)]">#{orderSuccessId.substring(0,8)}</p>
          </div>
          <button onClick={() => setOrderSuccessId(null)}
            className="w-full text-white font-bold text-[15px] py-4 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
            style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
            Volver al Menú
          </button>
        </div>
      </div>
    );
  }

  const updateCart = (next: CartItem[]) => { setCartState(next); setCart(next); };

  const addToCart = (item: CartItem) => updateCart([...getCart(), item]);

  const quickAdd = (product: Product) => {
    if (product.sections?.length) { setModal(product); return; }
    const prev     = getCart();
    const existing = prev.find(c => c.pid === product.id && c.extras.length === 0);
    if (existing)  updateCart(prev.map(c => c.cid === existing.cid ? { ...c, qty: c.qty + 1 } : c));
    else           updateCart([...prev, { cid: Math.random().toString(36).slice(2), pid: product.id, name: product.name, basePrice: product.price, extrasPrice: 0, img: product.img, qty: 1, extras: [], restId: id, restName: rest?.name || "" }]);
  };

  const changeQty = (cid: string, delta: number) => updateCart(getCart().map(c => c.cid === cid ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);

  if (!rest) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg,#F7F7F7)]">
      <div className="text-center">
        <p className="text-[18px] font-bold text-[var(--theme-text,#1B1B1B)] mb-2">Restaurante no encontrado</p>
        <Link href="/" className="text-[var(--theme-primary,#FF6B35)] no-underline font-semibold">← Volver al inicio</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--theme-bg,#F7F7F7)]" style={{ fontFamily: "'Inter', system-ui, sans-serif", ...themeStyles as React.CSSProperties }}>

      {/* HERO */}
      <div 
        className={`relative overflow-hidden w-full ${rest.heroImg?.includes('paloma-blanca') ? '' : 'h-[280px] sm:h-[380px]'}`}
        style={rest.heroImg?.includes('paloma-blanca') ? { aspectRatio: '1759/608' } : {}}
      >
        <img src={rest.heroImg} alt={rest.name} draggable={false} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <Link href="/" className="w-10 h-10 bg-[var(--theme-card,#fff)]/90 backdrop-blur-sm rounded-full flex items-center justify-center no-underline shadow-sm hover:bg-[var(--theme-card,#fff)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--theme-text,#1B1B1B)]" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/restaurant/${id}/tpv`} target="_blank"
              className="px-4 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-[13px] font-bold no-underline transition-colors border border-white/20">
              Modo TPV
            </Link>
            <button onClick={toggleLike}
              className="w-10 h-10 bg-[var(--theme-card,#fff)]/90 backdrop-blur-sm rounded-full flex items-center justify-center border-none cursor-pointer shadow-sm hover:bg-[var(--theme-card,#fff)] transition-colors">
              <Heart className="w-5 h-5" fill={liked?"#FF6B35":"none"} stroke={liked?"#FF6B35":"#1B1B1B"} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:pb-8">
          <h1 className="text-[28px] sm:text-[36px] font-black text-white leading-tight drop-shadow-md flex items-center gap-3">
            {rest.name}
            <Link href="/mapa" className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--theme-card,#fff)]/20 hover:bg-[var(--theme-card,#fff)]/30 backdrop-blur-sm transition-colors text-white" title="Ver en mapa">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            {rest.subscriptionPlan && (
              <span className={`text-[12px] uppercase font-black px-2 py-1 rounded-lg ${rest.subscriptionPlan !== 'FREE' ? 'bg-[#FFBE00] text-black' : 'bg-[var(--theme-card,#fff)]/20 text-white backdrop-blur-sm'}`}>
                {rest.subscriptionPlan !== 'FREE' ? 'Premium' : 'Gratuito'}
              </span>
            )}
          </h1>
          <p className="text-white/80 text-[14px] font-medium mt-1">{rest.tagline}</p>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="bg-[var(--theme-card,#fff)] border-b border-[var(--theme-border,#F0F0F0)] px-4 sm:px-6 py-3">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-[var(--theme-text-mute,#555)]">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#009DE0]" />{rest.time}</span>
          <span className="text-[#DDD]">·</span>
          <span>😊 <span className="text-[#009DE0]">{rest.rating}</span></span>
          <span className="text-[#DDD]">·</span>
          <span>Abierto hasta {rest.openUntil}</span>
          <span className="text-[#DDD]">·</span>
          <span>Pedido mín. {rest.minOrder}</span>
          <span className="text-[#DDD]">·</span>
          <span className="text-green-600 font-bold">Entrega {rest.delivery}</span>
        </div>
      </div>

      {/* MOBILE SEARCH & TABS */}
      <div className="lg:hidden bg-[var(--theme-card,#fff)] border-b border-[var(--theme-border,#F0F0F0)] sticky top-0 z-40">
        <div className="px-4 py-3 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AAAAAA]" />
            <input 
              type="text" 
              placeholder="Buscar platos o ingredientes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] text-[14px] font-medium text-[var(--theme-text,#1B1B1B)] pl-10 pr-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-[var(--theme-primary,#FF6B35)]/50 transition-all"
            />
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 flex overflow-x-auto gap-2 py-3" style={{ scrollbarWidth:"none" }}>
          {filteredMenu.map((cat, i) => (
            <button key={cat.id} onClick={() => { setActiveTab(i); sectionRefs.current[i]?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
              className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap"
              style={{ background: activeTab===i?"#FF6B35":"#F5F5F5", color: activeTab===i?"#fff":"#555" }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-8">

        {/* Left Sidebar (Desktop) */}
        <div className="hidden lg:block w-[220px] shrink-0">
          <div className="sticky top-[24px] space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AAAAAA]" />
              <input 
                type="text" 
                placeholder="Buscar plato..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5F5F5] text-[14px] font-medium text-[var(--theme-text,#1B1B1B)] pl-10 pr-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[var(--theme-primary,#FF6B35)]/50 transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-[14px] font-extrabold text-[#AAAAAA] uppercase tracking-wider mb-2 px-2">Categorías</h3>
              {filteredMenu.map((cat, i) => (
              <button key={cat.id} 
                onClick={() => { setActiveTab(i); sectionRefs.current[i]?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-bold cursor-pointer border-none transition-all ${activeTab === i ? 'bg-[var(--theme-primary,#FF6B35)] text-white shadow-md' : 'bg-transparent text-[var(--theme-text-sec,#888)] hover:bg-[#F5F5F5] hover:text-[var(--theme-text,#1B1B1B)]'}`}
              >
                {cat.name}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 space-y-10 min-w-0">
          {filteredMenu.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-[64px] mb-4">🔍</div>
              <h3 className="text-[20px] font-extrabold text-[var(--theme-text,#1B1B1B)]">No encontramos nada</h3>
              <p className="text-[15px] text-[#888] mt-2">Prueba a buscar con otras palabras.</p>
            </div>
          ) : (
            filteredMenu.map((cat, catIdx) => (
              <div key={cat.id} ref={el => { sectionRefs.current[catIdx] = el; }}>
                <h2 className="text-[20px] font-extrabold text-[var(--theme-text,#1B1B1B)] mb-4">{cat.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map(product => (
                    <div key={product.id}
                    className="bg-[var(--theme-card,#fff)] rounded-2xl border border-[var(--theme-border,#EFEFEF)] p-4 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all cursor-pointer group"
                    onClick={() => product.sections?.length ? setModal(product) : quickAdd(product)}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-[var(--theme-text,#1B1B1B)] leading-tight">{product.name}</h3>
                      <p className="text-[12px] text-[var(--theme-text-sec,#888)] mt-0.5 leading-snug" style={{ display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{product.desc}</p>
                      {product.sections && <span className="inline-block mt-1.5 text-[11px] font-bold text-[var(--theme-primary,#FF6B35)] bg-[#FFF3EE] px-2 py-0.5 rounded-full">Personalizable</span>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[16px] font-extrabold text-[var(--theme-text,#1B1B1B)]">€{product.price.toFixed(2)}</span>
                        <button onClick={e => { e.stopPropagation(); quickAdd(product); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer text-white transition-all hover:scale-110 hover:shadow-[0_2px_10px_rgba(255,107,53,0.4)]"
                          style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-2xl overflow-hidden shrink-0">
                      <img src={product.img} alt={product.name} draggable={false} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="h-24" /> {/* spacer for floating bar */}
      </div>

        {/* Desktop cart sidebar */}
        {cartCount > 0 && (
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="bg-[var(--theme-card,#fff)] rounded-2xl border border-[var(--theme-border,#F0F0F0)] shadow-sm sticky top-[120px] flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <div className="px-5 py-4 border-b border-[#F5F5F5] shrink-0">
                <h2 className="text-[16px] font-extrabold text-[var(--theme-text,#1B1B1B)]">Tu pedido</h2>
                <p className="text-[12px] text-[#AAAAAA] font-medium">{rest.name}</p>
              </div>
              <div className="px-4 py-3 space-y-2 overflow-y-auto flex-1 min-h-0">
                {cart.map(item => (
                  <div key={item.cid} className="flex items-center gap-3 py-2 border-b border-[#F8F8F8] last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[var(--theme-text,#1B1B1B)] truncate">{item.name}</div>
                      {item.extras.length > 0 && <div className="text-[11px] text-[#AAAAAA] truncate">{item.extras.join(", ")}</div>}
                      <div className="text-[12px] font-bold text-[var(--theme-primary,#FF6B35)]">€{((item.basePrice+item.extrasPrice)*item.qty).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => changeQty(item.cid,-1)} className="w-6 h-6 rounded-full bg-[#F0F0F0] flex items-center justify-center border-none cursor-pointer hover:bg-[#E5E5E5] transition-colors">
                        <Minus className="w-2.5 h-2.5 text-[var(--theme-text-mute,#555)]" />
                      </button>
                      <span className="text-[13px] font-bold w-4 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.cid,1)} className="w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer text-white" style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-[#F5F5F5] shrink-0">
                <div className="flex bg-[#F0F0F0] p-1 rounded-xl mb-3 text-[11px] font-bold">
                  <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'DELIVERY' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>A Domicilio</button>
                  <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'PICKUP' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>Para Llevar</button>
                  <button onClick={() => setOrderType('DINE_IN')} className={`flex-1 py-2 rounded-lg transition-colors ${orderType === 'DINE_IN' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[var(--theme-primary,#FF6B35)]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>Comer Allí</button>
                </div>
                <div className="flex bg-[#F0F0F0] p-1 rounded-xl mb-4 text-[11px] font-bold">
                  <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2 rounded-lg transition-colors ${paymentMethod === 'CASH' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[#10B981]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>💵 Efectivo</button>
                  <button onClick={() => setPaymentMethod('DATAPHONE')} className={`flex-1 py-2 rounded-lg transition-colors ${paymentMethod === 'DATAPHONE' ? 'bg-[var(--theme-card,#fff)] shadow-sm text-[#10B981]' : 'text-[var(--theme-text-sec,#888)] hover:text-[var(--theme-text-mute,#555)]'}`}>💳 Datáfono/Tarjeta</button>
                </div>
                <div className="flex justify-between mb-3 text-[14px] font-bold text-[var(--theme-text,#1B1B1B)]">
                  <span>Total</span><span>€{cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleOrder}
                  className="w-full text-white font-bold text-[14px] py-3.5 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)]"
                  style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
                  Realizar pedido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart (mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 lg:hidden z-50">
          <button onClick={() => setDrawer(true)}
            className="w-full flex items-center justify-between text-white font-bold text-[15px] px-5 py-4 rounded-2xl border-none cursor-pointer shadow-[0_8px_32px_rgba(255,107,53,0.4)]"
            style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}>
            <span className="bg-[var(--theme-card,#fff)]/25 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black">{cartCount}</span>
            <span>Ver pedido</span>
            <span>€{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {modal && <CustomModal product={modal} restId={id} restName={rest.name} onClose={() => setModal(null)} onAdd={addToCart} />}
      {drawer && <CartDrawer cart={cart} restName={rest.name} onClose={() => setDrawer(false)} onQty={changeQty} onOrder={handleOrder} orderType={orderType} setOrderType={setOrderType} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
