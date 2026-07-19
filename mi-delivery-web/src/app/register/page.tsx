"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Lock, Phone, Store, Eye, EyeOff, ArrowRight, ChevronLeft, MapPin
} from "lucide-react";

type Tab = "cliente" | "restaurante";

export default function RegisterPage() {
  const [tab, setTab] = useState<Tab>("cliente");
  const router = useRouter();

  // ── Cliente fields ──
  const [cName,     setCName]     = useState("");
  const [cEmail,    setCEmail]    = useState("");
  const [cPhone,    setCPhone]    = useState("");
  const [cAddress,  setCAddress]  = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cShowPass, setCShowPass] = useState(false);

  // ── Restaurante fields ──
  const [rOwner,    setROwner]    = useState("");
  const [rEmail,    setREmail]    = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rShowPass, setRShowPass] = useState(false);
  const [rName,     setRName]     = useState("");
  const [rAddress,  setRAddress]  = useState("");
  const [rPlan,     setRPlan]     = useState("MONTHLY");
  const [rCard,     setRCard]     = useState("");

  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [googleLoad,  setGoogleLoad]  = useState(false);

  // ── OTP State ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");

  // ── Leer query params ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("tab") === "restaurante") {
        setTab("restaurante");
      }
    }
  }, []);

  // ── Handle redirect login (Mobile) ──
  useEffect(() => {
    // Legacy redirect support if any redirects are pending
    getRedirectResult(auth).then(async (cred) => {
      if (cred) {
        const token = await cred.user.getIdToken();
        await fetch("http://localhost:4000/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: cred.user.email }),
        }).catch(() => {});
        router.push("/");
      }
    }).catch(() => {});
  }, [router]);

  // ── Google register (client) ──
  const handleGoogle = async () => {
    setGoogleLoad(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const cred     = await signInWithPopup(auth, provider);
      const token    = await cred.user.getIdToken();
      await fetch("http://localhost:4000/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: cred.user.email }),
      }).catch(() => {});
      router.push("/onboarding");
    } catch {
      setError("No se pudo registrar con Google");
      setGoogleLoad(false);
    }
  };

  // ── Email register (client) ──
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cEmail })
      });
      if (!res.ok) throw new Error("No se pudo enviar el correo de verificación");
      setOtpStep(true);
    } catch (err: any) {
      setError(err.message || "Error al enviar el código. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Email register (restaurant) ──
  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: rEmail })
      });
      if (!res.ok) throw new Error("No se pudo enviar el correo de verificación");
      setOtpStep(true);
    } catch (err: any) {
      setError(err.message || "Error al enviar el código. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP & Create User ──
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError("El código debe tener 6 dígitos");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const email = tab === "cliente" ? cEmail : rEmail;
      const res = await fetch("http://localhost:4000/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Código incorrecto");
      }

      // Código verificado, ahora creamos el usuario
      if (tab === "cliente") {
        const cred = await createUserWithEmailAndPassword(auth, cEmail, cPassword);
        await updateProfile(cred.user, { displayName: cName });
        const token = await cred.user.getIdToken();
        await fetch("http://localhost:4000/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: cEmail, name: cName, phone: cPhone, address: cAddress }),
        }).catch(() => {});
        router.push("/");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, rEmail, rPassword);
        const token = await cred.user.getIdToken();
        const resSync = await fetch("http://localhost:4000/api/auth/sync-restaurant", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userName: rOwner, restaurantName: rName, restaurantAddress: rAddress }),
        });
        if (!resSync.ok) throw new Error("Error registrando restaurante en el servidor");
        alert("¡Solicitud enviada! Tu restaurante está en revisión por un administrador.");
        router.push("/admin");
      }
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
         setOtpError("Ese correo ya está registrado en la plataforma");
      } else {
         setOtpError(e.message || "Error al verificar código");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOtp = () => {
    setOtpStep(false);
    setOtpCode("");
    setOtpError("");
  };

  // ── Shared input style ──
  const inputCls = "w-full bg-[#F7F7F7] border-2 border-[#F0F0F0] focus:border-[#FF6B35] focus:bg-white rounded-2xl py-3 text-[14px] text-[#1B1B1B] placeholder:text-[#CCCCCC] outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 no-underline">
        <img src="/logo.png" alt="Tastio" className="w-9 h-9 object-contain" />
        <span className="text-[22px] font-extrabold text-[#1B1B1B] tracking-tight">
          Tasti<span className="text-[#FF6B35]">o</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-[440px] bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 border border-[#F0F0F0]">
        <h1 className="text-[24px] font-extrabold text-[#1B1B1B] mb-1 tracking-tight">Crear cuenta</h1>
        <p className="text-[14px] text-[#888] mb-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[#FF6B35] font-semibold no-underline hover:underline">Acceder</Link>
        </p>

        {/* TAB TOGGLE – style from the photo (pill selector) */}
        <div className="flex bg-[#F0F0F0] rounded-2xl p-1 mb-6">
          {(["cliente", "restaurante"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer border-none"
              style={{
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#1B1B1B" : "#888",
                boxShadow: tab === t ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
              }}
            >
              {t === "cliente" ? "👤 Cliente" : "🏪 Restaurante"}
            </button>
          ))}
        </div>

        {otpStep ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#555] mb-1.5 text-center">
                Introduce el código de 6 dígitos que hemos enviado a {tab === 'cliente' ? cEmail : rEmail}
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full h-12 text-center text-2xl tracking-[0.5em] font-bold border-2 border-[#F0F0F0] rounded-xl focus:border-[#FF6B35] focus:outline-none"
                placeholder="000000"
              />
            </div>
            
            {otpError && <div className="text-red-500 text-[13px] text-center">{otpError}</div>}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelOtp}
                className="flex-1 py-3 bg-[#F0F0F0] text-[#555] rounded-xl font-bold text-[14px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="flex-[2] bg-gradient-to-r from-[#FF6B35] to-[#FF8C55] text-white py-3 rounded-xl font-bold text-[14px] disabled:opacity-60"
              >
                {loading ? "Verificando..." : "Verificar Código"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ══════ CLIENTE TAB ══════ */}
            {tab === "cliente" && (
          <>
            {/* Google */}
            <button onClick={handleGoogle} disabled={googleLoad || loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#E8E8E8] hover:border-[#CCC] text-[#1B1B1B] font-semibold text-[14px] py-3 rounded-2xl transition-all hover:shadow-sm disabled:opacity-60 mb-5 cursor-pointer">
              {googleLoad
                ? <span className="w-5 h-5 border-2 border-[#CCC] border-t-[#FF6B35] rounded-full animate-spin" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#F0F0F0]" />
              <span className="text-[12px] text-[#AAAAAA] font-medium">o con correo</span>
              <div className="flex-1 h-px bg-[#F0F0F0]" />
            </div>

            <form onSubmit={handleClientSubmit} className="space-y-3.5">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
                <input type="text" required placeholder="Tu nombre completo" value={cName}
                  onChange={e => setCName(e.target.value)} suppressHydrationWarning
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
                <input type="email" required placeholder="tu@correo.com" value={cEmail}
                  onChange={e => setCEmail(e.target.value)} suppressHydrationWarning
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
                <input type="tel" required placeholder="Teléfono" value={cPhone}
                  onChange={e => setCPhone(e.target.value)} suppressHydrationWarning
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
              {/* Address */}
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
                <input type="text" required placeholder="Tu dirección completa" value={cAddress}
                  onChange={e => setCAddress(e.target.value)} suppressHydrationWarning
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
                <input type={cShowPass ? "text" : "password"} required minLength={6}
                  placeholder="Contraseña (mín. 6 caracteres)" value={cPassword}
                  onChange={e => setCPassword(e.target.value)} suppressHydrationWarning
                  className={`${inputCls} pl-10 pr-11`} />
                <button type="button" onClick={() => setCShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-[#555] bg-transparent border-none cursor-pointer p-0">
                  {cShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && <div className="text-[13px] text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl font-medium">{error}</div>}

              <button type="submit" disabled={loading || googleLoad}
                className="w-full flex items-center justify-center gap-2 text-white font-bold text-[15px] py-3.5 rounded-2xl transition-all disabled:opacity-60 cursor-pointer mt-1 hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                {loading
                  ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>Crear mi cuenta <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          </>
        )}

        {/* ══════ RESTAURANTE TAB ══════ */}
        {tab === "restaurante" && (
          <form onSubmit={handleRestaurantSubmit} className="space-y-3.5">
            <p className="text-[13px] text-[#888] -mt-1 mb-2">Registra tu local. Un administrador lo revisará y lo activará en 24-48h.</p>

            {/* Owner name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input type="text" required placeholder="Tu nombre (propietario)" value={rOwner}
                onChange={e => setROwner(e.target.value)} suppressHydrationWarning
                className={`${inputCls} pl-10 pr-4`} />
            </div>
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input type="email" required placeholder="Correo para el panel" value={rEmail}
                onChange={e => setREmail(e.target.value)} suppressHydrationWarning
                className={`${inputCls} pl-10 pr-4`} />
            </div>
            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input type={rShowPass ? "text" : "password"} required minLength={6}
                placeholder="Contraseña (mín. 6 caracteres)" value={rPassword}
                onChange={e => setRPassword(e.target.value)} suppressHydrationWarning
                className={`${inputCls} pl-10 pr-11`} />
              <button type="button" onClick={() => setRShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-[#555] bg-transparent border-none cursor-pointer p-0">
                {rShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="h-px bg-[#F5F5F5] my-1" />

            {/* Restaurant name */}
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input type="text" required placeholder="Nombre del local (ej. Kebab Los Pinos)" value={rName}
                onChange={e => setRName(e.target.value)} suppressHydrationWarning
                className={`${inputCls} pl-10 pr-4`} />
            </div>
            {/* Address */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="text" required placeholder="Dirección exacta (ej. Calle Tarifa 15, Algeciras)" value={rAddress}
                onChange={e => setRAddress(e.target.value)} suppressHydrationWarning
                className={`${inputCls} pl-10 pr-4`} />
            </div>

            <div className="h-px bg-[#F5F5F5] my-2" />

            {/* Plan Subscription */}
            <div className="bg-[#FFF3EE] rounded-2xl p-4 border border-[#FFD5C2]">
              <p className="text-[13px] font-bold text-[#FF6B35] mb-2 flex items-center gap-1.5">
                <Store className="w-4 h-4" /> Plan de uso (¡1 mes GRATIS de prueba!)
              </p>
              <div className="space-y-3">
                <select value={rPlan} onChange={(e) => setRPlan(e.target.value)}
                  className="w-full bg-white border border-[#FFD5C2] rounded-xl py-2.5 px-3 text-[13px] font-medium outline-none text-[#1B1B1B] focus:border-[#FF6B35]">
                  <option value="MONTHLY">Plan Mensual (29€/mes después del 1er mes)</option>
                  <option value="ANNUAL">Plan Anual (290€/año después del 1er mes)</option>
                </select>

                <div className="relative">
                  <input type="text" placeholder="Nº de Tarjeta (opcional ahora)" value={rCard}
                    onChange={(e) => setRCard(e.target.value)}
                    className="w-full bg-white border border-[#FFD5C2] rounded-xl py-2.5 px-3 text-[13px] font-medium outline-none text-[#1B1B1B] focus:border-[#FF6B35] placeholder:text-[#BBB]" />
                </div>
              </div>
            </div>

            {error && <div className="text-[13px] text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl font-medium">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-bold text-[15px] py-3.5 rounded-2xl transition-all disabled:opacity-60 cursor-pointer mt-1 hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
              {loading
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>Enviar solicitud <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        )}
        </>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
