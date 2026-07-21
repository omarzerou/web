"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { Clock, MapPin, Search } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const headers = { "Authorization": `Bearer ${token}` };

      const [resStats, resOrders] = await Promise.all([
        fetch("http://localhost:4000/api/restaurant-admin/stats", { headers }),
        fetch("http://localhost:4000/api/restaurant-admin/orders", { headers })
      ]);
      
      if (resStats.ok) {
        const data = await resStats.json();
        setRestaurant(data.restaurant);
      }

      if (resOrders.ok) {
        const fetchedOrders = await resOrders.json();
        const mappedOrders = fetchedOrders.map((o: any) => {
          if (o.items) {
            o.items = o.items.map((it: any) => {
               if (it.options) {
                  try {
                    let sections: any[] = [];
                    if (it.product?.sectionsData) {
                       sections = JSON.parse(it.product.sectionsData);
                    } else if (it.product) {
                       const categoriesWithGlobalExtras = ["Hamburguesas", "Kebabs", "Bocadillos", "Camperos", "Pitas y Media Luna", "Shawarmas", "Tacos", "Chawarmas", "Menús"];
                       if (categoriesWithGlobalExtras.includes(it.product.category || "")) {
                         sections = [
                           { id: "veg", title: "Elige tus vegetales:", options: [{id:"lechuga",label:"Lechuga"},{id:"tomate",label:"Tomate"},{id:"cebolla",label:"Cebolla"},{id:"maiz",label:"Maíz"},{id:"zanahoria",label:"Zanahoria"}] },
                           { id: "sauces", title: "¿Qué salsas quieres?:", max: 2, options: [{id:"blanca",label:"Salsa Blanca"},{id:"picante",label:"Salsa Picante"},{id:"ketchup",label:"Kétchup"},{id:"mayonesa",label:"Mayonesa"},{id:"barbacoa",label:"Barbacoa"},{id:"yogur",label:"Yogur"},{id:"mostaza",label:"Mostaza"},{id:"alioili",label:"Alioli"}] }
                         ];
                       }
                    }
                    
                    let optsIds = JSON.parse(it.options);
                    if (!Array.isArray(optsIds) && typeof optsIds === 'object') {
                       optsIds = Object.values(optsIds).flat();
                    }
                    if (Array.isArray(optsIds)) {
                       it.extras = optsIds.map((id: any) => {
                          for (const s of sections) {
                             const opt = (s.options || []).find((x: any) => x.id === id);
                             if (opt) return { name: opt.label, qty: 1, section: s.title };
                          }
                          // Fallback si no lo encuentra en las hardcoded
                          return { name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '), qty: 1, section: "Añadir Extras" };
                       }).filter(Boolean);
                    }
                  } catch (e) {}
               }
               return it;
            });
          }
          return o;
        });
        setOrders(mappedOrders);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      setIsAuthorized(true);
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000); // Polling cada 10s
      return () => clearInterval(interval);
    });
    return () => unsub();
  }, [router, fetchOrders]);

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`http://localhost:4000/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchOrders();
    } catch (e) {
      toast.error("Error actualizando pedido");
    }
  };

  const formatOrderTime = (createdAt: string) => {
    if (!createdAt) return "--:--";
    const date = new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDelayInfo = (createdAt: string, _bufferTime?: number) => {
    if (!createdAt) return { text: "Calculando...", isDelayed: false, creationTime: "--:--" };
    const orderTime = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - orderTime) / 60000);
    const creationTime = new Date(orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return { 
      text: `Lleva: ${elapsedMinutes} min`, 
      isDelayed: elapsedMinutes >= 60,
      creationTime
    };
  };

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6 font-sans overflow-hidden">
      <div className="max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-48px)]">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-[24px] font-black text-[#1A202C]">Tastio Admin / Pedidos</h1>
            <p className="text-[14px] text-[#718096]">Pedidos (Vista Cocina)</p>
          </div>
          <span className="text-[14px] font-bold text-[#A0AEC0]">{orders.length} en total</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {/* Columna Pendientes */}
          <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[350px] flex-1 border border-[#F0F2F5] flex flex-col h-full overflow-hidden">
            <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Pendientes ({orders.filter(o=>o.status==='PENDING').length})
            </h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'thin' }}>
              {orders.filter(o=>o.status==='PENDING').map(o => {
                const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                return (
                <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-[14px] font-black text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 w-fit ${o.orderType === 'TPV' ? 'bg-indigo-100 text-indigo-700' : 'bg-[#FFF3EE] text-[#FF6B35]'}`}>
                        {o.orderType === 'TPV' ? 'TPV (Tienda)' : 'Móvil / Web'}
                      </span>
                      <span className="text-[11px] font-bold text-[#A0AEC0] mt-1">{formatOrderTime(o.createdAt)}</span>
                    </div>
                    <span className="text-[15px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2.5 py-1 rounded-xl flex items-center gap-1">
                      €{o.totalAmount?.toFixed(2)}
                      {o.orderType === 'DELIVERY' && <span className="text-[10px] text-[#FF6B35]/80">+ Envío</span>}
                    </span>
                  </div>
                  
                  <div className="bg-[#F8F9FA] rounded-xl p-3 mb-4 border border-[#F0F2F5]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-extrabold text-[#4A5568]">{o.client?.name ? o.client.name.substring(0,2).toUpperCase() : 'CL'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-[#1A202C] truncate">{o.client?.name || o.client?.email || "Cliente Invitado"}</p>
                        <p className="text-[11px] font-semibold text-[#718096] truncate">{o.client?.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-[#4A5568] bg-white p-2 rounded-lg border border-[#F0F2F5]">
                      <MapPin className="w-3.5 h-3.5 text-[#FF6B35] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{o.deliveryAddress || o.client?.address || "Recogida en local"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                    {o.items?.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[14px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                          <span className="text-[14px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-2 pl-9 space-y-2">
                            {Array.from(new Set(item.extras.map((ex: any) => ex.section))).map((secName: any, idx: number) => (
                              <div key={idx}>
                                <div className="text-[10px] font-black uppercase text-[#A0AEC0] tracking-wider mb-0.5">{secName}:</div>
                                {item.extras.filter((ex: any) => ex.section === secName).map((ex: any, j: number) => (
                                  <div key={j} className="flex items-center gap-1.5 text-[12px] font-bold text-[#4A5568]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]"></div>
                                    <span className="leading-tight">{ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mb-4 pt-3 border-t border-[#F0F2F5]">
                     <span className="text-[12px] font-bold text-[#718096]">
                       Hora de realizado: {timeInfo.creationTime}
                     </span>
                     <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                       <Clock className="w-4 h-4" /> {timeInfo.text}
                     </span>
                  </div>

                  <button onClick={() => handleUpdateOrderStatus(o.id, 'PREPARING')} className="w-full bg-[#FF6B35] text-white text-[14px] font-black py-3 rounded-xl hover:bg-[#e55a25] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.2)] active:scale-[0.98]">
                    Empezar a preparar
                  </button>
                </div>
              )})}
            </div>
          </div>

          {/* Columna Preparando */}
          <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[350px] flex-1 border border-[#F0F2F5] flex flex-col h-full overflow-hidden">
            <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Preparando ({orders.filter(o=>o.status==='PREPARING').length})
            </h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'thin' }}>
              {orders.filter(o=>o.status==='PREPARING').map(o => {
                const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                return (
                <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-[14px] font-black text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 w-fit ${o.orderType === 'TPV' ? 'bg-indigo-100 text-indigo-700' : 'bg-[#FFF3EE] text-[#FF6B35]'}`}>
                        {o.orderType === 'TPV' ? 'TPV (Tienda)' : 'Móvil / Web'}
                      </span>
                      <span className="text-[11px] font-bold text-[#A0AEC0] mt-1">{formatOrderTime(o.createdAt)}</span>
                    </div>
                    <span className="text-[15px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2.5 py-1 rounded-xl flex items-center gap-1">
                      €{o.totalAmount?.toFixed(2)}
                      {o.orderType === 'DELIVERY' && <span className="text-[10px] text-[#FF6B35]/80">+ Envío</span>}
                    </span>
                  </div>
                  
                  <div className="bg-[#F8F9FA] rounded-xl p-3 mb-4 border border-[#F0F2F5]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-extrabold text-[#4A5568]">{o.client?.name ? o.client.name.substring(0,2).toUpperCase() : 'CL'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-[#1A202C] truncate">{o.client?.name || o.client?.email || "Cliente Invitado"}</p>
                        <p className="text-[11px] font-semibold text-[#718096] truncate">{o.client?.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-[#4A5568] bg-white p-2 rounded-lg border border-[#F0F2F5]">
                      <MapPin className="w-3.5 h-3.5 text-[#3182CE] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{o.deliveryAddress || o.client?.address || "Recogida en local"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                    {o.items?.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[14px] font-black text-[#3182CE] bg-[#EBF8FF] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                          <span className="text-[14px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-2 pl-9 space-y-2">
                            {Array.from(new Set(item.extras.map((ex: any) => ex.section))).map((secName: any, idx: number) => (
                              <div key={idx}>
                                <div className="text-[10px] font-black uppercase text-[#A0AEC0] tracking-wider mb-0.5">{secName}:</div>
                                {item.extras.filter((ex: any) => ex.section === secName).map((ex: any, j: number) => (
                                  <div key={j} className="flex items-center gap-1.5 text-[12px] font-bold text-[#4A5568]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3182CE]"></div>
                                    <span className="leading-tight">{ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mb-4 pt-3 border-t border-[#F0F2F5]">
                     <span className="text-[12px] font-bold text-[#718096]">
                       Hora de realizado: {timeInfo.creationTime}
                     </span>
                     <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                       <Clock className="w-4 h-4" /> {timeInfo.text}
                     </span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'PENDING')} className="px-4 bg-[#F0F2F5] text-[#718096] text-[14px] font-black py-3 rounded-xl hover:bg-[#E2E8F0] transition-colors active:scale-[0.98]">Atrás</button>
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-blue-100 text-blue-700 text-[14px] font-black py-3 rounded-xl hover:bg-blue-200 transition-colors active:scale-[0.98]">Listo / En Camino</button>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Columna Listos / Entregados */}
          <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[350px] flex-1 border border-[#F0F2F5] flex flex-col h-full overflow-hidden">
            <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span> Enviados / Listos ({orders.filter(o=>['ON_THE_WAY', 'DELIVERED'].includes(o.status)).length})
            </h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 opacity-80 hover:opacity-100 transition-opacity" style={{ scrollbarWidth: 'thin' }}>
              {orders.filter(o=>['ON_THE_WAY', 'DELIVERED'].includes(o.status)).map(o => {
                const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                return (
                <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${o.status === 'DELIVERED' ? 'opacity-60 grayscale' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-[14px] font-black text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 w-fit ${o.orderType === 'TPV' ? 'bg-indigo-100 text-indigo-700' : 'bg-[#FFF3EE] text-[#FF6B35]'}`}>
                        {o.orderType === 'TPV' ? 'TPV (Tienda)' : 'Móvil / Web'}
                      </span>
                      <span className="text-[11px] font-bold text-[#A0AEC0] mt-1">{formatOrderTime(o.createdAt)}</span>
                    </div>
                    <span className="text-[15px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2.5 py-1 rounded-xl flex items-center gap-1">
                      €{o.totalAmount?.toFixed(2)}
                      {o.orderType === 'DELIVERY' && <span className="text-[10px] text-[#FF6B35]/80">+ Envío</span>}
                    </span>
                  </div>
                  
                  <div className="bg-[#F8F9FA] rounded-xl p-3 mb-4 border border-[#F0F2F5]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-extrabold text-[#4A5568]">{o.client?.name ? o.client.name.substring(0,2).toUpperCase() : 'CL'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-[#1A202C] truncate">{o.client?.name || o.client?.email || "Cliente Invitado"}</p>
                        <p className="text-[11px] font-semibold text-[#718096] truncate">{o.client?.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-[#4A5568] bg-white p-2 rounded-lg border border-[#F0F2F5]">
                      <MapPin className="w-3.5 h-3.5 text-[#38A169] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{o.deliveryAddress || o.client?.address || "Recogida en local"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                    {o.items?.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[14px] font-black text-[#38A169] bg-[#F0FFF4] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                          <span className="text-[14px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-2 pl-9 space-y-2">
                            {Array.from(new Set(item.extras.map((ex: any) => ex.section))).map((secName: any, idx: number) => (
                              <div key={idx}>
                                <div className="text-[10px] font-black uppercase text-[#A0AEC0] tracking-wider mb-0.5">{secName}:</div>
                                {item.extras.filter((ex: any) => ex.section === secName).map((ex: any, j: number) => (
                                  <div key={j} className="flex items-center gap-1.5 text-[12px] font-bold text-[#4A5568]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#38A169]"></div>
                                    <span className="leading-tight">{ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mb-4 pt-3 border-t border-[#F0F2F5]">
                     <span className="text-[12px] font-bold text-[#718096]">
                       Hora de realizado: {timeInfo.creationTime}
                     </span>
                     <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                       <Clock className="w-4 h-4" /> {timeInfo.text}
                     </span>
                  </div>

                  {o.status === 'ON_THE_WAY' && (
                    <button onClick={() => handleUpdateOrderStatus(o.id, 'DELIVERED')} className="w-full bg-[#D1FAE5] text-[#047857] text-[14px] font-black py-3 rounded-xl hover:bg-[#A7F3D0] transition-colors active:scale-[0.98]">
                      Marcar Entregado
                    </button>
                  )}
                </div>
              )})}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
