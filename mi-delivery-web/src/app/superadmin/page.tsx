"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search, Bell, ChevronDown,
  LayoutDashboard, ShoppingBag, LayoutGrid, Users,
  BarChart2, Check, X, MapPin, Star, Calendar, Store, TrendingUp,
  Plus, Trash2, Package, Image as ImageIcon, Eye, Globe, Shield, MessageCircle, Send, Settings
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const KPICard = ({ title, value, trend, color, icon }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-[#F0F2F5] shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-2xl" style={{ backgroundColor: color }}>{icon}</div>
      <span className={`text-[12px] font-bold ${String(trend).startsWith('+') ? 'text-green-500' : 'text-red-400'}`}>{trend}</span>
    </div>
    <p className="text-[13px] text-[#A0AEC0] font-medium">{title}</p>
    <p className="text-[24px] font-extrabold text-[#1A202C]">{value}</p>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState("Solicitudes");
  const [stats, setStats] = useState<any>({ users: 0, restaurants: 0, orders: 0, revenue: 0 });
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [fetchError, setFetchError] = useState("");

  // Vista de restaurante individual
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [restaurantProducts, setRestaurantProducts] = useState<any[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<any[]>([]);
  const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Añadir plato desde superadmin
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", imageUrl: "" });
  const [addingProduct, setAddingProduct] = useState(false);
  const [productMsg, setProductMsg] = useState("");

  // Chat SuperAdmin
  const [chatsList, setChatsList] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<any>(null);

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [timeFilterIndex, setTimeFilterIndex] = useState(1);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  // Platform Config
  const [platformConfig, setPlatformConfig] = useState<any>({
    platformName: "Tastio", supportEmail: "", supportPhone: "", currency: "EUR", language: "es",
    emailNotifications: true, pushNotifications: true, paymentGatewayKeys: { stripePublic: "", stripeSecret: "" }
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const router = useRouter();

  const timeFilters = ["Diario", "Semanal", "Mensual", "Anual"];

  const fetchData = async (user: any) => {
    setFetchError("");
    try {
      const token = await user.getIdToken();
      const [resStats, resRest, resOrders, resCust, resConfig] = await Promise.all([
        fetch("http://localhost:4000/api/superadmin/stats", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:4000/api/admin/restaurants", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:4000/api/superadmin/orders", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:4000/api/superadmin/customers", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("http://localhost:4000/api/superadmin/settings", { headers: { "Authorization": `Bearer ${token}` } }),
      ]);
      if (resStats.status === 403 || resRest.status === 403) {
        setFetchError(`❌ Esta cuenta (${user.email}) no tiene permisos de SuperAdmin. Solo cuentas con rol ADMIN pueden acceder.`);
        return;
      }
      if (resStats.ok) setStats(await resStats.json());
      if (resRest.ok) setRestaurantsList(await resRest.json());
      if (resOrders.ok) setOrders(await resOrders.json());
      if (resCust.ok) setCustomers(await resCust.json());
      if (resConfig?.ok) {
        const conf = await resConfig.json();
        setPlatformConfig((prev: any) => ({ ...prev, ...conf, paymentGatewayKeys: conf.paymentGatewayKeys || { stripePublic: "", stripeSecret: "" } }));
      }
      // Chart data real
      const resChart = await fetch("http://localhost:4000/api/superadmin/chart-data", { headers: { "Authorization": `Bearer ${token}` } });
      if (resChart.ok) setChartData(await resChart.json());
      // Chats
      const resChats = await fetch("http://localhost:4000/api/superadmin/chats", { headers: { "Authorization": `Bearer ${token}` } });
      if (resChats.ok) setChatsList(await resChats.json());
    } catch (e) {
      setFetchError("Error de conexión con el servidor. ¿Está corriendo el backend?");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      setIsAuthorized(true);
      setCurrentUserEmail(user.email || "");
      fetchData(user);
    });
    return () => unsub();
  }, [router]);

  const updateRestaurantStatus = async (id: string, status: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/admin/restaurants/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRestaurantsList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (e) {}
  };

  const viewRestaurantDetail = async (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setShowRestaurantDetail(true);
    setLoadingDetail(true);
    setRestaurantProducts([]);
    setRestaurantOrders([]);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const [resProds, resOrds] = await Promise.all([
        fetch(`http://localhost:4000/api/superadmin/restaurants/${restaurant.id}/products`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`http://localhost:4000/api/superadmin/restaurants/${restaurant.id}/orders`, { headers: { "Authorization": `Bearer ${token}` } }),
      ]);
      if (resProds.ok) setRestaurantProducts(await resProds.json());
      if (resOrds.ok) setRestaurantOrders(await resOrds.json());
    } catch (e) {}
    setLoadingDetail(false);
  };

  const handleAddProductForRestaurant = async () => {
    if (!newProduct.name || !newProduct.price || !selectedRestaurant) return;
    setAddingProduct(true);
    setProductMsg("");
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/superadmin/restaurants/${selectedRestaurant.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price) })
      });
      if (res.ok) {
        const product = await res.json();
        setRestaurantProducts(prev => [product, ...prev]);
        setNewProduct({ name: "", description: "", price: "", imageUrl: "" });
        setShowAddProduct(false);
        setProductMsg("✅ Plato añadido correctamente al restaurante");
      } else {
        setProductMsg("❌ Error al añadir plato");
      }
    } catch (e) {
      setProductMsg("❌ Error de conexión");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Eliminar este plato?")) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/products/${productId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setRestaurantProducts(prev => prev.filter(p => p.id !== productId));
    } catch (e) {}
  };

  const changeUserRole = async (userId: string, targetRole: string, reason: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/superadmin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ role: targetRole, reason })
      });
      if (res.ok) {
        // Actualizar la lista de restaurantes localmente
        setRestaurantsList(prev => prev.map(r =>
          r.owner?.id === userId ? { ...r, owner: { ...r.owner, role: targetRole } } : r
        ));
        return true;
      }
      return false;
    } catch (e) { return false; }
  };

  const fetchChatMessages = async (restaurantId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/superadmin/chats/${restaurantId}`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setChatMessages(await res.json());
    } catch (e) {}
  };

  const handleSendChatAdmin = async () => {
    if (!chatInput.trim() || sendingChat || !selectedChat) return;
    setSendingChat(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/superadmin/chats/${selectedChat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ content: chatInput.trim() })
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages(prev => [...prev, msg]);
        setChatInput("");
      }
    } catch (e) {} finally { setSendingChat(false); }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/superadmin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(platformConfig)
      });
      if (res.ok) setConfigMsg("✅ Configuración guardada correctamente");
      else setConfigMsg("❌ Error al guardar configuración");
    } catch (e) {
      setConfigMsg("❌ Error de conexión");
    } finally {
      setSavingConfig(false);
      setTimeout(() => setConfigMsg(""), 3000);
    }
  };

  const getChartData = () => chartData;

  if (!isAuthorized) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#F0F2F5] border-t-[#FF6B35] rounded-full animate-spin" />
    </div>
  );

  const MENU = [
    { id: "Solicitudes", icon: <Store className="w-5 h-5"/>, label: "Solicitudes" },
    { id: "Estadísticas", icon: <BarChart2 className="w-5 h-5"/>, label: "Estadísticas" },
    { id: "Restaurantes", icon: <Globe className="w-5 h-5"/>, label: "Restaurantes" },
    { id: "Pedidos", icon: <ShoppingBag className="w-5 h-5"/>, label: "Pedidos" },
    { id: "Clientes", icon: <Users className="w-5 h-5"/>, label: "Clientes" },
    { id: "Roles", icon: <Shield className="w-5 h-5"/>, label: "Roles" },
    { id: "Mensajes", icon: <MessageCircle className="w-5 h-5"/>, label: "Mensajes" },
    { id: "Configuración", icon: <Settings className="w-5 h-5"/>, label: "Configuración" },
  ];

  const pendingRestaurants = restaurantsList.filter(r => r.status === 'PENDING');
  const approvedRestaurants = restaurantsList.filter(r => r.status === 'APPROVED');
  const rejectedRestaurants = restaurantsList.filter(r => r.status === 'REJECTED');

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex text-[#2D3748]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── Sidebar ─── */}
      <aside className="w-[260px] bg-white border-r border-[#F0F2F5] flex flex-col shrink-0 hidden md:flex sticky top-0 h-screen">
        <div className="h-20 flex items-center px-8 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FF6B35] to-[#e55a25]">
              <span className="text-white font-black text-[13px]">SA</span>
            </div>
            <span className="text-[20px] font-extrabold text-[#1A202C]">Super<span className="text-[#FF6B35]">Admin.</span></span>
          </Link>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-br from-[#FFF3EE] to-[#FFF8F5] border border-[#FFE0D0] space-y-2">
          <p className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider">Plataforma</p>
          <div className="flex justify-between text-[13px]">
            <span className="text-[#718096]">Restaurantes</span>
            <span className="font-black text-[#1A202C]">{restaurantsList.length}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[#718096]">Usuarios</span>
            <span className="font-black text-[#1A202C]">{stats.users || 0}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[#718096]">Pendientes</span>
            <span className={`font-black ${pendingRestaurants.length > 0 ? 'text-[#FF6B35]' : 'text-[#10B981]'}`}>{pendingRestaurants.length}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {MENU.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-[14px] transition-all ${activeTab === item.id ? "bg-[#FFF3EE] text-[#FF6B35]" : "text-[#718096] hover:bg-[#F8F9FA]"}`}>
              {item.icon} {item.label}
              {item.id === "Solicitudes" && pendingRestaurants.length > 0 && (
                <span className="ml-auto bg-[#FF6B35] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingRestaurants.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#F0F2F5]">
          <p className="text-[11px] text-center text-[#A0AEC0]">SuperAdmin · Tastio Platform</p>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[#F0F2F5] px-8 flex items-center justify-between shrink-0 shadow-sm">
          <h2 className="text-[20px] font-extrabold text-[#1A202C]">{MENU.find(m => m.id === activeTab)?.label || activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#F8F9FA] px-4 py-2 rounded-2xl border border-[#F0F2F5]">
              <Search className="w-4 h-4 text-[#A0AEC0]" />
              <input className="bg-transparent text-[13px] outline-none w-[160px]" placeholder="Buscar aquí..." />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-[#F8F9FA]">
              <Bell className="w-5 h-5 text-[#718096]" />
              {pendingRestaurants.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B35] rounded-full" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-10">

          {/* Error de permisos */}
          {fetchError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-[20px]">🔒</span>
              <div className="flex-1">
                <p className="font-bold text-red-700 text-[14px]">{fetchError}</p>
                <p className="text-[12px] text-red-500 mt-1">
                  Cuenta actual: <span className="font-mono font-bold">{currentUserEmail}</span>
                </p>
                <p className="text-[12px] text-red-500 mt-1">
                  Para acceder al SuperAdmin, necesitas iniciar sesión con una cuenta que tenga rol <span className="font-bold font-mono">ADMIN</span> en la base de datos.
                  Actualmente sólo <span className="font-mono font-bold">poleljesus@gmail.com</span> tiene ese rol (además del sistema).
                </p>
                <button onClick={() => { const u = auth.currentUser; if (u) fetchData(u); }}
                  className="mt-3 text-[13px] font-bold text-red-700 underline hover:no-underline">
                  Reintentar →
                </button>
              </div>
            </div>
          )}

          {/* ─── SOLICITUDES ─── */}
          {!fetchError && activeTab === "Solicitudes" && (
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Solicitudes de Restaurantes</h2>
                <p className="text-[13px] text-[#A0AEC0]">{pendingRestaurants.length} pendiente(s) de revisión</p>
              </div>

              {pendingRestaurants.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#F0F2F5] shadow-sm flex flex-col items-center">
                  <Check className="w-16 h-16 text-green-400 mb-4" />
                  <h3 className="text-[18px] font-extrabold text-[#1A202C] mb-2">¡Todo al día!</h3>
                  <p className="text-[14px] text-[#A0AEC0]">No hay solicitudes pendientes de aprobación</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRestaurants.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-[#F0F2F5] p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-[#F8F9FA] border border-[#F0F2F5] overflow-hidden shrink-0">
                            {r.imageUrl
                              ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Store className="w-7 h-7 text-[#CBD5E0]" /></div>
                            }
                          </div>
                          <div>
                            <h3 className="font-extrabold text-[17px] text-[#1A202C]">{r.name}</h3>
                            {r.description && <p className="text-[13px] text-[#718096] mb-1">{r.description}</p>}
                            <p className="text-[12px] text-[#A0AEC0] flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />{r.address}
                            </p>
                            <p className="text-[12px] text-[#A0AEC0] mt-0.5">
                              👤 Dueño: <span className="font-semibold text-[#718096]">{r.owner?.name}</span> · {r.owner?.email}
                            </p>
                            <p className="text-[11px] text-[#CBD5E0] mt-0.5">Registrado: {new Date(r.createdAt).toLocaleDateString('es-ES')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={() => viewRestaurantDetail(r)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-xl font-bold text-[13px] text-[#718096] hover:bg-[#F8F9FA]">
                            <Eye className="w-4 h-4" /> Ver
                          </button>
                          <button onClick={() => updateRestaurantStatus(r.id, 'APPROVED')}
                            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all">
                            <Check className="w-4 h-4" /> Aprobar
                          </button>
                          <button onClick={() => updateRestaurantStatus(r.id, 'REJECTED')}
                            className="flex items-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all">
                            <X className="w-4 h-4" /> Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Procesados */}
              {(approvedRestaurants.length > 0 || rejectedRestaurants.length > 0) && (
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                  <h3 className="text-[16px] font-extrabold text-[#1A202C] mb-4">Restaurantes Procesados</h3>
                  <div className="space-y-3">
                    {[...approvedRestaurants, ...rejectedRestaurants].map(r => (
                      <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-[#F8F9FA] border border-[#F0F2F5]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
                            {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-[#CBD5E0]" /></div>}
                          </div>
                          <div>
                            <p className="font-bold text-[14px] text-[#1A202C]">{r.name}</p>
                            <p className="text-[12px] text-[#A0AEC0]">{r.owner?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => viewRestaurantDetail(r)}
                            className="text-[12px] text-[#6C5DD3] font-bold hover:underline flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Ver detalle
                          </button>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${r.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {r.status === 'APPROVED' ? '✓ Aprobado' : '✗ Rechazado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── ESTADÍSTICAS ─── */}
          {!fetchError && activeTab === "Estadísticas" && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Usuarios Totales" value={stats.users || 0} trend="+5%" color="#FF6B35" icon={<Users className="w-5 h-5 text-white" />} />
                <KPICard title="Restaurantes" value={stats.restaurants || 0} trend="+2%" color="#6C5DD3" icon={<Store className="w-5 h-5 text-white" />} />
                <KPICard title="Pedidos Globales" value={stats.orders || 0} trend="+12%" color="#009DE0" icon={<ShoppingBag className="w-5 h-5 text-white" />} />
                <KPICard title="Ingresos Brutos" value={`€${(stats.revenue || 0).toFixed(2)}`} trend="+8%" color="#38A169" icon={<TrendingUp className="w-5 h-5 text-white" />} />
              </div>
              <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-extrabold text-[18px] text-[#1A202C]">Actividad de la Plataforma</h3>
                  <div className="relative">
                    <button onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                      className="flex items-center gap-2 px-4 py-2 border border-[#F0F2F5] rounded-xl text-[13px] font-bold text-[#4A5568] hover:bg-[#F8F9FA]">
                      <Calendar className="w-4 h-4 text-[#A0AEC0]"/> {timeFilters[timeFilterIndex]} <ChevronDown className="w-3 h-3"/>
                    </button>
                    {showTimeDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-[#F0F2F5] rounded-xl shadow-lg p-2 z-50">
                        {timeFilters.map((f, i) => (
                          <button key={i} onClick={() => { setTimeFilterIndex(i); setShowTimeDropdown(false); }}
                            className={`block w-full text-left px-4 py-2 rounded-lg text-[13px] ${timeFilterIndex === i ? 'bg-[#FFF3EE] text-[#FF6B35] font-bold' : 'hover:bg-[#F8F9FA]'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="pedidos" fill="#6C5DD3" radius={[4,4,0,0]} name="Pedidos" />
                      <Bar dataKey="ingresos" fill="#FF6B35" radius={[4,4,0,0]} name="Ingresos €" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ─── RESTAURANTES ─── */}
          {!fetchError && activeTab === "Restaurantes" && (
            <div className="mt-6 space-y-4">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Todos los Restaurantes</h2>
                <p className="text-[13px] text-[#A0AEC0]">{restaurantsList.length} restaurante(s) en la plataforma</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurantsList.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#F0F2F5] p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-[#F8F9FA] border border-[#F0F2F5] overflow-hidden shrink-0">
                        {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store className="w-7 h-7 text-[#CBD5E0]" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-[15px] text-[#1A202C] truncate">{r.name}</h3>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${r.status === 'APPROVED' ? 'bg-green-100 text-green-600' : r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-500'}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#A0AEC0] mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3"/>{r.address}</p>
                        <p className="text-[12px] text-[#718096] mt-0.5">👤 {r.owner?.name || r.owner?.email}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => viewRestaurantDetail(r)}
                            className="flex items-center gap-1.5 text-[12px] font-bold text-[#6C5DD3] bg-[#F3F0FF] hover:bg-[#E9E4FF] px-3 py-1.5 rounded-lg transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Ver estadísticas & menú
                          </button>
                          {r.status === 'PENDING' && (
                            <button onClick={() => updateRestaurantStatus(r.id, 'APPROVED')}
                              className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PEDIDOS ─── */}
          {!fetchError && activeTab === "Pedidos" && (
            <div className="mt-6 bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
              <h2 className="text-[20px] font-extrabold text-[#1A202C] mb-6">Pedidos Globales</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[12px] font-extrabold text-[#A0AEC0] uppercase tracking-wider border-b border-[#F0F2F5]">
                    <th className="pb-3 px-4">Pedido ID</th>
                    <th className="pb-3 px-4">Cliente</th>
                    <th className="pb-3 px-4">Restaurante</th>
                    <th className="pb-3 px-4">Estado</th>
                    <th className="pb-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-[#A0AEC0]">
                      <ShoppingBag className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
                      <p>No hay pedidos en la plataforma aún</p>
                    </td></tr>
                  )}
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-[#F0F2F5] hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-4 px-4 font-bold text-[#2D3748] text-[13px]">#{o.id.substring(0,8)}</td>
                      <td className="py-4 px-4 text-[13px] text-[#1A202C]">{o.client?.name || o.client?.email}</td>
                      <td className="py-4 px-4 text-[13px] text-[#718096]">{o.restaurant?.name}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          o.status === 'DELIVERED' ? 'bg-green-100 text-green-600' :
                          o.status === 'PREPARING' ? 'bg-blue-100 text-blue-600' :
                          'bg-[#FFF3EE] text-[#FF6B35]'
                        }`}>{o.status}</span>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-[#1A202C] text-[14px]">€{o.totalAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── CLIENTES ─── */}
          {!fetchError && activeTab === "Clientes" && (
            <div className="mt-6 space-y-4">
              <h2 className="text-[22px] font-extrabold text-[#1A202C]">Todos los Clientes</h2>
              {customers.length === 0 && <p className="text-[#A0AEC0] text-center py-8">No hay clientes registrados aún</p>}
              {customers.map((c: any, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-[#F0F2F5] rounded-2xl bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8C55] flex items-center justify-center text-white font-bold text-[16px] shadow-sm">
                      {c.name ? c.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#1A202C] text-[15px]">{c.name || c.email}</p>
                      <p className="text-[12px] text-[#718096] mt-0.5">{c.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-0.5">Gasto Total</p>
                    <p className="font-black text-[#10B981] text-[16px]">€{(c.spent || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── ROLES ─── */}
          {!fetchError && activeTab === "Roles" && (
            <div className="mt-6 space-y-6">
              <h2 className="text-[22px] font-extrabold text-[#1A202C]">Gestión de Roles y Accesos</h2>
              
              {/* KPIs de roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { role: "ADMIN", label: "Super Administrador", count: 1, color: "#FF6B35", desc: "Control total de la plataforma" },
                  { role: "RESTAURANT_OWNER", label: "Dueños de Restaurante", count: restaurantsList.length, color: "#6C5DD3", desc: "Gestionan sus propios restaurantes" },
                  { role: "CLIENT", label: "Clientes", count: customers.length, color: "#009DE0", desc: "Realizan pedidos en la plataforma" },
                ].map(r => (
                  <div key={r.role} className="bg-white rounded-2xl border border-[#F0F2F5] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: r.color + '22' }}>
                        <Shield className="w-5 h-5" style={{ color: r.color }} />
                      </div>
                      <div>
                        <p className="font-extrabold text-[14px] text-[#1A202C]">{r.label}</p>
                        <p className="text-[11px] font-mono text-[#A0AEC0]">{r.role}</p>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#718096] mb-4">{r.desc}</p>
                    <p className="text-[28px] font-black" style={{ color: r.color }}>{r.count}</p>
                    <p className="text-[12px] text-[#A0AEC0]">cuentas con este rol</p>
                  </div>
                ))}
              </div>

              {/* Lista de dueños con acciones */}
              <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C]">Dueños de Restaurantes</h3>
                  <p className="text-[12px] text-[#A0AEC0]">Puedes restringir o expulsar a cualquier administrador</p>
                </div>
                <div className="space-y-3">
                  {restaurantsList.map(r => {
                    const isSuspended = r.owner?.role === 'CLIENT';
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isSuspended ? 'bg-red-50 border-red-100' : 'bg-[#F8F9FA] border-[#F0F2F5]'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] ${isSuspended ? 'bg-red-400' : 'bg-gradient-to-br from-[#6C5DD3] to-[#5448b5]'}`}>
                            {r.owner?.name?.charAt(0)?.toUpperCase() || "R"}
                          </div>
                          <div>
                            <p className="font-bold text-[14px] text-[#1A202C]">{r.owner?.name || "Sin nombre"}</p>
                            <p className="text-[12px] text-[#A0AEC0]">{r.owner?.email}</p>
                            <p className="text-[11px] text-[#A0AEC0]">Restaurante: {r.name} · Estado: {r.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSuspended ? (
                            <>
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-600">
                                🚫 Suspendido
                              </span>
                              <button
                                onClick={async () => {
                                  if (confirm(`¿Restaurar acceso de admin a ${r.owner?.name}?`)) {
                                    const ok = await changeUserRole(r.owner?.id, 'RESTAURANT_OWNER', 'Restaurado por SuperAdmin');
                                    if (!ok) alert('Error al restaurar el acceso');
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                                <Check className="w-3.5 h-3.5" /> Restaurar
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${r.status === 'APPROVED' ? 'bg-green-100 text-green-600' : r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-500'}`}>
                                {r.status}
                              </span>
                              <button
                                onClick={async () => {
                                  const reason = prompt(`Razón para suspender a ${r.owner?.name} (${r.owner?.email}):\n\nEscribe la razón de la suspensión:`);
                                  if (reason !== null) {
                                    const ok = await changeUserRole(r.owner?.id, 'CLIENT', reason || 'Sin especificar');
                                    if (ok) {
                                      alert(`✅ ${r.owner?.name} ha sido suspendido. Ya no puede entrar al panel admin.`);
                                    } else {
                                      alert('❌ Error al suspender al usuario');
                                    }
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5" /> Suspender
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-[#FFF3EE] rounded-2xl border border-[#FFE0D0]">
                  <p className="text-[13px] font-bold text-[#FF6B35] mb-1">⚠️ Nota de seguridad</p>
                  <p className="text-[12px] text-[#718096]">
                    Al suspender un administrador, su rol cambia a <span className="font-mono font-bold">CLIENT</span>. 
                    No podrá acceder al panel de administración. El restaurante sigue existiendo en la plataforma 
                    pero sin acceso de gestión. Puedes restaurar el acceso en cualquier momento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── MENSAJES ─── */}
          {!fetchError && activeTab === "Mensajes" && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Mensajes de Restaurantes</h2>
                <p className="text-[13px] text-[#A0AEC0]">Chat directo con los administradores de cada restaurante</p>
              </div>

              <div className="flex gap-4" style={{ height: "calc(100vh - 280px)" }}>
                {/* Lista de chats */}
                <div className="w-72 bg-white rounded-3xl border border-[#F0F2F5] shadow-sm overflow-y-auto shrink-0">
                  <div className="p-4 border-b border-[#F0F2F5]">
                    <p className="font-extrabold text-[14px] text-[#1A202C]">Restaurantes</p>
                    <p className="text-[12px] text-[#A0AEC0]">{chatsList.length} en total</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {chatsList.map(chat => (
                      <button key={chat.id}
                        onClick={() => { setSelectedChat(chat); fetchChatMessages(chat.id); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${selectedChat?.id === chat.id ? 'bg-[#FFF3EE]' : 'hover:bg-[#F8F9FA]'}`}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8F9FA] border border-[#F0F2F5] shrink-0">
                          {chat.imageUrl
                            ? <img src={chat.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-[#CBD5E0]" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[13px] truncate ${selectedChat?.id === chat.id ? 'text-[#FF6B35]' : 'text-[#1A202C]'}`}>{chat.name}</p>
                          <p className="text-[11px] text-[#A0AEC0] truncate">
                            {chat.lastMessage ? chat.lastMessage.content : "Sin mensajes"}
                          </p>
                        </div>
                        {chat.lastMessage?.senderRole === 'RESTAURANT_OWNER' && selectedChat?.id !== chat.id && (
                          <span className="w-2 h-2 bg-[#FF6B35] rounded-full shrink-0" />
                        )}
                      </button>
                    ))}
                    {chatsList.length === 0 && (
                      <div className="p-6 text-center">
                        <MessageCircle className="w-10 h-10 text-[#E2E8F0] mx-auto mb-2" />
                        <p className="text-[12px] text-[#A0AEC0]">Ningún restaurante ha enviado mensajes aún</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Área de chat */}
                <div className="flex-1 bg-white rounded-3xl border border-[#F0F2F5] shadow-sm flex flex-col">
                  {!selectedChat ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <MessageCircle className="w-16 h-16 text-[#E2E8F0] mb-4" />
                      <p className="text-[15px] font-bold text-[#A0AEC0]">Selecciona un restaurante</p>
                      <p className="text-[13px] text-[#CBD5E0] mt-1">para ver y responder sus mensajes</p>
                    </div>
                  ) : (
                    <>
                      {/* Header chat */}
                      <div className="p-5 border-b border-[#F0F2F5] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8F9FA]">
                          {selectedChat.imageUrl
                            ? <img src={selectedChat.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <Store className="w-5 h-5 text-[#CBD5E0] m-auto mt-2.5" />
                          }
                        </div>
                        <div>
                          <p className="font-extrabold text-[14px] text-[#1A202C]">{selectedChat.name}</p>
                          <p className="text-[12px] text-[#A0AEC0]">{selectedChat.owner?.email}</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-[13px] text-[#A0AEC0]">Sin mensajes aún. Escribe el primero.</p>
                          </div>
                        ) : chatMessages.map((msg: any) => {
                          const isAdmin = msg.senderRole === 'ADMIN';
                          return (
                            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isAdmin ? 'bg-[#FF6B35] text-white rounded-br-md' : 'bg-[#F8F9FA] text-[#1A202C] rounded-bl-md border border-[#F0F2F5]'}`}>
                                {!isAdmin && <p className="text-[11px] font-bold text-[#FF6B35] mb-1">{msg.senderName}</p>}
                                <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70 text-right' : 'text-[#A0AEC0]'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input */}
                      <div className="p-4 border-t border-[#F0F2F5]">
                        <div className="flex gap-3">
                          <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChatAdmin(); } }}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                            placeholder={`Responder a ${selectedChat.name}...`}
                            maxLength={1000}
                          />
                          <button onClick={handleSendChatAdmin} disabled={!chatInput.trim() || sendingChat}
                            className="w-12 h-12 bg-[#FF6B35] text-white rounded-xl flex items-center justify-center hover:bg-[#e55a25] disabled:opacity-50 transition-colors">
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── CONFIGURACIÓN ─── */}
          {!fetchError && activeTab === "Configuración" && (
            <div className="mt-6 space-y-6 max-w-4xl">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Configuración Global</h2>
                <p className="text-[13px] text-[#A0AEC0]">Ajustes generales de la plataforma Tastio</p>
              </div>

              {configMsg && (
                <div className={`px-4 py-3 rounded-xl text-[13px] font-medium ${configMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {configMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Plataforma */}
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Información de Plataforma</h3>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Nombre de la App</label>
                    <input value={platformConfig.platformName} onChange={e => setPlatformConfig((p:any) => ({ ...p, platformName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Email Soporte</label>
                    <input type="email" value={platformConfig.supportEmail} onChange={e => setPlatformConfig((p:any) => ({ ...p, supportEmail: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Teléfono Contacto</label>
                    <input value={platformConfig.supportPhone || ""} onChange={e => setPlatformConfig((p:any) => ({ ...p, supportPhone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>

                {/* Preferencias */}
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Preferencias Globales</h3>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Moneda Principal</label>
                    <select value={platformConfig.currency} onChange={e => setPlatformConfig((p:any) => ({ ...p, currency: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] bg-white">
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dólar ($)</option>
                      <option value="MXN">Peso Mexicano (MX$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Idioma por defecto</label>
                    <select value={platformConfig.language} onChange={e => setPlatformConfig((p:any) => ({ ...p, language: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] bg-white">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                {/* Pasarelas de Pago */}
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4 md:col-span-2">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Pasarelas de Pago (API Keys)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Stripe Public Key</label>
                      <input value={platformConfig.paymentGatewayKeys?.stripePublic || ""} 
                        onChange={e => setPlatformConfig((p:any) => ({ ...p, paymentGatewayKeys: { ...p.paymentGatewayKeys, stripePublic: e.target.value } }))}
                        className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] font-mono text-[12px]" placeholder="pk_test_..." />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Stripe Secret Key</label>
                      <input type="password" value={platformConfig.paymentGatewayKeys?.stripeSecret || ""} 
                        onChange={e => setPlatformConfig((p:any) => ({ ...p, paymentGatewayKeys: { ...p.paymentGatewayKeys, stripeSecret: e.target.value } }))}
                        className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] font-mono text-[12px]" placeholder="sk_test_..." />
                    </div>
                  </div>
                </div>

                {/* Notificaciones */}
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4 md:col-span-2">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Notificaciones del Sistema</h3>
                  <div className="flex items-center justify-between p-4 border border-[#F0F2F5] rounded-2xl">
                    <div>
                      <p className="font-bold text-[14px] text-[#1A202C]">Emails Transaccionales</p>
                      <p className="text-[12px] text-[#A0AEC0]">Enviar correos a usuarios al realizar pedidos</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={platformConfig.emailNotifications}
                        onChange={(e) => setPlatformConfig((p:any) => ({ ...p, emailNotifications: e.target.checked }))} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-[#F0F2F5] rounded-2xl">
                    <div>
                      <p className="font-bold text-[14px] text-[#1A202C]">Notificaciones Push</p>
                      <p className="text-[12px] text-[#A0AEC0]">Avisos en tiempo real en la aplicación web</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={platformConfig.pushNotifications}
                        onChange={(e) => setPlatformConfig((p:any) => ({ ...p, pushNotifications: e.target.checked }))} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35]"></div>
                    </label>
                  </div>
                </div>

              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleSaveConfig} disabled={savingConfig}
                  className="bg-[#FF6B35] hover:bg-[#e55a25] text-white px-6 py-3 rounded-xl font-bold text-[14px] transition-colors disabled:opacity-50">
                  {savingConfig ? "Guardando..." : "Guardar Configuración"}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── MODAL DETALLE RESTAURANTE ─── */}
      {showRestaurantDetail && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowRestaurantDetail(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header modal */}
            <div className="sticky top-0 bg-white border-b border-[#F0F2F5] px-8 py-5 flex justify-between items-center rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#F8F9FA]">
                  {selectedRestaurant.imageUrl
                    ? <img src={selectedRestaurant.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Store className="w-6 h-6 text-[#CBD5E0]" /></div>
                  }
                </div>
                <div>
                  <h3 className="font-extrabold text-[18px] text-[#1A202C]">{selectedRestaurant.name}</h3>
                  <p className="text-[12px] text-[#A0AEC0]">{selectedRestaurant.address}</p>
                </div>
              </div>
              <button onClick={() => setShowRestaurantDetail(false)} className="p-2 rounded-xl hover:bg-[#F8F9FA]">
                <X className="w-5 h-5 text-[#718096]" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {loadingDetail ? (
                <div className="flex justify-center py-10">
                  <div className="w-10 h-10 border-4 border-[#F0F2F5] border-t-[#FF6B35] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Stats del restaurante */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#FFF3EE] rounded-2xl p-4 text-center">
                      <p className="text-[24px] font-black text-[#FF6B35]">{restaurantProducts.length}</p>
                      <p className="text-[12px] font-semibold text-[#718096]">Platos en menú</p>
                    </div>
                    <div className="bg-[#F3F0FF] rounded-2xl p-4 text-center">
                      <p className="text-[24px] font-black text-[#6C5DD3]">{restaurantOrders.length}</p>
                      <p className="text-[12px] font-semibold text-[#718096]">Pedidos totales</p>
                    </div>
                    <div className="bg-[#ECFDF5] rounded-2xl p-4 text-center">
                      <p className="text-[24px] font-black text-[#10B981]">€{restaurantOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0).toFixed(2)}</p>
                      <p className="text-[12px] font-semibold text-[#718096]">Ingresos totales</p>
                    </div>
                  </div>

                  {/* Menú del restaurante */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-extrabold text-[16px] text-[#1A202C]">Menú del Restaurante</h4>
                      <button onClick={() => setShowAddProduct(true)}
                        className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55a25] text-white px-4 py-2 rounded-xl font-bold text-[13px] transition-colors">
                        <Plus className="w-4 h-4" /> Añadir Plato
                      </button>
                    </div>

                    {productMsg && (
                      <div className={`mb-4 px-4 py-3 rounded-xl text-[13px] font-medium ${productMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {productMsg}
                      </div>
                    )}

                    {/* Modal añadir plato */}
                    {showAddProduct && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                          <h3 className="text-[20px] font-extrabold text-[#1A202C] mb-2">Añadir Plato</h3>
                          <p className="text-[13px] text-[#A0AEC0] mb-6">Para: {selectedRestaurant.name}</p>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Nombre *</label>
                              <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                                className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                                placeholder="Ej: Hamburguesa Premium" />
                            </div>
                            <div>
                              <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Descripción</label>
                              <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                                className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] resize-none"
                                rows={3} placeholder="Descripción del plato..." />
                            </div>
                            <div>
                              <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Precio (€) *</label>
                              <input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                                className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                                placeholder="0.00" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">URL de imagen</label>
                              <input value={newProduct.imageUrl} onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                                className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                                placeholder="https://..." />
                            </div>
                          </div>
                          <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddProduct(false)}
                              className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#718096]">
                              Cancelar
                            </button>
                            <button onClick={handleAddProductForRestaurant} disabled={addingProduct}
                              className="flex-1 px-4 py-3 rounded-xl bg-[#FF6B35] text-white text-[14px] font-bold hover:bg-[#e55a25] disabled:opacity-50">
                              {addingProduct ? "Añadiendo..." : "Añadir"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {restaurantProducts.length === 0 ? (
                      <div className="text-center py-8 bg-[#F8F9FA] rounded-2xl border border-[#F0F2F5]">
                        <Package className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
                        <p className="text-[13px] text-[#A0AEC0]">Este restaurante aún no tiene platos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {restaurantProducts.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#F0F2F5] group">
                            <div className="w-14 h-14 rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shrink-0">
                              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-[#CBD5E0]" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[13px] text-[#1A202C] truncate">{p.name}</p>
                              {p.description && <p className="text-[11px] text-[#A0AEC0] truncate">{p.description}</p>}
                              <p className="font-black text-[#FF6B35] text-[13px] mt-0.5">€{p.price.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleDeleteProduct(p.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Últimos pedidos */}
                  {restaurantOrders.length > 0 && (
                    <div>
                      <h4 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Últimos Pedidos</h4>
                      <div className="space-y-2">
                        {restaurantOrders.slice(0, 5).map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl border border-[#F0F2F5]">
                            <span className="text-[12px] font-bold text-[#718096]">#{o.id.substring(0, 8)}</span>
                            <span className="text-[12px] text-[#A0AEC0]">{o.client?.name || o.client?.email}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-600' : 'bg-[#FFF3EE] text-[#FF6B35]'}`}>{o.status}</span>
                            <span className="font-black text-[13px] text-[#1A202C]">€{o.totalAmount?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
