"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Search, Bell, ChevronDown, 
  LayoutDashboard, ShoppingBag, LayoutGrid,
  BarChart2, Check, X, MapPin, Star, Store, TrendingUp,
  Plus, Trash2, Package, MessageCircle, Image as ImageIcon,
  Upload, Send, Camera, Settings, Pencil, Save, Clock
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminTPV from "@/components/AdminTPV";

// ─── TRADUCCIONES ─────────────────────────────────────────────────────────────
const getHeaders = (token: string, isJson: boolean = false) => {
  const headers: any = { "Authorization": `Bearer ${token}` };
  if (isJson) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const imp = localStorage.getItem("impersonateRestaurantId");
    if (imp) headers["X-Impersonate-Restaurant"] = imp;
  }
  return headers;
};

const TRANSLATIONS: any = {
  "Español": {
    search: "Buscar aquí...", contact: "Chat con Admin", stats: "Estadísticas",
    customers: "Clientes", reviews: "Reseñas", path: "Tastio Admin /",
    foodToday: "Pedidos Totales", clientsToday: "Clientes Únicos", totalRevenue: "Ingresos Totales",
    employees: "Platos en Menú", salesStats: "Estadísticas de Ventas",
    salesSummary: "Pedidos por día (últimos 7 días)", qty: "Pedidos", 
    bestSellers: "Platos del Menú", bestSellersDesc: "Platos en tu restaurante",
    noOrders: "Aún no hay pedidos registrados.",
    timeFilters: ["Diario", "Semanal", "Mensual", "Anual"],
    sidebar: { "Resumen": "Resumen", "Pedidos": "Pedidos", "Catálogo": "Catálogo", "Estadísticas": "Estadísticas", "Reseñas": "Reseñas", "Chat": "Chat Admin", "Ajustes": "Ajustes" }
  },
  "English": {
    search: "Search here...", contact: "Chat with Admin", stats: "Statistics",
    customers: "Customers", reviews: "Reviews", path: "Tastio Admin /",
    foodToday: "Total Orders", clientsToday: "Unique Clients", totalRevenue: "Total Revenue",
    employees: "Menu Items", salesStats: "Sales Statistics",
    salesSummary: "Orders per day (last 7 days)", qty: "Orders",
    bestSellers: "Menu Items", bestSellersDesc: "Items in your restaurant",
    noOrders: "No orders registered yet.",
    timeFilters: ["Daily", "Weekly", "Monthly", "Yearly"],
    sidebar: { "Resumen": "Overview", "Pedidos": "Orders", "Catálogo": "Catalog", "Estadísticas": "Statistics", "Reseñas": "Reviews", "Chat": "Admin Chat", "Ajustes": "Settings" }
  },
  "العربية": {
    search: "ابحث هنا...", contact: "دردشة مع المسؤول", stats: "الإحصائيات",
    customers: "العملاء", reviews: "التقييمات", path: "لوحة تحكم Tastio /",
    foodToday: "إجمالي الطلبات", clientsToday: "عملاء فريدون", totalRevenue: "إجمالي الإيرادات",
    employees: "عناصر القائمة", salesStats: "إحصائيات المبيعات",
    salesSummary: "الطلبات يومياً (آخر 7 أيام)", qty: "الطلبات",
    bestSellers: "عناصر القائمة", bestSellersDesc: "عناصر في مطعمك",
    noOrders: "لا توجد طلبات مسجلة بعد.",
    timeFilters: ["يومي", "أسبوعي", "شهري", "سنوي"],
    sidebar: { "Resumen": "نظرة عامة", "Pedidos": "الطلبات", "Catálogo": "الكتالوج", "Estadísticas": "الإحصائيات", "Reseñas": "التقييمات", "Chat": "دردشة المسؤول", "Ajustes": "إعدادات" }
  }
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const KPICard = ({ title, value, color, icon }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-[#F0F2F5] shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-2xl" style={{ backgroundColor: color }}>{icon}</div>
    </div>
    <p className="text-[13px] text-[#A0AEC0] font-medium">{title}</p>
    <p className="text-[24px] font-extrabold text-[#1A202C]">{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: any = {
    PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
    PREPARING: { label: "Preparando", color: "bg-blue-100 text-blue-700" },
    ON_THE_WAY: { label: "En camino", color: "bg-purple-100 text-purple-700" },
    DELIVERED: { label: "Entregado", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.color}`}>{s.label}</span>;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("Resumen");
  const [stats, setStats] = useState<any>({ revenue: 0, customers: 0, orders: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [lang, setLang] = useState("Español");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const userRef = useRef<any>(null);

  // Notificaciones
  const [notifCount, setNotifCount] = useState(0);
  const lastOrderCountRef = useRef(0);
  const lastChatCountRef = useRef(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<any>(null);

  // Edición de precio inline
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  // Catálogo – añadir plato
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", category: "", isOutofStock: false, isFeatured: false });
  const [newProductImage, setNewProductImage] = useState<string>("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [productMsg, setProductMsg] = useState("");

  // Setup wizard (primer acceso sin imagen/descripción)
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [setupImage, setSetupImage] = useState<string>("");
  const [setupDescription, setSetupDescription] = useState("");
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupMsg, setSetupMsg] = useState("");

  // Chat
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<any>(null);

  // Ajustes de Restaurante
  const [restaurantConfig, setRestaurantConfig] = useState<any>({ operatingHours: null, deliveryFee: 0, minOrder: 0, coverageRadius: 5, bufferTime: 30 });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const router = useRouter();
  const t = TRANSLATIONS[lang] || TRANSLATIONS["Español"];

  const fetchAdminData = useCallback(async (user: any) => {
    if (!user) return;
    userRef.current = user;
    try {
      const token = await user.getIdToken();
      const impersonateId = typeof window !== "undefined" ? localStorage.getItem("impersonateRestaurantId") : null;
      const headers: any = { "Authorization": `Bearer ${token}` };
      if (impersonateId) headers["X-Impersonate-Restaurant"] = impersonateId;

      const [resStats, resOrders, resProducts, resChart] = await Promise.all([
        fetch("http://localhost:4000/api/restaurant-admin/stats", { headers }),
        fetch("http://localhost:4000/api/restaurant-admin/orders", { headers }),
        fetch("http://localhost:4000/api/restaurant-admin/products", { headers }),
        fetch("http://localhost:4000/api/restaurant-admin/chart-data", { headers }),
      ]);
      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
        setRestaurant(data.restaurant);
        if (data.restaurant) {
          setRestaurantConfig({
            operatingHours: data.restaurant.operatingHours || null,
            deliveryFee: data.restaurant.deliveryFee || 0,
            minOrder: data.restaurant.minOrder || 0,
            coverageRadius: data.restaurant.coverageRadius || 5,
            bufferTime: data.restaurant.bufferTime || 30
          });
        }
        // Mostrar setup wizard si no tiene imagen o descripción
        if (!data.restaurant?.imageUrl || !data.restaurant?.description) {
          setShowSetupWizard(true);
        }
      } else if (resStats.status === 403) {
        router.push("/");
        return;
      }
      setIsAuthorized(true);
      if (resOrders.ok) setOrders(await resOrders.json());
      if (resProducts.ok) setProducts(await resProducts.json());
      if (resChart.ok) setChartData(await resChart.json());
    } catch (e) {}
  }, [router]);

  const fetchChat = useCallback(async () => {
    const user = userRef.current || auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/chat/messages", { headers: getHeaders(token) });
      if (res.ok) setChatMessages(await res.json());
    } catch (e) {}
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      userRef.current = user;
      fetchAdminData(user);
    });
    return () => unsub();
  }, [router, fetchAdminData]);

  useEffect(() => {
    if (activeTab === "Chat") {
      fetchChat();
      const interval = setInterval(fetchChat, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchChat]);

  // ─── POLLING NOTIFICACIONES ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    const checkNotifications = async () => {
      const user = userRef.current || auth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const headers: any = { "Authorization": `Bearer ${token}` };
        const [resOrders, resChat] = await Promise.all([
          fetch("http://localhost:4000/api/restaurant-admin/orders", { headers }),
          fetch("http://localhost:4000/api/chat/messages", { headers })
        ]);
        let newNotifs = 0;
        if (resOrders.ok) {
          const orders = await resOrders.json();
          const pendingCount = orders.filter((o: any) => o.status === 'PENDING').length;
          if (lastOrderCountRef.current > 0 && pendingCount > lastOrderCountRef.current) {
            newNotifs += pendingCount - lastOrderCountRef.current;
            if (Notification.permission === 'granted') {
              new Notification('🍔 Nuevo Pedido en Tastio', {
                body: `Tienes ${pendingCount - lastOrderCountRef.current} nuevo(s) pedido(s) pendiente(s).`,
                icon: '/favicon.ico'
              });
            }
          }
          lastOrderCountRef.current = pendingCount;
        }
        if (resChat.ok) {
          const msgs = await resChat.json();
          const adminMsgs = msgs.filter((m: any) => m.senderRole === 'ADMIN').length;
          if (lastChatCountRef.current > 0 && adminMsgs > lastChatCountRef.current) {
            newNotifs += adminMsgs - lastChatCountRef.current;
            if (Notification.permission === 'granted') {
              new Notification('💬 Mensaje del SuperAdmin', {
                body: 'Tienes un nuevo mensaje en el chat de soporte.',
                icon: '/favicon.ico'
              });
            }
          }
          lastChatCountRef.current = adminMsgs;
        }
        if (newNotifs > 0) setNotifCount(prev => prev + newNotifs);
      } catch (e) {}
    };
    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(checkNotifications, 15000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── TIME HELPERS ─────────────────────────────────────────────────────────
  const formatOrderTime = (createdAt: string) => {
    if (!createdAt) return "--:--";
    const date = new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDelayInfo = (createdAt: string, bufferTime: number) => {
    if (!createdAt) return { text: "Calculando...", isDelayed: false };
    const orderTime = new Date(createdAt).getTime();
    const estimatedTime = orderTime + bufferTime * 60000;
    const now = Date.now();
    const diffMinutes = Math.floor((now - estimatedTime) / 60000);
    
    if (diffMinutes > 0) {
      return { text: `Retraso: +${diffMinutes} min`, isDelayed: true };
    } else {
      return { text: `Quedan: ${Math.abs(diffMinutes)} min`, isDelayed: false };
    }
  };

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleImageUpload = (file: File, setImage: (s: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen no puede superar 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveSetup = async () => {
    if (!setupDescription.trim()) { setSetupMsg("⚠️ La descripción es obligatoria"); return; }
    setSavingSetup(true);
    setSetupMsg("");
    try {
      const user = userRef.current || auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/restaurant-admin/profile", {
        method: "PUT",
        headers: getHeaders(token, true),
        body: JSON.stringify({ description: setupDescription, imageUrl: setupImage || undefined })
      });
      if (res.ok) {
        const updated = await res.json();
        setRestaurant((prev: any) => ({ ...prev, ...updated }));
        setShowSetupWizard(false);
        setSetupMsg("✅ Perfil actualizado");
      } else {
        const err = await res.json();
        setSetupMsg(`❌ ${err.error || "Error al guardar"}`);
      }
    } catch (e) {
      setSetupMsg("❌ Error de conexión");
    } finally {
      setSavingSetup(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setAddingProduct(true);
    setProductMsg("");
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/products", {
        method: "POST",
        headers: getHeaders(token, true),
        body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price), imageUrl: newProductImage || undefined })
      });
      if (res.ok) {
        const product = await res.json();
        setProducts(prev => [product, ...prev]);
        setNewProduct({ name: "", description: "", price: "", category: "", isOutofStock: false, isFeatured: false });
        setNewProductImage("");
        setShowAddProduct(false);
        setProductMsg("✅ Plato añadido correctamente");
      } else {
        const err = await res.json();
        setProductMsg(`❌ ${err.error || "Error"}`);
      }
    } catch (e) {
      setProductMsg("❌ Error de conexión");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este plato?")) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: "DELETE",
        headers: getHeaders(token)
      });
      if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {}
  };

  const handleUpdateProductPrice = async (id: string, price: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: "PUT",
        headers: getHeaders(token, true),
        body: JSON.stringify({ price })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p));
      }
    } catch (e) {}
    setEditingPrice(null);
  };

  const handleUpdateProductToggle = async (id: string, field: string, value: boolean) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: "PUT",
        headers: getHeaders(token, true),
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      }
    } catch (e) {}
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:4000/api/orders/${id}/status`, {
        method: "PUT",
        headers: getHeaders(token, true),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      }
    } catch (e) {}
  };

  const handleSaveRestaurantConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/restaurant-admin/settings", {
        method: "PUT",
        headers: getHeaders(token, true),
        body: JSON.stringify(restaurantConfig)
      });
      if (res.ok) {
        setConfigMsg("✅ Ajustes guardados correctamente");
      } else setConfigMsg("❌ Error al guardar ajustes");
    } catch (e) {
      setConfigMsg("❌ Error de conexión");
    } finally {
      setSavingConfig(false);
      setTimeout(() => setConfigMsg(""), 3000);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      const user = userRef.current || auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/chat/messages", {
        method: "POST",
        headers: getHeaders(token, true),
        body: JSON.stringify({ content: chatInput.trim() })
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages(prev => [...prev, msg]);
        setChatInput("");
      }
    } catch (e) {} finally {
      setSendingChat(false);
    }
  };

  // ─── GUARDS ───────────────────────────────────────────────────────────────

  if (!isAuthorized) return null;

  if (restaurant && restaurant.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-[#F0F2F5] max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#FFF3EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#1A202C] mb-3">Solicitud en revisión</h1>
          <p className="text-[14px] text-[#718096] leading-relaxed mb-6">
            Tu restaurante <span className="font-bold text-[#1A202C]">{restaurant.name}</span> está pendiente de aprobación.<br /><br />
            Recibirás acceso al panel cuando el SuperAdmin lo apruebe.
          </p>
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F0F2F5] mb-6">
            <div className="flex items-center gap-3">
              {restaurant.imageUrl 
                ? <img src={restaurant.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                : <div className="w-10 h-10 rounded-xl bg-[#FFF3EE] flex items-center justify-center"><Store className="w-5 h-5 text-[#FF6B35]" /></div>
              }
              <div className="text-left">
                <p className="font-bold text-[14px] text-[#1A202C]">{restaurant.name}</p>
                <p className="text-[12px] text-[#A0AEC0]">{restaurant.address}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="flex-1 py-3 px-4 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#718096] hover:bg-[#F8F9FA] transition-colors text-center">
              Volver al inicio
            </Link>
            <button onClick={() => { const u = auth.currentUser || userRef.current; if (u) fetchAdminData(u); }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#FF6B35] text-white text-[14px] font-bold hover:bg-[#e55a25] transition-colors">
              Refrescar estado
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const headers = getHeaders(token, true);
      const res = await fetch("http://localhost:4000/api/restaurant-admin/payment", {
        method: "POST",
        headers
      });
      if (res.ok) {
        alert("✅ Pago configurado con éxito. Suscripción activada.");
        fetchAdminData(user);
      }
    } catch (e) {}
  };

  if (restaurant && restaurant.subscriptionPlan !== 'FREE' && !restaurant.paymentConfigured) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-[#F0F2F5] max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-[22px] font-extrabold text-[#1A202C] mb-3">Suscripción Requerida</h1>
          <p className="text-[14px] text-[#718096] mb-8 leading-relaxed">
            Tu plan gratuito ha terminado. Por favor, configura tu pago {restaurant.subscriptionPlan === 'MONTHLY' ? 'mensual' : 'anual'} para continuar usando el panel de control y recibir pedidos.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left space-y-4">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Simulación de Pago</p>
            <input type="text" placeholder="Número de Tarjeta" defaultValue="4242 4242 4242 4242" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white outline-none" disabled />
            <div className="flex gap-3">
              <input type="text" placeholder="MM/AA" defaultValue="12/28" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white outline-none" disabled />
              <input type="text" placeholder="CVC" defaultValue="123" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white outline-none" disabled />
            </div>
          </div>

          <button onClick={handlePayment}
            className="w-full py-3.5 px-4 rounded-xl bg-black text-white text-[14px] font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
            Suscribirse y Desbloquear Panel
          </button>
        </div>
      </div>
    );
  }

  const MENU = [
    { id: "Resumen", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "Pedidos", icon: <ShoppingBag className="w-5 h-5" /> },
    { id: "TPV", icon: <Package className="w-5 h-5" /> },
    { id: "Catálogo", icon: <LayoutGrid className="w-5 h-5" /> },
    { id: "Estadísticas", icon: <BarChart2 className="w-5 h-5" /> },
    { id: "Reseñas", icon: <Star className="w-5 h-5" /> },
    { id: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "Ajustes", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── SETUP WIZARD OVERLAY ─── */}
      {showSetupWizard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] p-8 text-white">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Store className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-[22px] font-extrabold mb-1">¡Completa el perfil de tu restaurante!</h2>
              <p className="text-white/80 text-[14px]">Añade una foto y descripción para que los clientes te conozcan mejor.</p>
            </div>
            <div className="p-8 space-y-5">
              {/* Upload imagen */}
              <div>
                <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Foto del Restaurante</label>
                <div className="relative">
                  {setupImage
                    ? <div className="relative">
                        <img src={setupImage} alt="" className="w-full h-40 object-cover rounded-2xl border border-[#E2E8F0]" />
                        <button onClick={() => setSetupImage("")} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    : <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#E2E8F0] rounded-2xl cursor-pointer hover:border-[#FF6B35] hover:bg-[#FFF3EE] transition-colors group">
                        <Upload className="w-8 h-8 text-[#CBD5E0] group-hover:text-[#FF6B35] mb-2" />
                        <span className="text-[13px] text-[#A0AEC0] group-hover:text-[#FF6B35]">Haz clic para subir una imagen</span>
                        <span className="text-[11px] text-[#CBD5E0] mt-1">Máximo 2MB · JPG, PNG, WEBP</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, setSetupImage);
                        }} />
                      </label>
                  }
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Descripción del Restaurante *</label>
                <textarea
                  value={setupDescription}
                  onChange={e => setSetupDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] resize-none"
                  rows={3}
                  placeholder="Ej: Especialistas en cocina mediterránea con más de 10 años de experiencia..."
                  maxLength={500}
                />
                <p className="text-[11px] text-[#A0AEC0] text-right mt-1">{setupDescription.length}/500</p>
              </div>

              {setupMsg && <p className={`text-[13px] font-medium ${setupMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{setupMsg}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSetupWizard(false)}
                  className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#718096] hover:bg-[#F8F9FA]">
                  Después
                </button>
                <button onClick={handleSaveSetup} disabled={savingSetup}
                  className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-[14px] font-bold hover:bg-[#e55a25] disabled:opacity-60 transition-colors">
                  {savingSetup ? "Guardando..." : "Guardar y continuar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="w-[260px] bg-white border-r border-[#F0F2F5] flex flex-col shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#F0F2F5]">
          <Link href="/" className="text-[22px] font-black text-[#1A202C] tracking-tight">
            Tasti<span className="text-[#FF6B35]">o.</span>
          </Link>
        </div>

        {/* Restaurant info */}
        <div className="px-4 py-4 border-b border-[#F0F2F5]">
          <div className="bg-[#FFF3EE] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#FFE0D0] shrink-0">
              {restaurant?.imageUrl
                ? <img src={restaurant.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Store className="w-6 h-6 text-[#FF6B35]" /></div>
              }
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[14px] text-[#1A202C] truncate">{restaurant?.name || "Mi Restaurante"}</p>
              <p className="text-[11px] text-[#A0AEC0] truncate">{restaurant?.address}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${restaurant?.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {restaurant?.status === 'APPROVED' ? '✅ Activo' : '⏳ Pendiente'}
              </span>
            </div>
          </div>
          {/* Botón editar perfil */}
          <button onClick={() => setShowSetupWizard(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 text-[12px] font-bold text-[#FF6B35] hover:bg-[#FFF3EE] py-2 px-3 rounded-xl transition-colors">
            <Camera className="w-3.5 h-3.5" /> Editar foto y descripción
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          {MENU.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-[14px] transition-all ${activeTab === item.id ? "bg-[#FFF3EE] text-[#FF6B35]" : "text-[#718096] hover:bg-[#F8F9FA]"}`}>
              {item.icon}
              {t.sidebar[item.id] || item.id}
              {item.id === "Chat" && chatMessages.length > 0 && chatMessages[chatMessages.length-1]?.senderRole === 'ADMIN' && (
                <span className="ml-auto w-2 h-2 bg-[#FF6B35] rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Language selector */}
        <div className="px-4 pb-4 border-t border-[#F0F2F5] pt-3">
          <div className="relative">
            <button onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#718096] hover:bg-[#F8F9FA]">
              {lang} <ChevronDown className="w-4 h-4" />
            </button>
            {showLangDropdown && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10">
                {Object.keys(TRANSLATIONS).map(l => (
                  <button key={l} onClick={() => { setLang(l); setShowLangDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#F8F9FA] first:rounded-t-xl last:rounded-b-xl">
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[#F0F2F5] px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] text-[#A0AEC0] font-medium">{t.path}</p>
            <h1 className="text-[18px] font-extrabold text-[#1A202C]">{t.sidebar[activeTab] || activeTab}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F8F9FA] px-4 py-2 rounded-2xl border border-[#F0F2F5]">
              <Search className="w-4 h-4 text-[#A0AEC0]" />
              <input className="bg-transparent text-[13px] outline-none w-[140px]" placeholder={t.search} />
            </div>
            {/* Bell with notification badge */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifDropdown(!showNotifDropdown); setNotifCount(0); }}
                className="p-2 rounded-xl hover:bg-[#F8F9FA] relative">
                <Bell className="w-5 h-5 text-[#718096]" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[#F0F2F5] shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F0F2F5]">
                    <p className="font-extrabold text-[14px] text-[#1A202C]">Notificaciones</p>
                  </div>
                  <div className="p-4">
                    <button onClick={() => { setActiveTab('Pedidos'); setShowNotifDropdown(false); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-[#F8F9FA] flex items-center gap-3 mb-2">
                      <ShoppingBag className="w-4 h-4 text-[#FF6B35]" />
                      <span className="text-[13px] font-semibold text-[#4A5568]">Ver pedidos pendientes</span>
                    </button>
                    <button onClick={() => { setActiveTab('Chat'); setShowNotifDropdown(false); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-[#F8F9FA] flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-[#00A884]" />
                      <span className="text-[13px] font-semibold text-[#4A5568]">Ver mensajes del Admin</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">

          {/* ─── RESUMEN ─── */}
          {activeTab === "Resumen" && (
            <div className="mt-6 space-y-6">
              {/* KPIs reales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title={t.foodToday} value={stats.orders || 0} color="#FFF3EE"
                  icon={<ShoppingBag className="w-5 h-5 text-[#FF6B35]" />} />
                <KPICard title={t.totalRevenue} value={`€${(stats.revenue || 0).toFixed(2)}`} color="#ECFDF5"
                  icon={<TrendingUp className="w-5 h-5 text-[#10B981]" />} />
                <KPICard title={t.clientsToday} value={stats.customers || 0} color="#EBF8FF"
                  icon={<MapPin className="w-5 h-5 text-[#3182CE]" />} />
                <KPICard title={t.employees} value={products.length} color="#F3F0FF"
                  icon={<LayoutGrid className="w-5 h-5 text-[#6C5DD3]" />} />
              </div>

              {/* Gráfica de pedidos REALES */}
              <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-[16px] text-[#1A202C]">{t.salesStats}</h3>
                    <p className="text-[13px] text-[#A0AEC0]">{t.salesSummary}</p>
                  </div>
                </div>
                {chartData.length > 0 && chartData.some(d => d.pedidos > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #F0F2F5", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                      <Bar dataKey="pedidos" name={t.qty} fill="#FF6B35" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] text-center">
                    <BarChart2 className="w-12 h-12 text-[#E2E8F0] mb-3" />
                    <p className="text-[14px] font-semibold text-[#A0AEC0]">Sin pedidos esta semana</p>
                    <p className="text-[12px] text-[#CBD5E0]">Los datos aparecerán cuando recibas pedidos</p>
                  </div>
                )}
              </div>

              {/* Platos del menú (reales) */}
              <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-[16px] text-[#1A202C]">{t.bestSellers}</h3>
                    <p className="text-[13px] text-[#A0AEC0]">{t.bestSellersDesc}</p>
                  </div>
                  <button onClick={() => setActiveTab("Catálogo")}
                    className="text-[13px] font-bold text-[#FF6B35] hover:underline">Ver todo →</button>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
                    <p className="text-[13px] text-[#A0AEC0]">Aún no tienes platos en el menú</p>
                    <button onClick={() => setActiveTab("Catálogo")}
                      className="mt-3 text-[13px] font-bold text-[#FF6B35] hover:underline">Añadir primer plato →</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-4 p-3 rounded-2xl bg-[#F8F9FA] border border-[#F0F2F5]">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shrink-0">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-[#CBD5E0]" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-[#1A202C] truncate">{p.name}</p>
                          {p.description && <p className="text-[11px] text-[#A0AEC0] truncate">{p.description}</p>}
                        </div>
                        <p className="font-black text-[#FF6B35] text-[15px] shrink-0">€{p.price?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TPV ─── */}
          {activeTab === "TPV" && (
            <div className="mt-6 flex flex-col h-full min-h-[600px] -mx-6 -mb-6">
              <AdminTPV restaurant={restaurant} products={products} />
            </div>
          )}

          {/* ─── PEDIDOS (KANBAN) ─── */}
          {activeTab === "Pedidos" && (
            <div className="mt-6 flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Pedidos (Vista Cocina)</h2>
                <span className="text-[13px] text-[#A0AEC0]">{orders.length} en total</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                {/* Columna Pendientes */}
                <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[300px] flex-1 border border-[#F0F2F5]">
                  <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Pendientes ({orders.filter((o:any)=>o.status==='PENDING').length})
                  </h3>
                  <div className="space-y-3">
                    {orders.filter((o:any)=>o.status==='PENDING').map((o:any) => {
                      const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                      return (
                      <div key={o.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[12px] font-bold text-[#718096]">#{o.id.substring(0,8)}</span>
                          <span className="text-[14px] font-black text-[#FF6B35]">€{o.totalAmount?.toFixed(2)}</span>
                        </div>
                        <p className="text-[13px] font-bold text-[#1A202C]">{o.client?.name || o.client?.email || "Cliente"}</p>
                        
                        <div className="flex justify-between items-center mt-2 px-2 py-1.5 bg-[#F8F9FA] rounded-lg">
                           <span className="text-[11px] font-bold text-[#718096]">Pedido: {formatOrderTime(o.createdAt)}</span>
                           <span className={`text-[11px] font-black ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>{timeInfo.text}</span>
                        </div>

                        <div className="mt-3">
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'PREPARING')} className="w-full bg-[#FF6B35] text-white text-[12px] font-bold py-2 rounded-xl hover:bg-[#e55a25] transition-colors">Empezar a preparar</button>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
                {/* Columna Preparando */}
                <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[300px] flex-1 border border-[#F0F2F5]">
                  <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Preparando ({orders.filter((o:any)=>o.status==='PREPARING').length})
                  </h3>
                  <div className="space-y-3">
                    {orders.filter((o:any)=>o.status==='PREPARING').map((o:any) => {
                      const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                      return (
                      <div key={o.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[12px] font-bold text-[#718096]">#{o.id.substring(0,8)}</span>
                          <span className="text-[14px] font-black text-[#FF6B35]">€{o.totalAmount?.toFixed(2)}</span>
                        </div>
                        <p className="text-[13px] font-bold text-[#1A202C]">{o.client?.name || o.client?.email || "Cliente"}</p>
                        
                        <div className="flex justify-between items-center mt-2 px-2 py-1.5 bg-[#F8F9FA] rounded-lg">
                           <span className="text-[11px] font-bold text-[#718096]">Pedido: {formatOrderTime(o.createdAt)}</span>
                           <span className={`text-[11px] font-black ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>{timeInfo.text}</span>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'PENDING')} className="px-3 bg-[#F0F2F5] text-[#718096] text-[12px] font-bold py-2 rounded-xl hover:bg-[#E2E8F0] transition-colors">Atrás</button>
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-blue-100 text-blue-700 text-[12px] font-bold py-2 rounded-xl hover:bg-blue-200 transition-colors">Listo (En Camino)</button>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
                {/* Columna Listos / Entregados */}
                <div className="bg-[#F8F9FA] rounded-3xl p-4 min-w-[300px] flex-1 border border-[#F0F2F5]">
                  <h3 className="font-bold text-[#1A202C] mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span> Enviados / Listos ({orders.filter((o:any)=>['ON_THE_WAY', 'DELIVERED'].includes(o.status)).length})
                  </h3>
                  <div className="space-y-3 opacity-70">
                    {orders.filter((o:any)=>['ON_THE_WAY', 'DELIVERED'].includes(o.status)).map((o:any) => {
                      const timeInfo = getDelayInfo(o.createdAt, restaurant?.bufferTime || 30);
                      return (
                      <div key={o.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${o.status === 'DELIVERED' ? 'opacity-60 grayscale' : 'border-[#E2E8F0]'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[12px] font-bold text-[#718096]">#{o.id.substring(0,8)}</span>
                          <span className="text-[14px] font-black text-[#FF6B35]">€{o.totalAmount?.toFixed(2)}</span>
                        </div>
                        <p className="text-[13px] font-bold text-[#1A202C]">{o.client?.name || o.client?.email || "Cliente"}</p>
                        
                        <div className="flex justify-between items-center mt-2 px-2 py-1.5 bg-[#F8F9FA] rounded-lg">
                           <span className="text-[11px] font-bold text-[#718096]">Pedido: {formatOrderTime(o.createdAt)}</span>
                        </div>

                        <div className="mt-3">
                          {o.status === 'ON_THE_WAY' ? (
                             <button onClick={() => handleUpdateOrderStatus(o.id, 'DELIVERED')} className="w-full bg-green-100 text-green-700 text-[12px] font-bold py-2 rounded-xl hover:bg-green-200 transition-colors">Marcar Entregado</button>
                          ) : (
                             <div className="w-full bg-[#F0F2F5] text-[#718096] text-center text-[12px] font-bold py-2 rounded-xl">Entregado</div>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── CATÁLOGO ─── */}
          {activeTab === "Catálogo" && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-extrabold text-[#1A202C]">Catálogo</h2>
                  <p className="text-[13px] text-[#A0AEC0]">{products.length} platos en tu menú</p>
                </div>
                <button onClick={() => { setShowAddProduct(true); setProductMsg(""); }}
                  className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55a25] text-white px-5 py-2.5 rounded-2xl font-bold text-[14px] transition-colors shadow-lg shadow-orange-200">
                  <Plus className="w-4 h-4" /> Añadir plato
                </button>
              </div>

              {productMsg && (
                <div className={`px-4 py-3 rounded-xl text-[13px] font-medium ${productMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {productMsg}
                </div>
              )}

              {/* Modal añadir plato */}
              {showAddProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                    <h3 className="text-[20px] font-extrabold text-[#1A202C] mb-6">Añadir Nuevo Plato</h3>
                    <div className="space-y-4">
                      {/* Imagen del plato */}
                      <div>
                        <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Foto del Plato</label>
                        {newProductImage
                          ? <div className="relative">
                              <img src={newProductImage} alt="" className="w-full h-36 object-cover rounded-xl border border-[#E2E8F0]" />
                              <button onClick={() => setNewProductImage("")} className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          : <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#FF6B35] hover:bg-[#FFF3EE] transition-colors">
                              <Upload className="w-6 h-6 text-[#CBD5E0] mb-1" />
                              <span className="text-[12px] text-[#A0AEC0]">Subir imagen (máx. 2MB)</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, setNewProductImage);
                              }} />
                            </label>
                        }
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Nombre *</label>
                        <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                          placeholder="Ej: Hamburguesa Premium" />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Categoría</label>
                        <input value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                          placeholder="Ej: Entrantes, Principales..." />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Descripción</label>
                        <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35] resize-none"
                          rows={2} placeholder="Descripción del plato..." />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider">Precio (€) *</label>
                        <input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                          className="mt-1 w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setShowAddProduct(false); setNewProductImage(""); }}
                        className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#718096]">
                        Cancelar
                      </button>
                      <button onClick={handleAddProduct} disabled={addingProduct}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#FF6B35] text-white text-[14px] font-bold hover:bg-[#e55a25] disabled:opacity-50">
                        {addingProduct ? "Añadiendo..." : "Añadir"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {products.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#F0F2F5] shadow-sm flex flex-col items-center text-center">
                  <Package className="w-16 h-16 text-[#E2E8F0] mb-4" />
                  <p className="text-[16px] font-bold text-[#A0AEC0]">Tu catálogo está vacío</p>
                  <p className="text-[13px] text-[#CBD5E0] mt-1">Añade tu primer plato para que los clientes puedan hacer pedidos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((p: any) => (
                    <div key={p.id} className="bg-white rounded-2xl border border-[#F0F2F5] shadow-sm flex gap-4 p-4 group hover:shadow-md transition-shadow">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F8F9FA] border border-[#E2E8F0] shrink-0">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-7 h-7 text-[#CBD5E0]" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-[15px] text-[#1A202C]">{p.name}</p>
                        {p.category && <span className="inline-block px-2 py-0.5 mt-1 text-[10px] bg-[#F0F2F5] text-[#718096] font-bold rounded-full">{p.category}</span>}
                        {p.description && <p className="text-[12px] text-[#A0AEC0] mt-1 line-clamp-2">{p.description}</p>}
                        {/* Price with inline edit */}
                        {editingPrice === p.id ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[14px] font-black text-[#FF6B35]">€</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={editingPriceValue}
                              onChange={e => setEditingPriceValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleUpdateProductPrice(p.id, parseFloat(editingPriceValue)); if (e.key === 'Escape') setEditingPrice(null); }}
                              className="w-20 px-2 py-1 border-2 border-[#FF6B35] rounded-lg text-[14px] font-black text-[#FF6B35] outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateProductPrice(p.id, parseFloat(editingPriceValue))} className="p-1 bg-green-100 hover:bg-green-200 rounded-lg"><Check className="w-3.5 h-3.5 text-green-600" /></button>
                            <button onClick={() => setEditingPrice(null)} className="p-1 bg-red-50 hover:bg-red-100 rounded-lg"><X className="w-3.5 h-3.5 text-red-500" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <p className="font-black text-[#FF6B35] text-[16px]">€{p.price?.toFixed(2)}</p>
                            <button onClick={() => { setEditingPrice(p.id); setEditingPriceValue(p.price?.toString() || '0'); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FFF3EE] rounded-lg">
                              <Pencil className="w-3 h-3 text-[#FF6B35]" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 shrink-0 items-end">
                        <button onClick={() => handleDeleteProduct(p.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <div className="flex flex-col gap-1 items-end">
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-[#718096]">
                            <span className={p.isOutofStock ? "text-red-500" : ""}>Agotado</span>
                            <div className="relative inline-flex items-center">
                              <input type="checkbox" className="sr-only peer" checked={p.isOutofStock} onChange={(e) => handleUpdateProductToggle(p.id, 'isOutofStock', e.target.checked)} />
                              <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-[#718096]">
                            <span className={p.isFeatured ? "text-orange-500" : ""}>Destacado</span>
                            <div className="relative inline-flex items-center">
                              <input type="checkbox" className="sr-only peer" checked={p.isFeatured} onChange={(e) => handleUpdateProductToggle(p.id, 'isFeatured', e.target.checked)} />
                              <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── ESTADÍSTICAS ─── */}
          {activeTab === "Estadísticas" && (
            <div className="mt-6 space-y-6">
              <h2 className="text-[22px] font-extrabold text-[#1A202C]">Estadísticas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-[#F0F2F5] shadow-sm text-center">
                  <p className="text-[36px] font-black text-[#FF6B35]">{stats.orders || 0}</p>
                  <p className="text-[13px] text-[#718096] mt-1">Pedidos totales</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-[#F0F2F5] shadow-sm text-center">
                  <p className="text-[36px] font-black text-[#10B981]">€{(stats.revenue || 0).toFixed(2)}</p>
                  <p className="text-[13px] text-[#718096] mt-1">Ingresos (pedidos entregados)</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-[#F0F2F5] shadow-sm text-center">
                  <p className="text-[36px] font-black text-[#3182CE]">{stats.customers || 0}</p>
                  <p className="text-[13px] text-[#718096] mt-1">Clientes únicos</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm">
                <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-6">Pedidos por día (últimos 7 días)</h3>
                {chartData.length > 0 && chartData.some(d => d.pedidos > 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #F0F2F5" }} />
                      <Bar dataKey="pedidos" name="Pedidos" fill="#FF6B35" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="ingresos" name="Ingresos (€)" fill="#10B981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px]">
                    <BarChart2 className="w-14 h-14 text-[#E2E8F0] mb-3" />
                    <p className="text-[14px] font-semibold text-[#A0AEC0]">Sin datos disponibles</p>
                    <p className="text-[12px] text-[#CBD5E0]">Los datos aparecen cuando recibes pedidos reales</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── RESEÑAS ─── */}
          {activeTab === "Reseñas" && (
            <div className="mt-6 space-y-4">
              <h2 className="text-[22px] font-extrabold text-[#1A202C]">Reseñas</h2>
              <div className="bg-white rounded-3xl p-12 border border-[#F0F2F5] shadow-sm flex flex-col items-center text-center">
                <Star className="w-16 h-16 text-[#E2E8F0] mb-4" />
                <p className="text-[16px] font-bold text-[#A0AEC0]">Próximamente</p>
                <p className="text-[13px] text-[#CBD5E0] mt-1">Las reseñas de tus clientes aparecerán aquí</p>
              </div>
            </div>
          )}

          {/* ─── CHAT ─── */}
          {activeTab === "Chat" && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Chat con el SuperAdmin</h2>
                <p className="text-[13px] text-[#A0AEC0]">Comunícate directamente con el equipo de Tastio</p>
              </div>

              <div className="bg-[#EFEAE2] rounded-3xl border border-[#F0F2F5] shadow-sm flex flex-col overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
                {/* Header */}
                <div className="bg-[#00A884] text-white px-4 py-3 flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate leading-tight">Soporte Tastio</p>
                    <p className="text-[12px] text-white/80 truncate">Línea directa con SuperAdmin</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat' }}>
                  <div className="text-center my-4">
                    <span className="bg-[#FFEEDB] text-[#1B1B1B] text-[11px] font-bold px-3 py-1 rounded-lg inline-block shadow-sm">
                      Chat Oficial de Soporte Tastio
                    </span>
                  </div>

                  {chatMessages.map((msg: any) => {
                    const isMe = msg.senderRole === 'RESTAURANT_OWNER';
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm relative text-[14px] ${isMe ? 'bg-[#D9FDD3] rounded-tr-sm text-[#1B1B1B]' : 'bg-white rounded-tl-sm text-[#1B1B1B]'}`}>
                          {!isMe && <p className="text-[11px] font-bold text-[#FF6B35] mb-0.5">SuperAdmin</p>}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 opacity-60 text-right ${isMe ? 'text-[#1B1B1B]' : 'text-[#888]'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                
                {/* Input */}
                <div className="bg-[#F0F2F5] px-4 py-3 shrink-0 border-t border-[#E2E8F0]">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2 items-center">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-white border-none rounded-full px-4 py-3 text-[14px] outline-none shadow-sm text-[#1B1B1B]"
                      placeholder="Escribe un mensaje al SuperAdmin..."
                      maxLength={1000}
                    />
                    <button type="submit" disabled={!chatInput.trim() || sendingChat}
                      className="w-11 h-11 rounded-full bg-[#00A884] flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50 hover:bg-[#008f6f] transition-colors">
                      <Send className="w-5 h-5 text-white" style={{ marginLeft: '-2px' }} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ─── AJUSTES ─── */}
          {activeTab === "Ajustes" && (
            <div className="mt-6 space-y-6 max-w-4xl">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#1A202C]">Ajustes del Restaurante</h2>
                <p className="text-[13px] text-[#A0AEC0]">Configura la logística y los tiempos de tu local</p>
              </div>

              {configMsg && (
                <div className={`px-4 py-3 rounded-xl text-[13px] font-medium ${configMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {configMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Logística y Entregas</h3>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Costo de Envío (€)</label>
                    <input type="number" value={restaurantConfig.deliveryFee} onChange={e => setRestaurantConfig((p:any) => ({ ...p, deliveryFee: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Pedido Mínimo (€)</label>
                    <input type="number" value={restaurantConfig.minOrder} onChange={e => setRestaurantConfig((p:any) => ({ ...p, minOrder: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Radio de Cobertura (km)</label>
                    <input type="number" value={restaurantConfig.coverageRadius} onChange={e => setRestaurantConfig((p:any) => ({ ...p, coverageRadius: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#F0F2F5] shadow-sm space-y-4">
                  <h3 className="font-extrabold text-[16px] text-[#1A202C] mb-4">Tiempos de Preparación</h3>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Tiempo estimado base (min)</label>
                    <input type="number" value={restaurantConfig.bufferTime} onChange={e => setRestaurantConfig((p:any) => ({ ...p, bufferTime: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]" />
                    <p className="text-[11px] text-[#A0AEC0] mt-1">Tiempo que se añade automáticamente al recibir un pedido.</p>
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#718096] uppercase tracking-wider block mb-2">Horario de Apertura y Cierre</label>
                    <input type="text" value={restaurantConfig.operatingHours || ''} onChange={e => setRestaurantConfig((p:any) => ({ ...p, operatingHours: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[14px] outline-none focus:border-[#FF6B35]"
                      placeholder="Ej: Lun-Vie 10:00-22:00 / Sáb-Dom 12:00-23:00" />
                    <p className="text-[11px] text-[#A0AEC0] mt-1">Se mostrará en el menú público del restaurante.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleSaveRestaurantConfig} disabled={savingConfig}
                  className="bg-[#FF6B35] hover:bg-[#e55a25] text-white px-6 py-3 rounded-xl font-bold text-[14px] transition-colors disabled:opacity-50">
                  {savingConfig ? "Guardando..." : "Guardar Ajustes"}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
