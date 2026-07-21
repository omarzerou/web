"use client";

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, adminAuth, superAdminAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";

type Tab = "cliente" | "restaurante";

export default function LoginPage() {
  const [tab, setTab]           = useState<Tab>("cliente");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);
  const router = useRouter();

  const syncBackend = async (token: string, emailVal: string) => {
    try {
      const res = await fetch("http://localhost:4000/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailVal }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return null;
  };

  const redirectBasedOnRole = (user: any) => {
    // Solo ir al onboarding si es usuario nuevo O si le faltan datos (nunca los ha rellenado)
    if (!user) {
      router.push("/onboarding");
      return;
    }
    if (user.isNew || (!user.phone && !user.address)) {
      router.push("/onboarding");
      return;
    }
    if (tab === "restaurante") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

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
    getRedirectResult(auth).then(async (cred) => {
      if (cred) {
        const token = await cred.user.getIdToken();
        const dbUser = await syncBackend(token, cred.user.email || "");
        redirectBasedOnRole(dbUser);
      }
    }).catch(() => {
      setError("No se pudo iniciar sesión con Google (Redirección fallida)");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred  = await signInWithEmailAndPassword(auth, email, password);
      // Mantener sincronizadas las otras apps
      signInWithEmailAndPassword(adminAuth, email, password).catch(()=>{});
      signInWithEmailAndPassword(superAdminAuth, email, password).catch(()=>{});
      
      const token = await cred.user.getIdToken();
      const dbUser = await syncBackend(token, email);
      redirectBasedOnRole(dbUser);
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoad(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const cred     = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(cred);
      if (credential) {
        import("firebase/auth").then(({ signInWithCredential }) => {
          signInWithCredential(adminAuth, credential).catch(()=>{});
          signInWithCredential(superAdminAuth, credential).catch(()=>{});
        });
      }

      const token    = await cred.user.getIdToken();
      const dbUser = await syncBackend(token, cred.user.email || "");
      redirectBasedOnRole(dbUser);
    } catch {
      setError("No se pudo iniciar sesión con Google");
      setGoogleLoad(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Logo */}
      <Link href="/" className="flex justify-center mb-8 no-underline">
        <img src="/logo-tastio.png" alt="Tastio Logo" className="h-[64px] sm:h-[90px] scale-110 sm:scale-125 w-auto object-contain" />
      </Link>

      {/* Card */}
      <div className="w-full max-w-[400px] bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 border border-[#F0F0F0]">
        <h1 className="text-[24px] font-extrabold text-[#1B1B1B] mb-1 tracking-tight">Acceder</h1>
        <p className="text-[14px] text-[#888] mb-7">
          ¿No tienes cuenta?{" "}
          <Link href={`/register?tab=${tab}`} className="text-[#FF6B35] font-semibold no-underline hover:underline">
            Regístrate
          </Link>
        </p>

        {/* TAB TOGGLE */}
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

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoad || loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#E8E8E8] hover:border-[#CCC] text-[#1B1B1B] font-semibold text-[14px] py-3 rounded-2xl transition-all hover:shadow-sm disabled:opacity-60 mb-5 cursor-pointer"
        >
          {googleLoad ? (
            <span className="w-5 h-5 border-2 border-[#CCC] border-t-[#FF6B35] rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continuar con Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#F0F0F0]" />
          <span className="text-[12px] text-[#AAAAAA] font-medium">o con correo</span>
          <div className="flex-1 h-px bg-[#F0F0F0]" />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                suppressHydrationWarning
                className="w-full bg-[#F7F7F7] border-2 border-[#F0F0F0] focus:border-[#FF6B35] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-[14px] text-[#1B1B1B] placeholder:text-[#CCCCCC] outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBBBBB]" />
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                suppressHydrationWarning
                className="w-full bg-[#F7F7F7] border-2 border-[#F0F0F0] focus:border-[#FF6B35] focus:bg-white rounded-2xl pl-10 pr-11 py-3 text-[14px] text-[#1B1B1B] placeholder:text-[#CCCCCC] outline-none transition-all"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BBBBBB] hover:text-[#555] transition-colors bg-transparent border-none cursor-pointer p-0">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[13px] text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoad}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-[15px] py-3.5 rounded-2xl transition-all disabled:opacity-60 cursor-pointer mt-2 hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Entrar <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
