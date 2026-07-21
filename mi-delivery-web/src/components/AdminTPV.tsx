import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Plus, Minus, Search, Printer, Banknote, CreditCard, Trash2, Package, History, Check } from "lucide-react";
import { auth } from "@/lib/firebase";
import ConfirmModal from "./ConfirmModal";

export default function AdminTPV({ restaurant, products, onClose }: { restaurant: any, products: any[], onClose?: () => void }) {
  const [ticket, setTicket] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string>("Todos");
  
  // Modal state
  const [selectedProductForModal, setSelectedProductForModal] = useState<any | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, isDanger: boolean, onConfirm: () => void}>({
    isOpen: false, title: "", message: "", isDanger: true, onConfirm: () => {}
  });

  const fetchHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/restaurant-admin/tpv-orders", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setOrderHistory(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (showHistoryModal) fetchHistory();
  }, [showHistoryModal]);

  // Payment calculator state
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"card">("cash");
  const [cashGiven, setCashGiven] = useState<string>("");

  // Group products by category
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category !== "Extras") cats.add(p.category);
    });
    const catArr = Array.from(cats);
    const categoryOrder = ["Hamburguesas", "Kebabs", "Menús", "Camperos", "Pizzas", "Bandejas", "Shawarmas", "Chawarmas", "Tacos", "Pitas y Media Luna", "Media Luna", "Bocadillos", "Entrantes", "Guarniciones", "Postres", "Bebidas"];
    catArr.sort((a, b) => {
      const iA = categoryOrder.indexOf(a);
      const iB = categoryOrder.indexOf(b);
      if (iA === -1 && iB === -1) return a.localeCompare(b);
      if (iA === -1) return 1;
      if (iB === -1) return -1;
      return iA - iB;
    });
    return ["Todos", ...catArr];
  }, [products]);

  const categoryOrder = ["Hamburguesas", "Kebabs", "Menús", "Camperos", "Pizzas", "Bandejas", "Shawarmas", "Chawarmas", "Tacos", "Pitas y Media Luna", "Media Luna", "Bocadillos", "Entrantes", "Guarniciones", "Postres", "Bebidas"];

  const filteredProducts = useMemo(() => {
    let list = activeCat === "Todos" 
      ? products.filter(p => p.category !== "Extras" && !(p.name || "").toLowerCase().startsWith("extra"))
      : products.filter(p => p.category === activeCat);
      
    if (activeCat === "Todos") {
      list = [...list].sort((a, b) => {
        const iA = categoryOrder.indexOf(a.category || "");
        const iB = categoryOrder.indexOf(b.category || "");
        if (iA === -1 && iB === -1) return (a.category || "").localeCompare(b.category || "");
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
      });
    }
    return list;
  }, [activeCat, products]);

  const extrasProducts = useMemo(() => {
    return products.filter(p => p.category?.toLowerCase().includes("extra"));
  }, [products]);

  // Ticket calculations
  const subtotal = ticket.reduce((s, i) => {
    const itemPrice = i.price || 0;
    const extrasPrice = i.extras ? i.extras.reduce((es: number, e: any) => es + ((e.price || 0) * e.qty), 0) : 0;
    return s + (itemPrice + extrasPrice) * i.qty;
  }, 0);
  const total = subtotal; // Total to pay
  
  const cashAmount = parseFloat(cashGiven) || 0;
  const change = cashAmount - total;

  const categoriesWithGlobalExtras = ["Hamburguesas", "Kebabs", "Bocadillos", "Camperos", "Pitas y Media Luna", "Shawarmas", "Tacos", "Chawarmas", "Menús"];
  
  const quickAdd = (product: any) => {
    if (product.category?.toLowerCase().includes("extra")) {
      addDirectlyToTicket(product, []);
      return;
    }
    
    const hasSections = !!product.sectionsData;
    const isFood = categoriesWithGlobalExtras.includes(product.category || "");
    
    if (hasSections || isFood) {
      setSelectedProductForModal(product);
      setSelectedExtras([]);
    } else {
      addDirectlyToTicket(product, []);
    }
  };

  const addDirectlyToTicket = (product: any, extras: any[]) => {
    const extrasKey = JSON.stringify(extras);
    const existing = ticket.find(c => c.id === product.id && JSON.stringify(c.extras || []) === extrasKey);
    if (existing) {
      setTicket(ticket.map(c => c.cid === existing.cid ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setTicket([...ticket, { 
        cid: Math.random().toString(36).slice(2), 
        id: product.id, 
        name: product.name, 
        price: product.price || 0, 
        imageUrl: product.imageUrl, 
        qty: 1,
        extras: extras
      }]);
    }
  };

  const confirmAddWithExtras = () => {
    if (selectedProductForModal) {
      addDirectlyToTicket(selectedProductForModal, selectedExtras);
      setSelectedProductForModal(null);
      setSelectedExtras([]);
    }
  };

  const changeQty = (cid: string, delta: number) => {
    setTicket(ticket.map(c => c.cid === cid ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const removeItem = (cid: string) => {
    setTicket(ticket.filter(c => c.cid !== cid));
  };

  const clearTicket = () => {
    setConfirmState({
      isOpen: true,
      title: "Cancelar Ticket",
      message: "¿Estás seguro de cancelar este ticket?",
      isDanger: true,
      onConfirm: () => {
        setTicket([]);
        setCashGiven("");
      }
    });
  };

  const handlePrint = async () => {
    window.print();
    
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        await fetch("http://localhost:4000/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'DATAPHONE',
            totalAmount: total,
            orderType: "TPV",
            items: ticket.map(item => ({
              productId: item.id,
              quantity: item.qty,
              price: item.price,
              options: item.extras
            }))
          })
        });
      }
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setTicket([]);
      setCashGiven("");
      setShowPaymentModal(false);
    }, 1000);
  };

  const markAsReturned = async (orderId: string) => {
    setConfirmState({
      isOpen: true,
      title: "Devolver Pedido",
      message: "¿Estás seguro de marcar este pedido como devuelto? (No se puede deshacer)",
      isDanger: true,
      onConfirm: async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;
          const token = await user.getIdToken();
          const res = await fetch(`http://localhost:4000/api/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ status: "RETURNED" })
          });
          if (res.ok) fetchHistory();
        } catch (e) {}
      }
    });
  };

  return (
    <>
    <div className="flex w-full h-full absolute inset-0 bg-[#F8F9FA] overflow-hidden rounded-[24px] shadow-sm border border-[#E2E8F0]">
      
      {/* ── PRINT TICKET STYLES ── */}
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
        <h2 className="text-center text-xl font-bold mb-1">{restaurant?.name || "Restaurante"}</h2>
        <p className="text-center text-xs mb-4 text-gray-600">Ticket de Venta</p>
        <div className="border-b border-black border-dashed mb-4" />
        
        <table className="w-full text-sm mb-4">
          <tbody>
            {ticket.map(item => {
              const itemTotal = ((item.price || 0) + (item.extras?.reduce((s:number, e:any) => s + (e.price * e.qty), 0) || 0)) * item.qty;
              return (
                <tr key={item.cid}>
                  <td className="py-1 align-top">{item.qty}x</td>
                  <td className="py-1 px-2 align-top">
                    <div>{item.name}</div>
                    {item.extras && item.extras.length > 0 && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {item.extras.map((extra:any) => (
                          <div key={extra.id}>+ {extra.qty}x {extra.name}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-right align-top">€{itemTotal.toFixed(2)}</td>
                </tr>
              );
            })}
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


      {/* ── LEFT PANEL (PRODUCTS) ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden no-print min-w-0 bg-[#F8F9FA]">
        
        {/* Header Search & Categories */}
        <div className="bg-white px-4 sm:px-6 py-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onClose && (
                <button onClick={onClose} className="px-4 py-2 flex items-center gap-2 bg-[#F1F5F9] text-[#1A202C] hover:bg-[#E2E8F0] rounded-xl transition-colors font-bold text-[14px] shrink-0">
                  <ArrowLeft className="w-4 h-4" /> Salir
                </button>
              )}
              <h2 className="text-[20px] sm:text-[24px] font-black text-[#1A202C] tracking-tight">Catálogo</h2>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={`px-5 sm:px-6 py-2.5 rounded-full font-bold text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${activeCat === cat ? 'bg-[#1A202C] text-white shadow-md' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1A202C]'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
            {filteredProducts.map(product => (
              <div key={product.id} onClick={() => quickAdd(product)}
                className="bg-white rounded-[20px] sm:rounded-[24px] p-2.5 sm:p-3 cursor-pointer border border-[#E2E8F0] hover:border-[#FF6B35] hover:shadow-[0_10px_30px_rgba(255,107,53,0.15)] transition-all flex flex-col active:scale-95 group h-full">
                
                <div className="w-full h-24 sm:h-28 rounded-[12px] sm:rounded-[16px] overflow-hidden mb-2 sm:mb-3 shrink-0 bg-[#F1F5F9] flex items-center justify-center relative">
                  {product.imageUrl 
                    ? <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                        draggable={false}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    : <Package className="w-8 h-8 text-[#CBD5E0]" />
                  }
                  <div className="hidden absolute inset-0 flex items-center justify-center bg-[#F1F5F9]">
                     <Package className="w-8 h-8 text-[#CBD5E0]" />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <h3 className="font-bold text-[13px] sm:text-[14px] text-[#1A202C] leading-snug line-clamp-2 mb-2" title={product.name}>{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-[15px] sm:text-[16px] font-black text-[#FF6B35]">€{(product.price || 0).toFixed(2)}</div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFF5F0] text-[#FF6B35] flex items-center justify-center group-hover:bg-[#FF6B35] group-hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
             <div className="text-center text-[#A0AEC0] font-bold mt-16 flex flex-col items-center">
               <Package className="w-16 h-16 mb-4 opacity-50" />
               <p className="text-[16px]">No hay productos en esta categoría.</p>
             </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: TICKET & PAYMENT ── */}
      <div className="w-[300px] lg:w-[340px] xl:w-[380px] bg-white border-l border-[#E2E8F0] flex flex-col no-print shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
        
        {/* Ticket Header */}
        <div className="h-[76px] px-6 flex items-center justify-between border-b border-[#E2E8F0] shrink-0 bg-white">
          <h2 className="text-[18px] font-extrabold text-[#1A202C]">Ticket Actual</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowHistoryModal(true)} className="text-[13px] font-bold text-[#4A5568] flex items-center gap-1.5 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors">
              <History className="w-4 h-4" /> Historial
            </button>
            {ticket.length > 0 && (
              <button onClick={clearTicket} className="text-[13px] font-bold text-red-500 flex items-center gap-1.5 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" /> Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Ticket Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8F9FA] min-h-0">
          {ticket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#A0AEC0]">
               <div className="w-20 h-20 bg-white border border-[#E2E8F0] shadow-sm rounded-full flex items-center justify-center mb-5">
                 <Search className="w-8 h-8 text-[#CBD5E0]" />
               </div>
               <p className="font-bold text-[15px] text-[#4A5568]">El ticket está vacío</p>
               <p className="text-[13px] mt-1">Toca los productos para añadirlos</p>
            </div>
          ) : (
            ticket.map(item => (
              <div key={item.cid} className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-sm flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-3 items-start mb-2">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[14px] text-[#1A202C] leading-tight pr-2">{item.name}</h4>
                      {item.extras && item.extras.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.extras.map((extra: any) => (
                            <p key={extra.id} className="text-[11px] text-[#718096] leading-tight">
                              + {extra.qty}x {extra.name} {extra.price > 0 ? `(€${(extra.price * extra.qty).toFixed(2)})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-black text-[14px] text-[#1A202C] whitespace-nowrap">
                      €{((item.price + (item.extras?.reduce((s:number, e:any) => s + (e.price * e.qty), 0) || 0)) * item.qty).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-[#F1F5F9] rounded-xl p-1 border border-[#E2E8F0]">
                      <button onClick={() => changeQty(item.cid, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4A5568] hover:text-[#1A202C] hover:bg-gray-50 transition-colors"><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center font-bold text-[14px] text-[#1A202C]">{item.qty}</span>
                      <button onClick={() => changeQty(item.cid, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4A5568] hover:text-[#1A202C] hover:bg-gray-50 transition-colors"><Plus className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => removeItem(item.cid)} className="w-9 h-9 flex items-center justify-center text-[#A0AEC0] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Cobrar Button (Payment moved to modal) */}
        <div className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-white shrink-0 z-30 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent opacity-50 -translate-y-full"></div>


          {/* Totals */}
          <div className="flex items-center justify-between text-[#1A202C] mb-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[14px] font-extrabold">TOTAL</span>
            <span className="text-[22px] font-black text-[#FF6B35]">€{total.toFixed(2)}</span>
          </div>

          {/* Print Button */}
          <button 
            onClick={() => setShowPaymentModal(true)}
            disabled={ticket.length === 0}
            className="w-full flex items-center justify-center gap-2 text-white py-4 rounded-xl font-black text-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            style={{ background: ticket.length === 0 ? "#CBD5E0" : "linear-gradient(135deg,#1A202C,#2D3748)" }}>
            Cobrar
          </button>
        </div>
      </div>
      
    </div>

      {/* ── EXTRAS MODAL ── */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] p-6 text-white relative shrink-0">
              <button onClick={() => setSelectedProductForModal(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                <Minus className="w-5 h-5 rotate-45" /> 
              </button>
              <div className="flex items-center gap-4">
                {selectedProductForModal.imageUrl && (
                  <img src={selectedProductForModal.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white/20 border-2 border-white/30" />
                )}
                <div>
                  <h2 className="text-[20px] font-extrabold leading-tight">{selectedProductForModal.name}</h2>
                  <p className="text-white/80 font-medium mt-1">Personaliza tu pedido</p>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-[#F8F9FA]">
              {(() => {
                let sections: any[] = [];
                let hasCustomSections = false;
                if (selectedProductForModal?.sectionsData) {
                  try {
                    sections = typeof selectedProductForModal.sectionsData === "string" 
                      ? JSON.parse(selectedProductForModal.sectionsData) 
                      : selectedProductForModal.sectionsData;
                    if (sections && sections.length > 0) hasCustomSections = true;
                  } catch(e) {}
                }
                
                const isFood = categoriesWithGlobalExtras.includes(selectedProductForModal?.category || "");
                if (sections.length === 0 && isFood) {
                  sections = [
                    { id: "veg", title: "Verduras", options: [{id:"lechuga",label:"Lechuga",price:0},{id:"tomate",label:"Tomate",price:0},{id:"cebolla",label:"Cebolla",price:0}] },
                    { id: "sauces", title: "Salsas", max: 2, options: [{id:"blanca",label:"Salsa Blanca",price:0},{id:"picante",label:"Salsa Picante",price:0},{id:"ketchup",label:"Kétchup",price:0},{id:"mayonesa",label:"Mayonesa",price:0}] }
                  ];
                }

                return (
                  <>
                    {sections && sections.length > 0 && sections.map(sec => (
                      <div key={sec.id} className="mb-6 last:mb-0">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[16px] font-extrabold text-[#1A202C]">{sec.title}</h3>
                          {sec.max === 1 && <span className="text-[10px] font-black text-white bg-[#1A202C] px-2 py-0.5 rounded-md uppercase tracking-wider">Obligatorio</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {sec.options.map((opt: any) => {
                            const on = selectedExtras.some(e => e.id === opt.id);
                            const maxed = !on && sec.max !== undefined && sec.max > 1 && selectedExtras.filter(e => sec.options.some((o:any) => o.id === e.id)).length >= sec.max;
                            
                            const toggle = () => {
                              if (maxed) return;
                              if (sec.max === 1) {
                                // Remove any other option from this section
                                const otherOptIds = sec.options.map((o:any) => o.id);
                                setSelectedExtras([...selectedExtras.filter(e => !otherOptIds.includes(e.id)), { id: opt.id, name: opt.label, price: opt.price || 0, qty: 1 }]);
                              } else {
                                if (on) setSelectedExtras(selectedExtras.filter(e => e.id !== opt.id));
                                else setSelectedExtras([...selectedExtras, { id: opt.id, name: opt.label, price: opt.price || 0, qty: 1 }]);
                              }
                            };
                            
                            return (
                              <div key={opt.id} onClick={toggle}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${maxed ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 border-transparent' : 'cursor-pointer hover:border-[#FF6B35]'} ${on ? 'border-[#FF6B35] bg-[#FFF5F0]' : 'border-[#E2E8F0] bg-white'}`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-[#FF6B35] text-white' : 'bg-[#E2E8F0] text-transparent'}`}>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                  <span className="text-[13px] font-bold text-[#1A202C]">{sec.id === "veg" && on ? <span className="text-red-500 line-through mr-1">Sin</span> : ""}{opt.label}</span>
                                </div>
                                {opt.price > 0 && <span className="text-[12px] font-black text-[#FF6B35]">+€{opt.price.toFixed(2)}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {(!hasCustomSections && isFood && extrasProducts.length > 0) && (
                      <>
                        <h3 className="font-extrabold text-[15px] text-[#1A202C] mb-4 mt-6 uppercase tracking-wider">Añadir Extras</h3>
                        <div className="space-y-3">
                          {extrasProducts.map(extra => {
                            const selected = selectedExtras.find(e => e.id === extra.id);
                            const qty = selected ? selected.qty : 0;
                            
                            return (
                              <div key={extra.id} className="flex items-center justify-between p-3 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#FF6B35] transition-colors">
                                <div className="flex items-center gap-3">
                                  {extra.imageUrl && (
                                    <img src={extra.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                  )}
                                  <div>
                                    <p className="font-bold text-[14px] text-[#1A202C] leading-tight">{extra.name}</p>
                                    <p className="text-[13px] font-black text-[#FF6B35] mt-0.5">+€{(extra.price || 0).toFixed(2)}</p>
                                  </div>
                                </div>
                                
                                {qty > 0 ? (
                                  <div className="flex items-center bg-[#F1F5F9] rounded-xl p-1 border border-[#E2E8F0]">
                                    <button onClick={() => setSelectedExtras(selectedExtras.map(e => e.id === extra.id ? { ...e, qty: e.qty - 1 } : e).filter(e => e.qty > 0))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4A5568] hover:text-[#1A202C]"><Minus className="w-4 h-4" /></button>
                                    <span className="w-8 text-center font-bold text-[14px] text-[#1A202C]">{qty}</span>
                                    <button onClick={() => setSelectedExtras(selectedExtras.map(e => e.id === extra.id ? { ...e, qty: Math.min(5, e.qty + 1) } : e))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#4A5568] hover:text-[#1A202C]"><Plus className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => setSelectedExtras([...selectedExtras, { id: extra.id, name: extra.name, price: extra.price || 0, qty: 1 }])} className="w-10 h-10 rounded-xl bg-[#FFF5F0] text-[#FF6B35] flex items-center justify-center hover:bg-[#FF6B35] hover:text-white transition-colors">
                                    <Plus className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-6 border-t border-[#E2E8F0] shrink-0 bg-white">
              <button onClick={confirmAddWithExtras} className="w-full bg-[#1A202C] hover:bg-black text-white py-4 rounded-2xl font-black text-[16px] transition-all shadow-[0_10px_20px_rgba(26,32,44,0.15)] active:scale-95 flex items-center justify-center gap-2">
                Añadir al Ticket <span className="bg-white/20 px-2 py-0.5 rounded-lg ml-2">€{((selectedProductForModal?.price || 0) + selectedExtras.reduce((s, e) => s + e.price * e.qty, 0)).toFixed(2)}</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white relative">
              <h2 className="text-[20px] font-extrabold text-[#1A202C]">Finalizar Venta</h2>
              <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center text-[#A0AEC0] hover:text-[#1A202C] transition-colors bg-[#F1F5F9] rounded-full">
                <Minus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 bg-[#F8F9FA]">
              <div className="flex items-center justify-between text-[#1A202C] mb-6 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                <span className="text-[15px] font-extrabold text-[#718096]">TOTAL A COBRAR</span>
                <span className="text-[26px] font-black text-[#FF6B35]">€{total.toFixed(2)}</span>
              </div>

              {/* Method Selection */}
              <div className="flex gap-2 mb-5">
                <button onClick={() => setPaymentMethod("cash")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] border-2 transition-all ${paymentMethod === 'cash' ? 'border-[#1A202C] bg-[#1A202C] text-white shadow-md' : 'border-[#E2E8F0] bg-white text-[#718096] hover:border-[#CBD5E0] hover:bg-gray-50'}`}>
                  <Banknote className="w-4 h-4" /> Efectivo
                </button>
                <button onClick={() => setPaymentMethod("card")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] border-2 transition-all ${paymentMethod === 'card' ? 'border-[#1A202C] bg-[#1A202C] text-white shadow-md' : 'border-[#E2E8F0] bg-white text-[#718096] hover:border-[#CBD5E0] hover:bg-gray-50'}`}>
                  <CreditCard className="w-4 h-4" /> Tarjeta
                </button>
              </div>

              {/* Cash Calculator */}
              {paymentMethod === "cash" && (
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-bold text-[#718096]">Recibido (€)</span>
                    <input 
                      type="number" 
                      value={cashGiven} 
                      onChange={(e) => setCashGiven(e.target.value)} 
                      placeholder="0.00"
                      className="w-24 text-right bg-[#F8F9FA] border border-[#CBD5E0] rounded-lg px-3 py-1.5 font-black text-[16px] text-[#1A202C] focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[10, 20, 50, 100].map(val => (
                      <button key={val} onClick={() => setCashGiven(val.toString())} className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg py-2 text-[13px] font-extrabold text-[#4A5568] hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-[#FFF5F0] transition-all">
                        €{val}
                      </button>
                    ))}
                  </div>
                  {cashGiven && cashAmount >= total && total > 0 && (
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                      <span className="text-[14px] font-bold text-[#1A202C]">Cambio a devolver:</span>
                      <span className="text-[22px] font-black text-[#10B981]">€{change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#E2E8F0] bg-white">
              <button 
                onClick={handlePrint}
                disabled={paymentMethod === "cash" && (cashAmount < total && cashGiven !== "")}
                className="w-full flex items-center justify-center gap-2 text-white py-4 rounded-xl font-black text-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg active:scale-95 bg-gradient-to-r from-[#1A202C] to-[#2D3748]">
                <Printer className="w-5 h-5" />
                Confirmar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY MODAL ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F1F5F9] text-[#1A202C] rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-extrabold text-[#1A202C] leading-tight">Historial de Tickets</h2>
                  <p className="text-[#718096] text-[13px] font-medium mt-0.5">Tickets cobrados desde este ordenador</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 flex items-center justify-center text-[#A0AEC0] hover:text-[#1A202C] transition-colors bg-[#F1F5F9] rounded-full">
                <Minus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
              {orderHistory.length === 0 ? (
                <div className="text-center py-10 text-[#A0AEC0]">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No hay tickets guardados aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderHistory.map(order => (
                    <div key={order.id} className={`bg-white border p-4 rounded-2xl shadow-sm transition-all ${order.status === 'RETURNED' ? 'border-red-200 opacity-70' : 'border-[#E2E8F0]'}`}>
                      <div className="flex items-start justify-between mb-3 border-b border-[#E2E8F0] pb-3">
                        <div>
                          <p className="font-bold text-[#1A202C] text-[15px]">Ticket #{order.id.substring(0,8)}</p>
                          <p className="text-[#718096] text-[12px]">{new Date(order.createdAt).toLocaleString()} • {order.paymentMethod === 'CASH' ? 'Efectivo' : 'Tarjeta'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-[18px] ${order.status === 'RETURNED' ? 'text-red-500 line-through' : 'text-[#10B981]'}`}>
                            €{(order.totalAmount || 0).toFixed(2)}
                          </p>
                          {order.status === 'RETURNED' && (
                            <p className="text-red-500 text-[11px] font-bold uppercase mt-0.5">Devuelto</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-[13px] text-[#4A5568] space-y-1 mb-4">
                        {(order.items || []).map((item: any, idx: number) => {
                          let extras = [];
                          if (item.options) {
                            try { extras = JSON.parse(item.options); } catch (e) {}
                          }
                          const itemTotal = ((item.price || 0) + (extras.reduce((s:number,e:any)=>s+(e.price*e.quantity || e.price*e.qty),0)||0)) * item.quantity;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{item.quantity}x {item.product?.name || 'Producto'} {extras.length > 0 ? `(+${extras.length} extras)` : ''}</span>
                              <span>€{itemTotal.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {order.status !== 'RETURNED' && (
                        <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                          <button onClick={() => markAsReturned(order.id)} className="px-4 py-2 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            Marcar Devolución
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDanger={confirmState.isDanger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(p => ({ ...p, isOpen: false }))}
      />
        </>
  );
}
