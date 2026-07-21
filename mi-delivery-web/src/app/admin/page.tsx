"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import AdminTPV from "@/components/AdminTPV";
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ConfirmProvider';

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
  const [chartDataAll, setChartDataAll] = useState<any>({ weekly: [], monthly: [], yearly: [] });
  const [revenuePeriod, setRevenuePeriod] = useState("yearly");
  const [ordersPeriod, setOrdersPeriod] = useState("weekly");
  const [categoryPeriod, setCategoryPeriod] = useState("monthly");
  const [trendingPeriod, setTrendingPeriod] = useState("weekly");
  const [typesPeriod, setTypesPeriod] = useState("monthly");
  const [lang, setLang] = useState("Español");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const userRef = useRef<any>(null);
  const { confirm } = useConfirm();

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
                          // Fallback
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
      if (resProducts.ok) setProducts(await resProducts.json());
      if (resChart.ok) setChartDataAll(await resChart.json());
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

  const filterOrdersByPeriod = useCallback((ordersList: any[], period: string) => {
    const now = new Date();
    let startTime = 0;
    if (period === 'weekly') {
      startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (period === 'monthly') {
      startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (period === 'yearly') {
      startTime = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    }
    return ordersList.filter(o => new Date(o.createdAt).getTime() >= startTime);
  }, []);

  const categoryData = useMemo(() => {
    const filteredOrders = filterOrdersByPeriod(orders, categoryPeriod);
    const cats: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items?.forEach((i: any) => {
        const cat = i.product?.category || "Otros";
        cats[cat] = (cats[cat] || 0) + i.quantity;
      });
    });
    if (Object.keys(cats).length === 0) {
      products.forEach(p => {
        const cat = p.category || "Otros";
        cats[cat] = (cats[cat] || 0) + 1;
      });
    }
    const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#FF6B35', '#FFBE00', '#10B981', '#3182CE', '#6C5DD3'];
    return Object.entries(cats)
      .map(([name, val], i) => ({ name, value: Math.round((val / total) * 100), color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value).slice(0, 4);
  }, [orders, products, categoryPeriod, filterOrdersByPeriod]);

  const topProducts = useMemo(() => {
    const filteredOrders = filterOrdersByPeriod(orders, trendingPeriod);
    const sales: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items?.forEach((i: any) => {
        sales[i.productId] = (sales[i.productId] || 0) + i.quantity;
      });
    });
    return [...products]
      .map(p => ({ ...p, sold: sales[p.id] || 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 3);
  }, [products, orders, trendingPeriod, filterOrdersByPeriod]);

  const orderTypesStats = useMemo(() => {
    const filteredOrders = filterOrdersByPeriod(orders, typesPeriod);
    const total = filteredOrders.length || 1;
    let delivery = 0;
    let takeaway = 0;
    filteredOrders.forEach(o => {
      if (o.orderType === 'DELIVERY') delivery++;
      else takeaway++; // For TPV/TAKEAWAY
    });
    return [
      { label: "A domicilio (Delivery)", percent: Math.round((delivery/total)*100), num: delivery, icon: <Package className="w-5 h-5 text-[#FF6B35]" />, color: "#FF6B35" },
      { label: "Para recoger (Takeaway)", percent: Math.round((takeaway/total)*100), num: takeaway, icon: <ShoppingBag className="w-5 h-5 text-[#FFBE00]" />, color: "#FFBE00" }
    ];
  }, [orders, typesPeriod, filterOrdersByPeriod]);

  const currentRevenue = useMemo(() => {
    const data = chartDataAll[revenuePeriod] || [];
    if (data.length === 0) return stats.revenue || 0; // Fallback for all-time if no data loaded
    return data.reduce((acc: number, curr: any) => acc + (curr.ingresos || 0), 0);
  }, [chartDataAll, revenuePeriod, stats.revenue]);

  const currentOrdersCount = useMemo(() => {
    const data = chartDataAll[ordersPeriod] || [];
    if (data.length === 0) return stats.orders || 0; // Fallback for all-time
    return data.reduce((acc: number, curr: any) => acc + (curr.pedidos || 0), 0);
  }, [chartDataAll, ordersPeriod, stats.orders]);

  // ─── TIME HELPERS ─────────────────────────────────────────────────────────
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

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleImageUpload = (file: File, setImage: (s: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2MB");
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
    const isConfirmed = await confirm({ title: "Eliminar Plato", message: "¿Eliminar este plato?", isDanger: true });
    if (!isConfirmed) return;
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
        method: "PATCH",
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
        method: "PATCH",
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
        toast.success("✅ Pago configurado con éxito. Suscripción activada.");
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
          <Link href="/" className="block">
            <img src="/logo-tastio.png" alt="Tastio Logo" className="h-[56px] sm:h-[76px] scale-110 sm:scale-125 -ml-3 w-auto object-contain" />
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
                {restaurant?.status === 'APPROVED' ? (
                  <>
                    ✅ Activo
                    <span className="ml-1 opacity-80 font-medium">
                      ({restaurant?.subscriptionPlan === 'MONTHLY' ? 'Mensual' : 
                        (restaurant?.subscriptionPlan === 'ANNUAL' || restaurant?.subscriptionPlan === 'PREMIUM') ? 'Anual Premium' : 
                        'Prueba'})
                    </span>
                  </>
                ) : '⏳ Pendiente'}
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
            <div className="mt-6 flex flex-col xl:flex-row gap-6">
              
              {/* MAIN COLUMN */}
              <div className="flex-1 flex flex-col space-y-6">
                
                {/* 1. KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-[20px] shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
                      <ShoppingBag className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#A0AEC0] font-semibold">Total Pedidos</p>
                      <div className="flex items-end gap-2 mt-0.5">
                        <p className="text-[22px] font-extrabold text-[#1A202C] leading-none">{stats.orders || 0}</p>
                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>1.58%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-[20px] shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
                      <MapPin className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#A0AEC0] font-semibold">Clientes Totales</p>
                      <div className="flex items-end gap-2 mt-0.5">
                        <p className="text-[22px] font-extrabold text-[#1A202C] leading-none">{stats.customers || 0}</p>
                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>0.42%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-[20px] shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#A0AEC0] font-semibold">Ingresos Totales</p>
                      <div className="flex items-end gap-2 mt-0.5">
                        <p className="text-[22px] font-extrabold text-[#1A202C] leading-none">€{(stats.revenue || 0).toFixed(2)}</p>
                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>2.36%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Revenue Line Chart */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-[13px] font-bold text-[#A0AEC0]">
                          {revenuePeriod === 'weekly' ? 'Ingresos (Esta semana)' : revenuePeriod === 'monthly' ? 'Ingresos (Último mes)' : 'Ingresos (12 meses)'}
                        </h3>
                        <p className="text-[24px] font-extrabold text-[#1A202C] mt-1">€{(currentRevenue || 0).toFixed(2)}</p>
                      </div>
                      <select 
                        value={revenuePeriod} 
                        onChange={(e) => setRevenuePeriod(e.target.value)}
                        className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <option value="weekly">Esta semana</option>
                        <option value="monthly">Último mes</option>
                        <option value="yearly">Últimos 12 meses</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 mb-4 mt-2 justify-end">
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#A0AEC0]"><div className="w-2 h-2 rounded-full bg-[#FF6B35]"/> Ingresos</div>
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#A0AEC0]"><div className="w-2 h-2 rounded-full bg-[#1A202C]"/> Gastos</div>
                    </div>
                    <div className="flex-1 min-h-[220px]">
                      {(chartDataAll[revenuePeriod] || []).length > 0 && (chartDataAll[revenuePeriod] || []).some((d: any) => d.ingresos > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartDataAll[revenuePeriod] || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A0AEC0' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="ingresos" stroke="#FF6B35" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-[13px] text-[#A0AEC0]">Sin ingresos en este periodo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Categories Donut & Order Types */}
                  <div className="flex flex-col gap-6">
                    {/* Top Categories */}
                    <div className="bg-white rounded-[20px] p-6 shadow-sm flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[16px] font-extrabold text-[#1A202C]">Top Categorías</h3>
                        <select 
                          value={categoryPeriod}
                          onChange={(e) => setCategoryPeriod(e.target.value)}
                          className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <option value="weekly">Esta semana</option>
                          <option value="monthly">Último mes</option>
                          <option value="yearly">Últimos 12 meses</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-center h-[160px] relative mt-2">
                        {categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={categoryData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-[13px] text-[#A0AEC0]">Sin datos</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-6">
                        {categoryData.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-[12px] font-semibold text-[#4A5568]">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </div>
                            <span className="text-[#A0AEC0]">{c.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Orders Overview & Types ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Orders Overview BarChart */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[16px] font-extrabold text-[#1A202C]">Vista de Pedidos</h3>
                      <select 
                        value={ordersPeriod}
                        onChange={(e) => setOrdersPeriod(e.target.value)}
                        className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <option value="weekly">Esta semana</option>
                        <option value="monthly">Último mes</option>
                        <option value="yearly">Últimos 12 meses</option>
                      </select>
                    </div>
                    <div className="h-[220px]">
                      {(chartDataAll[ordersPeriod] || []).length > 0 && (chartDataAll[ordersPeriod] || []).some((d: any) => d.pedidos > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartDataAll[ordersPeriod] || []} barSize={24} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A0AEC0' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A0AEC0' }} />
                            <Tooltip cursor={{ fill: '#FFF3EE' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="pedidos" fill="#FFD5C2" radius={[6, 6, 0, 0]} activeBar={{ fill: '#FF6B35' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-[13px] text-[#A0AEC0]">Sin pedidos registrados</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Types */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-[16px] font-extrabold text-[#1A202C]">Tipos de Pedido</h3>
                      <select 
                        value={typesPeriod}
                        onChange={(e) => setTypesPeriod(e.target.value)}
                        className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <option value="weekly">Esta semana</option>
                        <option value="monthly">Último mes</option>
                        <option value="yearly">Últimos 12 meses</option>
                      </select>
                    </div>
                    <div className="space-y-8">
                      {orderTypesStats.map((type: any, idx: number) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#FFF3EE] flex items-center justify-center shrink-0">
                                {type.icon}
                              </div>
                              <div>
                                <span className="text-[14px] font-extrabold text-[#1A202C]">{type.label} <span className="text-[#A0AEC0] font-medium ml-1">{type.percent}%</span></span>
                              </div>
                            </div>
                            <span className="text-[16px] font-extrabold text-[#1A202C]">{type.num}</span>
                          </div>
                          <div className="w-full bg-[#F0F2F5] rounded-full h-2.5">
                            <div className="h-2.5 rounded-full transition-all duration-1000" style={{ width: `${type.percent}%`, backgroundColor: type.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. RECENT ORDERS TABLE */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-extrabold text-[#1A202C]">Pedidos Recientes</h3>
                    <div className="flex items-center gap-3">
                      <select className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors">
                        <option>Esta Semana</option>
                      </select>
                      <button onClick={() => setActiveTab('Pedidos')} className="bg-white border border-[#E2E8F0] px-4 py-1.5 rounded-xl text-[12px] font-bold text-[#4A5568] hover:bg-gray-50 transition-colors">
                        Ver Todos
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Order ID</th>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Plato / Menú</th>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Cant.</th>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Total</th>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Cliente</th>
                          <th className="text-[12px] font-semibold text-[#A0AEC0] py-4 border-b border-[#F0F2F5]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => {
                          const mainItem = o.items?.[0]?.product;
                          return (
                            <tr key={o.id} className="hover:bg-gray-50/50 transition-colors border-b border-[#F0F2F5] last:border-0">
                              <td className="py-4 text-[13px] font-bold text-[#4A5568]">#{o.id.substring(0,7).toUpperCase()}</td>
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  {mainItem?.imageUrl ? (
                                    <img src={mainItem.imageUrl} className="w-12 h-12 rounded-[14px] object-cover border border-[#F0F2F5]" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-[14px] bg-gray-100 flex items-center justify-center"><Package className="w-5 h-5 text-gray-400"/></div>
                                  )}
                                  <div>
                                    <p className="text-[14px] font-extrabold text-[#1A202C] max-w-[160px] truncate">{mainItem?.name || "Varios Platos"}</p>
                                    <p className="text-[12px] text-[#A0AEC0]">{mainItem?.category || "Menú"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-[14px] font-extrabold text-[#1A202C]">{o.items?.length || 1}</td>
                              <td className="py-4 text-[14px] font-extrabold text-[#FF6B35]">
                                €{o.totalAmount?.toFixed(2)}
                                {o.orderType === 'DELIVERY' && <span className="text-[10px] text-[#A0AEC0] ml-1 block mt-0.5">+ Envío</span>}
                              </td>
                              <td className="py-4 text-[13px] font-bold text-[#4A5568] truncate max-w-[120px]">{o.client?.name || "Invitado"}</td>
                              <td className="py-4">
                                <StatusBadge status={o.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {orders.length === 0 && (
                      <div className="py-10 text-center text-[13px] text-[#A0AEC0] font-medium">No hay pedidos recientes</div>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT SIDEBAR: TRENDING MENUS */}
              <div className="w-full xl:w-[320px] shrink-0">
                <div className="bg-white rounded-[20px] p-6 shadow-sm sticky top-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[16px] font-extrabold text-[#1A202C]">Menús en Tendencia</h3>
                    <select 
                      value={trendingPeriod}
                      onChange={(e) => setTrendingPeriod(e.target.value)}
                      className="bg-gray-50 border border-gray-100 text-[12px] font-bold text-[#4A5568] py-1.5 px-3 rounded-xl outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <option value="weekly">Esta semana</option>
                      <option value="monthly">Último mes</option>
                      <option value="yearly">Últimos 12 meses</option>
                    </select>
                  </div>

                  <div className="space-y-5">
                    {topProducts.map((p, idx) => (
                      <div key={idx} className="bg-white border border-[#F0F2F5] rounded-[20px] overflow-hidden hover:shadow-lg transition-shadow duration-300 group cursor-pointer">
                        <div className="h-40 w-full bg-gray-100 relative overflow-hidden">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-[#CBD5E0]" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h4 className="text-[15px] font-extrabold text-[#1A202C] mb-1 line-clamp-1">{p.name}</h4>
                          <p className="text-[12px] font-medium text-[#A0AEC0] mb-4">{p.category || "Plato Principal"}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#4A5568]">
                                <Star className="w-4 h-4 text-[#FFBE00] fill-[#FFBE00]" /> 4.9
                              </div>
                              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#A0AEC0]">
                                <ShoppingBag className="w-4 h-4" /> {p.sold || 0}
                              </div>
                            </div>
                            <span className="text-[16px] font-black text-[#FF6B35]">€{(p.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {topProducts.length === 0 && (
                      <div className="py-8 text-center">
                        <Package className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
                        <p className="text-[13px] text-[#A0AEC0] font-medium">Añade productos para ver tendencias.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TPV ─── */}
          {activeTab === "TPV" && (
            <div className="mt-6 flex flex-col h-full min-h-[600px] -mx-6 -mb-6 relative">
              <AdminTPV restaurant={restaurant} products={products} onClose={() => setActiveTab("Resumen")} />
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
                      <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-[13px] font-extrabold text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
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
                        
                        <div className="bg-[#F8F9FA] rounded-xl p-3 mb-3 border border-[#F0F2F5]">
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

                        {/* Order Items */}
                        <div className="space-y-2 mb-3 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                          {o.items?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                              <div className="flex items-start gap-2">
                                <span className="text-[14px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                                <span className="text-[13px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                              </div>
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-1.5 pl-9 space-y-1">
                                  {item.extras.map((ex: any, j: number) => (
                                    <div key={j} className="flex items-center gap-1.5 text-[11px] font-bold text-[#718096]">
                                      <div className="w-1 h-1 rounded-full bg-[#CBD5E0]"></div>
                                      <span className="leading-tight">{ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mb-2 pt-3 border-t border-[#F0F2F5]">
                           <span className="text-[12px] font-bold text-[#718096]">
                             Hora de realizado: {timeInfo.creationTime}
                           </span>
                           <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                             <Clock className="w-4 h-4" /> {timeInfo.text}
                           </span>
                        </div>

                        <div className="mt-4">
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'PREPARING')} className="w-full bg-[#FF6B35] text-white text-[13px] font-bold py-2.5 rounded-xl hover:bg-[#e55a25] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.2)]">Empezar a preparar</button>
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
                      <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${timeInfo.isDelayed ? 'border-red-300' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-[13px] font-extrabold text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
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
                        
                        <div className="bg-[#F8F9FA] rounded-xl p-3 mb-3 border border-[#F0F2F5]">
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

                        {/* Order Items */}
                        <div className="space-y-2 mb-3 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                          {o.items?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                              <div className="flex items-start gap-2">
                                <span className="text-[14px] font-black text-[#3182CE] bg-[#EBF8FF] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                                <span className="text-[13px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                              </div>
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-1.5 pl-9 space-y-1">
                                  {item.extras.map((ex: any, j: number) => (
                                    <div key={j} className="flex items-center gap-1.5 text-[11px] font-bold text-[#718096]">
                                      <div className="w-1 h-1 rounded-full bg-[#CBD5E0]"></div>
                                      <span className="leading-tight">{ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mb-2 pt-3 border-t border-[#F0F2F5]">
                           <span className="text-[12px] font-bold text-[#718096]">
                             Hora de realizado: {timeInfo.creationTime}
                           </span>
                           <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                             <Clock className="w-4 h-4" /> {timeInfo.text}
                           </span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'PENDING')} className="px-3.5 bg-[#F0F2F5] text-[#718096] text-[13px] font-bold py-2.5 rounded-xl hover:bg-[#E2E8F0] transition-colors">Atrás</button>
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-blue-100 text-blue-700 text-[13px] font-bold py-2.5 rounded-xl hover:bg-blue-200 transition-colors">Listo (En Camino)</button>
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
                      <div key={o.id} className={`bg-white p-5 rounded-[20px] shadow-sm border ${o.status === 'DELIVERED' ? 'opacity-60 grayscale' : 'border-[#E2E8F0]'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-[13px] font-extrabold text-[#1A202C]">#{o.id.substring(0,8).toUpperCase()}</span>
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
                        
                        <div className="bg-[#F8F9FA] rounded-xl p-3 mb-3 border border-[#F0F2F5]">
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

                        {/* Order Items */}
                        <div className="space-y-2 mb-3 bg-[#F8F9FA] rounded-xl p-3 border border-[#F0F2F5]">
                          {o.items?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col border-b border-[#E2E8F0] pb-2 mb-2 last:mb-0 last:pb-0 last:border-0">
                              <div className="flex items-start gap-2">
                                <span className="text-[14px] font-black text-[#38A169] bg-[#F0FFF4] px-2 py-0.5 rounded-lg">{item.qty}x</span>
                                <span className="text-[13px] font-extrabold text-[#1A202C] leading-tight pt-1">{item.product?.name || "Producto"}</span>
                              </div>
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-1.5 pl-9 space-y-2">
                                  {Array.from(new Set(item.extras.map((ex: any) => ex.section))).map((secName: any, idx: number) => (
                                    <div key={idx}>
                                      <div className="text-[10px] font-black uppercase text-[#A0AEC0] tracking-wider mb-0.5">{secName}:</div>
                                      {item.extras.filter((ex: any) => ex.section === secName).map((ex: any, j: number) => (
                                        <div key={j} className="flex items-center gap-1.5 text-[11px] font-bold text-[#718096]">
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

                        <div className="flex justify-between items-center mb-2 pt-3 border-t border-[#F0F2F5]">
                           <span className="text-[12px] font-bold text-[#718096]">
                             Hora de realizado: {timeInfo.creationTime}
                           </span>
                           <span className={`text-[12px] font-black flex items-center gap-1.5 ${timeInfo.isDelayed ? 'text-red-500' : 'text-[#38A169]'}`}>
                             <Clock className="w-4 h-4" /> {timeInfo.text}
                           </span>
                        </div>

                        <div className="mt-4">
                          {o.status === 'ON_THE_WAY' ? (
                             <button onClick={() => handleUpdateOrderStatus(o.id, 'DELIVERED')} className="w-full bg-green-100 text-green-700 text-[13px] font-bold py-2.5 rounded-xl hover:bg-green-200 transition-colors">Marcar Entregado</button>
                          ) : (
                             <div className="w-full bg-[#F0F2F5] text-[#718096] text-center text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                               <Check className="w-4 h-4" /> Entregado
                             </div>
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
                {chartDataAll && chartDataAll.weekly ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartDataAll.weekly} barSize={32}>
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
                    <p className="text-[14px] font-semibold text-[#A0AEC0]">Cargando datos...</p>
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
