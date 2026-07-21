"use client";

import { useEffect, useState, useRef } from "react";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  deleteUser,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ConfirmProvider';
import Link from "next/link";
import {
  Camera, ChevronLeft, ChevronRight, LogOut, Mail, Phone,
  Save, Shield, User as UserIcon, AlertCircle, CheckCircle,
  Eye, EyeOff, Pencil, X, Clock, Heart, MapPin, Star, ShoppingBag, Plus
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────
const GRADIENT = "linear-gradient(135deg,#FF6B35,#FFBE00)";

function Avatar({ user, size = 88 }: { user: User; size?: number }) {
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      setLocalPhoto(localStorage.getItem(`tastio_avatar_${user.uid}`));
    }
  }, [user?.uid, user?.photoURL]);

  const photo = localPhoto || user?.photoURL;

  if (photo) {
    return (
      <img
        src={photo}
        alt="foto de perfil"
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
      />
    );
  }
  const letter = (user?.displayName || user?.email || "U")[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
      <span style={{ color: "#fff", fontSize: size * 0.4, fontWeight: 800 }}>{letter}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F5F5F5]">
        <h2 className="text-[15px] font-bold text-[#1B1B1B]">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onSave, type = "text", editable = true }: {
  label: string; value: string; type?: string; editable?: boolean;
  onSave?: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(value);
  const [loading, setLoading] = useState(false);
  const [ok,      setOk]      = useState(false);

  const save = async () => {
    if (!onSave || val === value) { setEditing(false); return; }
    setLoading(true);
    try {
      await onSave(val);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setLoading(false);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#F8F8F8] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-0.5">{label}</div>
        {editing ? (
          <input
            autoFocus
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            suppressHydrationWarning
            className="w-full bg-[#F7F7F7] border-2 border-[#FF6B35] rounded-xl px-3 py-2 text-[14px] text-[#1B1B1B] outline-none mt-1"
          />
        ) : (
          <div className="text-[15px] font-medium text-[#1B1B1B] truncate">{value || <span className="text-[#CCC]">Sin especificar</span>}</div>
        )}
      </div>
      {editable && onSave && (
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {ok && <CheckCircle className="w-4 h-4 text-green-500" />}
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setVal(value); }}
                className="p-1.5 rounded-lg text-[#AAA] hover:text-[#555] hover:bg-[#F5F5F5] border-none bg-transparent cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={save} disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-[12px] font-bold border-none cursor-pointer disabled:opacity-60 transition-all hover:-translate-y-[1px]"
                style={{ background: GRADIENT }}>
                {loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-[#AAA] hover:text-[#FF6B35] hover:bg-[#FFF3EE] border-none bg-transparent cursor-pointer transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────
function PasswordSection({ user }: { user: User }) {
  const isGoogle = user.providerData.some(p => p.providerId === "google.com");
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [showC,   setShowC]   = useState(false);
  const [showN,   setShowN]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (isGoogle) {
    return (
      <div className="flex items-center gap-3 text-[14px] text-[#888] bg-[#F7F7F7] rounded-xl px-4 py-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Tu contraseña es gestionada por Google. Para cambiarla, visita myaccount.google.com
      </div>
    );
  }

  const handleChange = async () => {
    setMsg(null);
    if (next !== confirm) { setMsg({ type: "err", text: "Las contraseñas no coinciden" }); return; }
    if (next.length < 6)  { setMsg({ type: "err", text: "Mínimo 6 caracteres" }); return; }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email!, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, next);
      setMsg({ type: "ok", text: "Contraseña actualizada correctamente" });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e: any) {
      setMsg({ type: "err", text: e.code === "auth/wrong-password" ? "Contraseña actual incorrecta" : e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {[
        { label: "Contraseña actual", val: current, set: setCurrent, show: showC, toggle: () => setShowC(v => !v) },
        { label: "Nueva contraseña",  val: next,    set: setNext,    show: showN, toggle: () => setShowN(v => !v) },
        { label: "Confirmar contraseña", val: confirm, set: setConfirm, show: showN, toggle: () => {} },
      ].map((f, i) => (
        <div key={i} className="relative">
          <label className="block text-[12px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">{f.label}</label>
          <div className="relative">
            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCC]" />
            <input type={f.show ? "text" : "password"} value={f.val}
              onChange={e => f.set(e.target.value)} suppressHydrationWarning placeholder="••••••••"
              className="w-full bg-[#F7F7F7] border-2 border-[#F0F0F0] focus:border-[#FF6B35] focus:bg-white rounded-2xl pl-10 pr-10 py-2.5 text-[14px] text-[#1B1B1B] placeholder:text-[#CCC] outline-none transition-all" />
            {i < 2 && (
              <button type="button" onClick={f.toggle}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#CCC] hover:text-[#888] transition-colors p-0">
                {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      ))}

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium ${msg.type === "ok" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-500 border border-red-100"}`}>
          {msg.type === "ok" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <button onClick={handleChange} disabled={loading || !current || !next || !confirm}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[14px] font-bold border-none cursor-pointer disabled:opacity-40 transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(255,107,53,0.3)]"
        style={{ background: GRADIENT }}>
        {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
        Actualizar contraseña
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUser,   setDbUser]  = useState<any>(null);
  const [orders,   setOrders]  = useState<any[]>([]);
  const [favRests, setFavRests]= useState<any[]>([]);
  const router = useRouter();

  const [showAllOrders, setShowAllOrders] = useState(false);
  const { confirm } = useConfirm();
  const [showAllFavs, setShowAllFavs] = useState(false);
  const [photoError, setPhotoError] = useState<string>("");

  // Estados de reseña
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const submitReview = async () => {
    if (!reviewOrder || submittingReview) return;
    setSubmittingReview(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("http://localhost:4000/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          restaurantId: reviewOrder.restaurantId,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (res.ok) {
        toast.success("¡Reseña enviada con éxito!");
        setReviewOrder(null);
        setReviewRating(5);
        setReviewComment("");
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al enviar la reseña");
      }
    } catch (e: any) {
      toast.error("Error de red al enviar la reseña");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      
      try {
        const token = await u.getIdToken();
        
        // Fetch DB Profile
        const resProf = await fetch("http://localhost:4000/api/auth/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resProf.ok) {
          const prof = await resProf.json();
          setDbUser(prof);
        }

        // Fetch Orders
        const resOrd = await fetch("http://localhost:4000/api/orders/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resOrd.ok) {
          const ords = await resOrd.json();
          setOrders(ords);
        }

        // Fetch Favorites
        const favs = JSON.parse(localStorage.getItem(`tastio_favorites_${u.uid}`) || "[]");
        let allRests: any[] = [];
        try {
          const resRests = await fetch("http://localhost:4000/api/restaurants");
          if (resRests.ok) allRests = await resRests.json();
        } catch(e) {}
        
        const localRests = JSON.parse(localStorage.getItem("tastio_restaurants") || "[]");
        const formattedLocals = localRests.map((r: any) => ({ id: r.id, name: r.name, imageUrl: r.heroImg || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop", description: r.address || "" }));
        
        const fallbackRests = [
          { id: "demo1", name: "McDonald's | Centro", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&h=600&fit=crop" },
          { id: "demo7", name: "El Kebab Real", imageUrl: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1400&h=600&fit=crop" },
          { id: "demo2", name: "Chinacy", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1400&h=600&fit=crop" },
          { id: "demo3", name: "Five Guys Burguer", imageUrl: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=1400&h=600&fit=crop" },
          { id: "demo4", name: "Spicy Sichuan", imageUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1400&h=600&fit=crop" },
          { id: "demo5", name: "Taste of India", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1400&h=600&fit=crop" },
          { id: "demo6", name: "Vapiano Algeciras", imageUrl: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=1400&h=600&fit=crop" },
          { id: "demo8", name: "Tokyo Sushi", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1400&h=600&fit=crop" }
        ];

        const combined = [...allRests, ...formattedLocals, ...fallbackRests];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        const myFavs = unique.filter(r => favs.includes(r.id));
        setFavRests(myFavs);

      } catch (e) {}

      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F0F0F0] border-t-[#FF6B35] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const isGoogle = user.providerData.some(p => p.providerId === "google.com");

  const saveName = async (v: string) => {
    await updateProfile(user, { displayName: v });
    setUser({ ...user, displayName: v } as User);
  };

  const savePhoto = async (v: string) => {
    await updateProfile(user, { photoURL: v });
    setUser({ ...user, photoURL: v } as User);
  };

  const savePhone = async (v: string) => {
    const token = await user.getIdToken();
    await fetch("http://localhost:4000/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ phone: v, address: dbUser?.address })
    });
    setDbUser((prev: any) => ({ ...prev, phone: v }));
  };

  const saveAddress = async (v: string) => {
    const token = await user.getIdToken();
    await fetch("http://localhost:4000/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ phone: dbUser?.phone, address: v })
    });
    setDbUser((prev: any) => ({ ...prev, address: v }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("La foto original es demasiado grande. Máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        try {
          // Subir a Firebase Storage
          const storageRef = ref(storage, `tastio_avatars/${user.uid}.jpg`);
          await uploadString(storageRef, base64, "data_url");
          const downloadURL = await getDownloadURL(storageRef);

          localStorage.setItem(`tastio_avatar_${user.uid}`, downloadURL);
          setUser({ ...user, photoURL: downloadURL } as User);
          await updateProfile(user, { photoURL: downloadURL });
        } catch (e: any) {
          console.error("Error al subir imagen a Storage", e);
          setPhotoError("Error al subir la imagen. Intenta de nuevo.");
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = await confirm({ title: "Eliminar Cuenta", message: "¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Perderás todos tus pedidos y favoritos.", isDanger: true });
    if (isConfirmed) {
      try {
        await deleteUser(user);
        router.push("/");
      } catch (e: any) {
        if (e.code === "auth/requires-recent-login") {
          toast.error("Por seguridad, debes cerrar sesión y volver a entrar antes de eliminar tu cuenta.");
        } else {
          toast.error("Error al eliminar cuenta: " + e.message);
        }
      }
    }
  };

  const joinedDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
    : "Desconocido";

  return (
    <div className="min-h-screen bg-[#F7F7F7]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div className="bg-white border-b border-[#F0F0F0] sticky top-0 z-40">
        <div className="max-w-[780px] mx-auto px-4 h-[56px] flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-xl bg-[#F5F5F5] hover:bg-[#EBEBEB] flex items-center justify-center no-underline transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#555]" />
          </Link>
          <span className="text-[16px] font-bold text-[#1B1B1B]">Mi perfil</span>
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-4 py-8 space-y-5">

        {/* ── HERO CARD ── */}
        <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden">
          {/* Cover gradient */}
          <div className="h-[100px] relative" style={{ background: "linear-gradient(135deg,#FF6B35 0%,#FFBE00 100%)" }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 20px 20px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar overlapping cover */}
            <div className="flex items-end justify-between -mt-11 mb-4">
              <div className="relative group cursor-pointer inline-block" onClick={() => document.getElementById('photoUpload')?.click()}>
                <Avatar user={user} size={88} />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="w-8 h-8 text-white" />
                </div>
                {/* Plus icon in the corner */}
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#FF6B35] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                   <Plus className="w-4 h-4 text-white" />
                </div>
                {/* Tooltip hint for Google users */}
                {isGoogle && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#F0F0F0] flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                )}
              </div>
              <input type="file" id="photoUpload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handlePhotoUpload} />
            </div>

            {photoError && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-[13px] font-bold border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {photoError}
              </div>
            )}

            <h1 className="text-[22px] font-extrabold text-[#1B1B1B] leading-tight">
              {user.displayName || user.email?.split("@")[0]}
            </h1>
            <p className="text-[13px] text-[#AAAAAA] mt-0.5">{user.email}</p>
            <p className="text-[12px] text-[#CCCCCC] mt-1">Miembro desde {joinedDate}</p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { icon: <ShoppingBag className="w-5 h-5 mx-auto text-[#1B1B1B]" />, label: "Pedidos", value: orders.length || "0" },
                { icon: <Heart className="w-5 h-5 mx-auto text-[#1B1B1B]" />, label: "Favoritos", value: favRests.length || "0" },
                { icon: <Star className="w-5 h-5 mx-auto text-[#1B1B1B]" />, label: "Reseñas", value: "0" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F7F7F7] rounded-xl px-3 py-3 text-center">
                  <div className="mb-1">{s.icon}</div>
                  <div className="text-[18px] font-extrabold text-[#1B1B1B]">{s.value}</div>
                  <div className="text-[11px] text-[#AAAAAA] font-medium">{s.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── DATOS PERSONALES ── */}
        <Card title="Datos personales">
          <FieldRow label="Nombre completo" value={user.displayName || ""} onSave={saveName} />
          <FieldRow label="Correo electrónico" value={user.email || ""} editable={false} />
          <FieldRow label="Teléfono" value={dbUser?.phone || ""} onSave={savePhone} />

          <FieldRow label="Cuenta creada con" value={isGoogle ? "Google" : "Correo y contraseña"} editable={false} />
        </Card>

        {/* ── CONTRASEÑA ── */}
        <Card title="Seguridad · Cambiar contraseña">
          <PasswordSection user={user} />
        </Card>

        {/* ── DIRECCIONES ── */}
        <Card title="Mis direcciones">
          <div className="pb-4">
             <FieldRow label="Dirección principal" value={dbUser?.address || ""} onSave={saveAddress} />
          </div>
          {!dbUser?.address && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF3EE] flex items-center justify-center mb-3">
                <MapPin className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <p className="text-[13px] text-[#AAAAAA]">Tus direcciones de entrega aparecerán aquí</p>
            </div>
          )}
        </Card>

        {/* ── PEDIDOS ── */}
        <Card title="Historial de pedidos">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F7F7F7] flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-[#CCCCCC]" />
              </div>
              <p className="text-[15px] font-bold text-[#1B1B1B] mb-1">Sin pedidos aún</p>
              <p className="text-[13px] text-[#AAAAAA]">Tus pedidos pasados aparecerán aquí</p>
              <Link href="/" className="mt-4 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold no-underline inline-block transition-all hover:-translate-y-[1px]"
                style={{ background: GRADIENT }}>
                Explorar restaurantes
              </Link>
            </div>
          ) : (
            <div className="mt-2">
              <div className="space-y-4">
                {(showAllOrders ? orders : orders.slice(0, 4)).map((o: any) => (
                  <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F9F9F9] rounded-2xl border border-[#F0F0F0]">
                    <div className="flex items-center gap-3">
                       {o.restaurant?.imageUrl ? <img src={o.restaurant.imageUrl} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-gray-200" />}
                       <div>
                         <div className="text-[15px] font-bold text-[#1B1B1B]">{o.restaurant?.name || "Restaurante"}</div>
                         <div className="text-[12px] text-[#888]">{new Date(o.createdAt).toLocaleDateString()} · {o.items?.length} items</div>
                       </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex flex-col items-start sm:items-end justify-between gap-2">
                       <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full justify-between">
                         <div className="text-[16px] font-extrabold text-[#FF6B35]">€{o.totalAmount.toFixed(2)}</div>
                         <div className="text-[11px] font-bold px-2 py-1 bg-green-100 text-green-600 rounded-md mt-1 uppercase tracking-wider">{o.status}</div>
                       </div>
                       {o.status === "DELIVERED" ? (
                         <button onClick={() => setReviewOrder(o)} className="text-[12px] font-bold text-[#FF6B35] hover:underline flex items-center gap-1 mt-1">
                           <Star className="w-3.5 h-3.5 fill-current" /> Dejar una reseña
                         </button>
                       ) : (
                         <button onClick={() => router.push(`/rastreo/${o.id}`)} className="text-[12px] font-bold text-[#FF6B35] hover:underline flex items-center gap-1 mt-1">
                           <Clock className="w-3.5 h-3.5" /> Rastrear pedido
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
              {orders.length > 4 && (
                <button 
                  onClick={() => setShowAllOrders(!showAllOrders)}
                  className="w-full mt-4 py-3 bg-[#F7F7F7] text-[#1B1B1B] text-[13px] font-bold rounded-xl hover:bg-[#F0F0F0] cursor-pointer transition-colors border-none">
                  {showAllOrders ? "Ver menos" : `Ver ${orders.length - 4} pedidos más`}
                </button>
              )}
            </div>
          )}
        </Card>

        {/* ── FAVORITOS ── */}
        <Card title="Restaurantes favoritos">
          {favRests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF3EE] flex items-center justify-center mb-3">
                <Heart className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <p className="text-[15px] font-bold text-[#1B1B1B] mb-1">Sin favoritos guardados</p>
              <p className="text-[13px] text-[#AAAAAA]">Guarda tus restaurantes favoritos para acceder más rápido</p>
            </div>
          ) : (
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(showAllFavs ? favRests : favRests.slice(0, 4)).map((r: any) => (
                  <Link key={r.id} href={`/restaurant/${r.slug || r.id}`} className="no-underline group">
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#F0F0F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <img src={r.imageUrl || r.heroImg} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <div className="text-[14px] font-bold text-[#1B1B1B] group-hover:text-[#FF6B35] transition-colors">{r.name}</div>
                        <div className="text-[12px] text-[#888] line-clamp-1">{r.address || r.description}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {favRests.length > 4 && (
                <button 
                  onClick={() => setShowAllFavs(!showAllFavs)}
                  className="w-full mt-4 py-3 bg-[#F7F7F7] text-[#1B1B1B] text-[13px] font-bold rounded-xl hover:bg-[#F0F0F0] cursor-pointer transition-colors border-none">
                  {showAllFavs ? "Ver menos" : `Ver ${favRests.length - 4} restaurantes más`}
                </button>
              )}
            </div>
          )}
        </Card>

        {/* ── DANGER ZONE ── */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50">
            <h2 className="text-[15px] font-bold text-red-400">Zona de peligro</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#1B1B1B]">Eliminar cuenta</p>
                <p className="text-[12px] text-[#AAAAAA] mt-0.5">Esta acción es permanente y no se puede deshacer.</p>
              </div>
              <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-xl text-red-500 text-[13px] font-bold border-2 border-red-200 bg-transparent hover:bg-red-50 cursor-pointer transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="text-center pb-12 mt-12">
        <button onClick={() => { signOut(auth); router.push("/"); }} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-[14px] hover:bg-red-100 transition-colors">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* Modal de reseña */}
      {reviewOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-extrabold text-[#1B1B1B]">Reseña para {reviewOrder.restaurant?.name || 'Restaurante'}</h3>
              <button onClick={() => setReviewOrder(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                  <Star className={`w-10 h-10 ${star <= reviewRating ? "text-[#FFBE00] fill-[#FFBE00]" : "text-[#E0E0E0]"}`} />
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-[12px] font-bold text-[#AAAAAA] uppercase tracking-wider block mb-2">Comentario (Opcional)</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#F0F0F0] text-[14px] outline-none focus:border-[#FF6B35] resize-none"
                rows={3}
                placeholder="¿Qué te pareció la comida?"
              />
            </div>

            <button onClick={submitReview} disabled={submittingReview}
              className="w-full py-3 rounded-xl text-white font-bold text-[15px] disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: GRADIENT }}>
              {submittingReview ? "Enviando..." : "Enviar Reseña"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}
