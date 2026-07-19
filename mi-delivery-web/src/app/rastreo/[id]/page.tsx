"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, Package, MapPin, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OrderTracking {
  id: string;
  status: string;
  orderType: string;
  totalAmount: number;
  restaurantName: string;
  createdAt: string;
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/orders/${id}/rastreo`);
        if (res.ok) {
          setOrder(await res.json());
        } else {
          setError(true);
        }
      } catch (e) {
        // Fallo de red temporal, reintentará luego
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-[22px] font-extrabold text-[#1B1B1B] mb-2">Pedido no encontrado</h2>
        <p className="text-[15px] text-[#888] mb-8">El número de pedido ingresado no existe o ha expirado.</p>
        <Link href="/" className="px-8 py-3.5 bg-[#1B1B1B] text-white rounded-xl font-bold text-[14px]">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
      </div>
    );
  }

  // Lógica del Timeline
  const STATUSES = ["PENDING", "PREPARING", "ON_THE_WAY", "DELIVERED"];
  const isPickup = order.orderType === "PICKUP";
  
  const stepTitles = [
    "Pedido Recibido",
    "Preparando",
    isPickup ? "Listo para Recoger" : "En Camino",
    "Entregado"
  ];

  const stepDescriptions = [
    "El restaurante ha recibido tu orden.",
    "El chef está preparando tu comida.",
    isPickup ? "Tu pedido está listo en el local." : "El repartidor está de camino a tu ubicación.",
    isPickup ? "Pedido recogido exitosamente." : "El pedido ha sido entregado."
  ];

  const stepIcons = [Clock, Package, MapPin, CheckCircle2];

  const currentStepIndex = STATUSES.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-12">
      {/* Header */}
      <div className="bg-white px-6 py-5 flex items-center gap-4 sticky top-0 z-50 shadow-sm border-b border-[#F0F0F0]">
        <button onClick={() => router.push("/")} className="w-10 h-10 bg-[#F5F5F5] rounded-full flex items-center justify-center border-none cursor-pointer hover:bg-[#EBEBEB] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#1B1B1B]" />
        </button>
        <div>
          <h1 className="text-[17px] font-extrabold text-[#1B1B1B] tracking-tight">Rastreo de Pedido</h1>
          <p className="text-[12px] text-[#888] font-medium uppercase tracking-widest mt-0.5">#{order.id.substring(0,8)}</p>
        </div>
      </div>

      <div className="max-w-[500px] mx-auto px-6 pt-8">
        
        {/* Info Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F0F0F0] mb-8">
          <h2 className="text-[20px] font-black text-[#1B1B1B] mb-1">{order.restaurantName}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px] font-bold text-white bg-[#1B1B1B] px-2.5 py-1 rounded-md">
              {isPickup ? "PARA LLEVAR" : "DOMICILIO"}
            </span>
            <span className="text-[14px] font-bold text-[#FF6B35]">€{order.totalAmount.toFixed(2)}</span>
          </div>
          
          <div className="h-px bg-[#F5F5F5] w-full my-4" />
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
            </div>
            <div>
              <p className="text-[13px] text-[#888] font-semibold">Estado actual</p>
              <p className="text-[16px] font-extrabold text-[#1B1B1B]">{stepTitles[currentStepIndex] || "Procesando..."}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F0F0F0]">
          <h3 className="text-[15px] font-bold text-[#1B1B1B] mb-6">Progreso del Pedido</h3>
          
          <div className="relative">
            {/* Línea vertical de fondo */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[#F0F0F0]" />
            
            {/* Línea vertical de progreso activo */}
            <div className="absolute left-[19px] top-4 w-0.5 bg-gradient-to-b from-[#FF6B35] to-[#FF8C55] transition-all duration-700" 
                 style={{ height: currentStepIndex >= 0 ? `${(currentStepIndex / 3) * 100}%` : '0%' }} />

            <div className="space-y-8 relative">
              {STATUSES.map((statusKey, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = stepIcons[index];

                return (
                  <div key={statusKey} className="flex gap-4 relative">
                    {/* Indicador circular */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-[#FF6B35] to-[#FF8C55] text-white shadow-md' : 'bg-[#F5F5F5] text-[#CCC] border-2 border-white'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Textos */}
                    <div className={`flex-1 pt-2 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                      <h4 className={`text-[15px] font-bold ${isCurrent ? 'text-[#FF6B35]' : 'text-[#1B1B1B]'}`}>
                        {stepTitles[index]}
                      </h4>
                      <p className="text-[13px] text-[#888] leading-snug mt-1">
                        {stepDescriptions[index]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
