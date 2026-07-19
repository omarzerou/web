"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { MapPin, Phone, CheckCircle2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
    });
    return () => unsub();
  }, [router]);

  const validatePhone = (p: string) => {
    // Regex para validar números de teléfono (acepta prefijos como +34, pero asegura longitud numérica)
    const phoneRegex = /^\+?[\d\s-]{9,15}$/;
    return phoneRegex.test(p.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone || !address) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Formato de teléfono inválido. Debe contener entre 9 y 15 dígitos.");
      return;
    }

    if (address.length < 5) {
      setError("La dirección debe ser más detallada.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      const token = await user.getIdToken();

      const res = await fetch("http://localhost:4000/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ phone, address })
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Error al guardar los datos.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#FFF3EE] rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#FF6B35]" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-center text-[#1B1B1B] mb-2">¡Casi terminamos!</h1>
        <p className="text-center text-[#555] mb-8 font-medium">
          Para ofrecerte el mejor servicio, necesitamos un par de datos para tus entregas.
        </p>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#1B1B1B] ml-1 uppercase tracking-wider">Teléfono de Contacto</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F9F9F9] border-2 border-[#F0F0F0] rounded-2xl py-3.5 pl-12 pr-4 font-semibold text-[#1B1B1B] focus:outline-none focus:border-[#FF6B35] focus:bg-white transition-all"
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#1B1B1B] ml-1 uppercase tracking-wider">Dirección de Entrega</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#F9F9F9] border-2 border-[#F0F0F0] rounded-2xl py-3.5 pl-12 pr-4 font-semibold text-[#1B1B1B] focus:outline-none focus:border-[#FF6B35] focus:bg-white transition-all"
                placeholder="Calle Mayor 1, Puerta 2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#FF6B35] to-[#FF8C55] text-white py-4 rounded-2xl font-extrabold text-[16px] hover:-translate-y-1 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Guardando..." : "Completar Registro"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
