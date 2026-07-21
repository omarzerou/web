"use client";

import { useState, useEffect, use } from "react";
import { Product, RestInfo, CartItem } from "@/lib/types";
import { ArrowLeft, Check, X, Plus, Minus, Printer, Banknote, CreditCard, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useConfirm } from '@/components/ConfirmProvider';

// ── CUSTOMIZATION MODAL (TPV Version) ─────────────────────────────────────────
function TpvCustomModal({ product, restId, restName, onClose, onAdd }: {
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
      if (max === 1) return { ...prev, [secId]: [optId] };
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
      extras: extrasLabels, optionsIds: selIds, restId, restName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[600px] max-h-[90vh] rounded-[24px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between bg-[#F9F9F9]">
          <h2 className="text-[20px] font-black text-[#1B1B1B]">{product.name}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E0E0E0] shadow-sm flex items-center justify-center hover:bg-[#F0F0F0] transition-colors">
            <X className="w-5 h-5 text-[#555]" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-8 flex-1 bg-white">
          {(product.sections || []).map(sec => (
            <div key={sec.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-extrabold text-[#1B1B1B]">{sec.title}</h3>
                {sec.max === 1 && <span className="text-[12px] font-black text-white bg-[#1B1B1B] px-3 py-1 rounded-full uppercase">Obligatorio</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sec.options.map(opt => {
                  const on = (sel[sec.id]||[]).includes(opt.id);
                  return (
                    <div key={opt.id} onClick={() => toggle(sec.id, opt.id, sec.max)}
                      className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${on ? 'border-[#FF6B35] bg-[#FFF8F5]' : 'border-[#F0F0F0] hover:border-[#FF6B35]'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${on ? 'bg-[#FF6B35] text-white' : 'bg-[#F0F0F0]'}`}>
                           {on && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                        <span className="text-[15px] font-bold text-[#1B1B1B]">{sec.id === "veg" && on ? <span className="text-red-500 line-through mr-1">Sin</span> : ""}{opt.label}</span>
                      </div>
                      {opt.price > 0 && <span className="text-[14px] font-black text-[#FF6B35]">+€{opt.price.toFixed(2)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-[#F0F0F0] bg-white">
          <button onClick={handleAdd} className="w-full text-white px-6 py-4 rounded-xl font-extrabold text-[18px] transition-all active:scale-95 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
            <span>Añadir al Ticket</span>
            <span className="bg-white/20 px-4 py-1 rounded-lg">€{total.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// ── MAIN TPV COMPONENT ────────────────────────────────────────────────────────
export default function TPVPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [rest, setRest] = useState<RestInfo | null>(null);
  
  const [ticket, setTicket] = useState<CartItem[]>([]);
  const { confirm } = useConfirm();
  const [modal, setModal] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Payment calculator state
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"card">("cash");
  const [cashGiven, setCashGiven] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:4000/api/restaurant-admin/stats", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-Restaurant-Id": id
          }
        });
        if (res.ok) {
          setIsAuthorized(true);
          fetch("http://localhost:4000/api/restaurants")
            .then(res => res.json())
            .then(data => {
              if (!Array.isArray(data)) return;
              const apiRest = data.find((r: any) => r.slug === id || r.id === id);
              if (apiRest) {
                const categoryOrder = ["Más Vendidos", "Hamburguesas", "Kebabs", "Menús", "Camperos", "Pizzas", "Bandejas", "Shawarmas", "Chawarmas", "Tacos", "Pitas y Media Luna", "Media Luna", "Bocadillos", "Entrantes", "Guarniciones", "Postres", "Bebidas"];
                // Filter out Extras — they are embedded inside sectionsData of main products
                const visibleProducts = apiRest.products.filter((p: any) => p.category !== 'Extras');
                let categories = Array.from(new Set(visibleProducts.map((p: any) => p.category || "Sin Categoría"))) as string[];
                categories.sort((a, b) => {
                  const iA = categoryOrder.indexOf(a);
                  const iB = categoryOrder.indexOf(b);
                  if (iA === -1 && iB === -1) return a.localeCompare(b);
                  if (iA === -1) return 1;
                  if (iB === -1) return -1;
                  return iA - iB;
                });
                const extrasProducts = apiRest.products
                  .filter((p: any) => p.category === 'Extras')
                  .map((p: any) => ({ id: p.id, label: p.name, price: p.price || 0 }));
                
                const categoriesWithGlobalExtras = ["Hamburguesas", "Kebabs", "Bocadillos", "Camperos", "Pitas y Media Luna", "Shawarmas", "Tacos", "Chawarmas", "Menús"];
                
                const mapProduct = (p: any) => {
                  let sections = p.sectionsData ? JSON.parse(p.sectionsData) : undefined;
                  const isFood = categoriesWithGlobalExtras.includes(p.category || "");
                  
                  if (!sections && isFood) {
                    sections = [
                      { id: "veg", title: "Elige tus vegetales:", options: [{id:"lechuga",label:"Lechuga",price:0},{id:"tomate",label:"Tomate",price:0},{id:"cebolla",label:"Cebolla",price:0},{id:"maiz",label:"Maíz",price:0},{id:"zanahoria",label:"Zanahoria",price:0}] },
                      { id: "sauces", title: "¿Qué salsas quieres?:", max: 2, options: [{id:"blanca",label:"Salsa Blanca",price:0},{id:"picante",label:"Salsa Picante",price:0},{id:"ketchup",label:"Kétchup",price:0},{id:"mayonesa",label:"Mayonesa",price:0},{id:"barbacoa",label:"Barbacoa",price:0}] }
                    ];
                    if (extrasProducts.length > 0) {
                      sections.push({ id: "extras", title: "Añadir Extras", options: extrasProducts });
                    }
                  }
                  return {
                    id: p.id,
                    name: p.name,
                    desc: p.description || "",
                    price: p.price,
                    img: p.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
                    sections
                  };
                };
                // "Más Vendidos" tab: featured products first, then all visible
                const bestSellers = visibleProducts
                  .filter((p: any) => p.isFeatured)
                  .map(mapProduct);
                const menu: any[] = [];
                if (bestSellers.length > 0) {
                  menu.push({ id: 'cat_best', name: 'Más Vendidos', items: bestSellers });
                }
                categories.forEach((catName, idx) => {
                  menu.push({
                    id: `cat_${idx}`,
                    name: catName,
                    items: visibleProducts
                      .filter((p: any) => (p.category || "Sin Categoría") === catName)
                      .sort((a: any, b: any) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
                      .map(mapProduct)
                  });
                });
                setRest({
                  id: apiRest.id,
                  name: apiRest.name,
                  tagline: apiRest.address || "Local asociado a Tastio",
                  heroImg: apiRest.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop",
                  time: "15-30 min", 
                  rating: "Nuevo", 
                  delivery: `€${(apiRest.deliveryFee ?? 1.99).toFixed(2)}`,
                  deliveryFee: apiRest.deliveryFee ?? 1.99,
                  minOrder: "€8.00", 
                  openUntil: "23:00",
                  menu
                });
              }
            })
            .catch(console.error);
        } else {
          router.push("/");
        }
      } catch (e) {
        router.push("/");
      }
    });
    return () => unsub();
  }, [id, router]);

  if (!isAuthorized) return null; // Efecto Anti-Flash
  if (!rest) return <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center font-bold">Cargando TPV...</div>;

  // Ticket calculations
  const subtotal = ticket.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);
  const taxes = subtotal * 0.10; // Assuming 10% tax included or added, let's say included for simplicity, so just show it
  const total = subtotal; // Total to pay
  
  const cashAmount = parseFloat(cashGiven) || 0;
  const change = cashAmount - total;

  const quickAdd = (product: Product) => {
    if (product.sections?.length) { setModal(product); return; }
    const existing = ticket.find(c => c.pid === product.id && c.extras.length === 0);
    if (existing) {
      setTicket(ticket.map(c => c.cid === existing.cid ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setTicket([...ticket, { cid: Math.random().toString(36).slice(2), pid: product.id, name: product.name, basePrice: product.price, extrasPrice: 0, img: product.img, qty: 1, extras: [], restId: rest.id, restName: rest.name }]);
    }
  };

  const changeQty = (cid: string, delta: number) => {
    setTicket(ticket.map(c => c.cid === cid ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const removeItem = (cid: string) => {
    setTicket(ticket.filter(c => c.cid !== cid));
  };

  const clearTicket = async () => {
    const isConfirmed = await confirm({ title: "Cancelar Ticket", message: "¿Estás seguro de cancelar este ticket?", isDanger: true });
    if (isConfirmed) {
      setTicket([]);
      setCashGiven("");
    }
  };

  const handlePrint = async () => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";
      await fetch("http://localhost:4000/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          restaurantId: rest?.id || id,
          paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'DATAPHONE',
          deliveryAddress: "En Local (TPV)",
          orderType: "DINE_IN",
          items: ticket.map(item => ({
            productId: item.pid,
            quantity: item.qty,
            options: item.optionsIds || []
          }))
        })
      });
    } catch (e) {
      console.error(e);
    }
    window.print();
    setTicket([]);
    setCashGiven("");
  };

  return (
    <div className="h-screen flex bg-[#F5F7FA] overflow-hidden font-sans">
      
      {/* ── PRINT TICKET STYLES (Only visible when printing) ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-ticket, #print-ticket * { visibility: visible; }
          #print-ticket { position: absolute; left: 0; top: 0; width: 300px; padding: 20px; font-family: monospace; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* ── INVISIBLE TICKET DIV FOR PRINTING ── */}
      <div id="print-ticket" className="hidden print:block text-black bg-white">
        <h2 className="text-center text-xl font-bold mb-1">{rest.name}</h2>
        <p className="text-center text-xs mb-4 text-gray-600">Ticket de Venta</p>
        <div className="border-b border-black border-dashed mb-4" />
        
        <table className="w-full text-sm mb-4">
          <tbody>
            {ticket.map(item => (
              <tr key={item.cid}>
                <td className="py-1 align-top">{item.qty}x</td>
                <td className="py-1 px-2 align-top">
                  <div>{item.name}</div>
                  {item.extras.length > 0 && <div className="text-xs text-gray-500">{item.extras.join(", ")}</div>}
                </td>
                <td className="py-1 text-right align-top">€{((item.basePrice + item.extrasPrice) * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="border-b border-black border-dashed mb-4" />
        <div className="flex justify-between font-bold text-lg mb-2">
          <span>TOTAL</span>
          <span>€{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span>Método: {paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}</span>
        </div>
        {paymentMethod === "cash" && (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span>Entregado</span>
              <span>€{cashAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-4 font-bold">
              <span>Cambio</span>
              <span>€{Math.max(0, change).toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="border-b border-black border-dashed mb-4" />
        <p className="text-center text-xs mt-4">¡Gracias por su visita!</p>
      </div>


      {/* ── LEFT PANEL: PRODUCTS ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden no-print">
        {/* Header */}
        <div className="bg-white h-20 px-6 flex items-center justify-between border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-4">
            <Link href={`/restaurant/${id}`} className="w-10 h-10 bg-[#F3F4F6] rounded-full flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#374151]" />
            </Link>
            <div>
              <h1 className="text-[22px] font-black text-[#111827] leading-tight">TPV - {rest.name}</h1>
              <p className="text-[13px] font-medium text-[#6B7280]">Terminal de Punto de Venta</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-[#FFF3EE] text-[#FF6B35] px-4 py-2 rounded-xl font-bold text-[14px]">Modo Empleado</div>
             <Link href="/admin" className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl font-bold text-[14px] text-[#4B5563] hover:bg-[#F9FAFB] transition-colors">Salir al Panel</Link>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="bg-white border-b border-[#E5E7EB] shrink-0 px-6 py-3 flex flex-nowrap gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {rest.menu.map((cat, i) => (
            <button key={cat.id} onClick={() => setActiveTab(i)}
              className={`shrink-0 px-5 py-3 rounded-xl font-bold text-[15px] whitespace-nowrap transition-colors ${activeTab === i ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {rest.menu[activeTab]?.items.map(product => (
              <div key={product.id} onClick={() => quickAdd(product)}
                className="bg-white rounded-[20px] p-3 cursor-pointer border border-[#E5E7EB] hover:border-[#FF6B35] hover:shadow-[0_8px_24px_rgba(255,107,53,0.15)] transition-all flex flex-col h-48 active:scale-95">
                <div className="w-full h-24 rounded-xl overflow-hidden mb-3 shrink-0 relative">
                  <img src={product.img} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                  {product.sections && <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">Opciones</div>}
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <h3 className="font-bold text-[14px] text-[#111827] leading-snug line-clamp-2">{product.name}</h3>
                  <div className="text-[16px] font-black text-[#FF6B35]">€{product.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: TICKET & PAYMENT ── */}
      <div className="w-[400px] xl:w-[450px] bg-white border-l border-[#E5E7EB] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] no-print shrink-0 z-10">
        
        {/* Ticket Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-[#E5E7EB] shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[18px] font-black text-[#111827]">Ticket Actual</h2>
          {ticket.length > 0 && (
            <button onClick={clearTicket} className="text-[13px] font-bold text-red-500 flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> Vaciar
            </button>
          )}
        </div>

        {/* Ticket Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#FAFAFA]">
          {ticket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF]">
               <div className="w-20 h-20 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-[#D1D5DB]" />
               </div>
               <p className="font-semibold">El ticket está vacío</p>
               <p className="text-[13px]">Selecciona productos a la izquierda</p>
            </div>
          ) : (
            ticket.map(item => (
              <div key={item.cid} className="bg-white p-3 rounded-2xl border border-[#F3F4F6] shadow-sm flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-[14px] text-[#111827] leading-tight">{item.name}</h4>
                    <span className="font-black text-[14px] text-[#111827]">€{((item.basePrice + item.extrasPrice) * item.qty).toFixed(2)}</span>
                  </div>
                  {item.extras.length > 0 && <p className="text-[11px] text-[#6B7280] mt-1 line-clamp-2">{item.extras.join(", ")}</p>}
                  
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center bg-[#F3F4F6] rounded-xl p-1">
                      <button onClick={() => changeQty(item.cid, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4B5563] hover:text-[#111827]"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-8 text-center font-bold text-[14px]">{item.qty}</span>
                      <button onClick={() => changeQty(item.cid, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4B5563] hover:text-[#111827]"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removeItem(item.cid)} className="w-9 h-9 flex items-center justify-center text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-auto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Calc Section */}
        <div className="p-5 border-t border-[#E5E7EB] bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-20">
          
          {/* Method Selection */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setPaymentMethod("cash")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] border-2 transition-all ${paymentMethod === 'cash' ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#F3F4F6] text-[#4B5563] hover:border-[#D1D5DB]'}`}>
              <Banknote className="w-5 h-5" /> Efectivo
            </button>
            <button onClick={() => setPaymentMethod("card")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] border-2 transition-all ${paymentMethod === 'card' ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#F3F4F6] text-[#4B5563] hover:border-[#D1D5DB]'}`}>
              <CreditCard className="w-5 h-5" /> Tarjeta
            </button>
          </div>

          {/* Cash Calculator */}
          {paymentMethod === "cash" && (
            <div className="mb-5 bg-[#F9FAFB] p-4 rounded-2xl border border-[#F3F4F6]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[#6B7280]">Recibido (€)</span>
                <input 
                  type="number" 
                  value={cashGiven} 
                  onChange={(e) => setCashGiven(e.target.value)} 
                  placeholder="0.00"
                  className="w-24 text-right bg-white border border-[#D1D5DB] rounded-lg px-2 py-1 font-bold text-[15px] focus:outline-none focus:border-[#FF6B35]"
                />
              </div>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map(val => (
                  <button key={val} onClick={() => setCashGiven(val.toString())} className="flex-1 bg-white border border-[#E5E7EB] rounded-lg py-1.5 text-[13px] font-bold text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                    €{val}
                  </button>
                ))}
              </div>
              {cashGiven && cashAmount >= total && total > 0 && (
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                  <span className="text-[15px] font-bold text-[#111827]">Cambio a devolver:</span>
                  <span className="text-[20px] font-black text-[#10B981]">€{change.toFixed(2)}</span>
                </div>
              )}
              {cashGiven && cashAmount < total && total > 0 && (
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                  <span className="text-[14px] font-bold text-red-500">Faltan:</span>
                  <span className="text-[16px] font-black text-red-500">€{Math.abs(change).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-[#6B7280]">
              <span className="text-[14px] font-medium">Subtotal</span>
              <span className="text-[15px] font-bold">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[#111827] pt-2 border-t border-[#E5E7EB]">
              <span className="text-[18px] font-black">TOTAL</span>
              <span className="text-[28px] font-black text-[#FF6B35]">€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Print Button */}
          <button 
            onClick={handlePrint}
            disabled={ticket.length === 0 || (paymentMethod === "cash" && (cashAmount < total && cashGiven !== ""))}
            className="w-full flex items-center justify-center gap-3 text-white py-4 rounded-2xl font-black text-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-lg active:scale-95"
            style={{ background: ticket.length === 0 ? "#D1D5DB" : "linear-gradient(135deg,#111827,#374151)" }}>
            <Printer className="w-5 h-5" />
            Imprimir Ticket y Cobrar
          </button>
        </div>
      </div>

      {/* Modal Overlay */}
      {modal && <TpvCustomModal product={modal} restId={id} restName={rest.name} onClose={() => setModal(null)} onAdd={item => {
        setTicket([...ticket, item]);
      }} />}
      
    </div>
  );
}
