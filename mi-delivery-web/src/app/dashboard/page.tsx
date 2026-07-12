"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Store, CheckCircle, Clock, Truck, Package, XCircle, TrendingUp, AlertCircle } from "lucide-react";
import Image from "next/image";

type OrderItem = {
  id: string;
  quantity: number;
  product: { name: string; price: number };
  options: string | null;
};

type Order = {
  id: string;
  totalAmount: number;
  status: "PENDING" | "PREPARING" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";
  paymentMethod: "CASH" | "DATAPHONE";
  deliveryAddress: string;
  createdAt: string;
  items: OrderItem[];
};

type RestaurantData = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  orders: Order[];
};

export default function ProfessionalDashboard() {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/dashboard/my-restaurant", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRestaurant(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchDashboard();
        // Polling cada 5 segundos para simular tiempo real
        const interval = setInterval(fetchDashboard, 5000);
        return () => clearInterval(interval);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchDashboard(); // Refresh immediately
    } catch (error) {
      alert("Error actualizando pedido");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex justify-center items-center text-white">Cargando Sistema...</div>;

  if (!restaurant) return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center text-white">
      <h2>No tienes ningún restaurante registrado.</h2>
    </div>
  );

  if (restaurant.status === "PENDING") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-gray-700">
          <div className="text-yellow-500 mb-4 flex justify-center"><AlertCircle className="w-12 h-12" /></div>
          <h2 className="text-2xl font-bold text-white mb-2">Restaurante en Revisión</h2>
          <p className="text-gray-400">Tu local está siendo revisado. Vuelve más tarde.</p>
        </div>
      </div>
    );
  }

  // Filtrar pedidos por estado
  const activeOrders = restaurant.orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'ON_THE_WAY');
  const pastOrders = restaurant.orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  const parseOptions = (optionsStr: string | null) => {
    if (!optionsStr) return null;
    try {
      return JSON.parse(optionsStr);
    } catch {
      return null;
    }
  };

  const ALL_INGREDIENTS = ['lechuga','tomate','cebolla','lombarda'];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans p-6 overflow-hidden flex flex-col">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 bg-[#1e293b] p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-xl text-white">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">{restaurant.name}</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema de Comandas Activo
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#0f172a] px-4 py-2 rounded-lg border border-slate-700 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold">Pedidos Hoy</p>
            <p className="text-xl font-black text-white">{restaurant.orders.length}</p>
          </div>
          <div className="bg-[#0f172a] px-4 py-2 rounded-lg border border-slate-700 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold">Ingresos</p>
            <p className="text-xl font-black text-green-400">
              {restaurant.orders.filter(o=>o.status==='DELIVERED').reduce((acc,o)=>acc+o.totalAmount,0).toFixed(2)} €
            </p>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 h-full">
        
        {/* ENTRANTES */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 flex flex-col h-[75vh]">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#0f172a]/50 rounded-t-2xl">
            <h2 className="font-bold text-white flex items-center gap-2"><Clock className="text-orange-500"/> Entrantes & Cocina</h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{activeOrders.length}</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {activeOrders.map(order => (
              <div key={order.id} className="border-l-4 p-4 rounded-r-xl bg-[#0f172a] shadow-lg border-orange-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs text-slate-500">#{order.id.slice(0,8)}</span>
                    <h3 className="font-bold text-white">{order.deliveryAddress}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${order.paymentMethod === 'DATAPHONE' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                      {order.paymentMethod === 'DATAPHONE' ? '💳 Traer Datáfono' : '💵 Efectivo'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-white">{order.totalAmount.toFixed(2)}€</div>
                </div>
                
                <div className="space-y-2 mb-4 bg-[#1e293b] p-3 rounded-lg border border-slate-700">
                  {order.items.map(item => {
                    const opts = parseOptions(item.options);
                    return (
                      <div key={item.id} className="text-sm border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                        <div className="font-bold text-slate-200">{item.quantity}x {item.product.name}</div>
                        {opts && (
                          <div className="pl-4 mt-1 space-y-1">
                            {opts.ingredients && opts.ingredients.length > 0 && <p className="text-xs text-green-400"><span className="font-bold">Con:</span> {opts.ingredients.join(', ')}</p>}
                            {opts.ingredients && <p className="text-xs text-red-400"><span className="font-bold">Sin:</span> {ALL_INGREDIENTS.filter(i => !opts.ingredients.includes(i)).join(', ') || 'Nada'}</p>}
                            {opts.sauces && opts.sauces.length > 0 && <p className="text-xs text-blue-400"><span className="font-bold">Salsas:</span> {opts.sauces.join(', ')}</p>}
                            {opts.extras && opts.extras.length > 0 && <p className="text-xs text-orange-400 font-bold">Extras: {opts.extras.join(', ')}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button onClick={() => updateOrderStatus(order.id, 'DELIVERED')} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4"/> Pedido Terminado
                </button>
              </div>
            ))}
            {activeOrders.length === 0 && <p className="text-center text-slate-500 mt-10">Sin pedidos entrantes</p>}
          </div>
        </div>

        {/* HISTORIAL RECIENTE */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 flex flex-col h-[75vh]">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#0f172a]/50 rounded-t-2xl">
            <h2 className="font-bold text-white flex items-center gap-2"><Package className="text-green-500"/> Completados</h2>
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{pastOrders.length}</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {pastOrders.map(order => (
              <div key={order.id} className="p-3 rounded-xl bg-[#0f172a] border border-slate-700/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-300 text-sm line-clamp-1">{order.deliveryAddress}</h3>
                  <span className={`text-xs font-bold ${order.status === 'DELIVERED' ? 'text-green-500' : 'text-red-500'}`}>
                    {order.status === 'DELIVERED' ? 'Completado' : 'Cancelado'}
                  </span>
                </div>
                <div className="font-bold text-slate-400 text-sm">{order.totalAmount.toFixed(2)}€</div>
              </div>
            ))}
            {pastOrders.length === 0 && <p className="text-center text-slate-500 mt-10">Historial vacío</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
