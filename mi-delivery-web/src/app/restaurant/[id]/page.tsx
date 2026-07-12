"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, ShoppingBag, Plus, Minus, X, Check, Clock, Star } from "lucide-react";

// ── TYPES ────────────────────────────────────────────────────────────────────
type Option  = { id: string; label: string; price: number; img?: string };
type SecDef  = { id: string; title: string; max?: number; options: Option[]; type?: "radio" | "pill" | "card" };
type Product = { id: string; name: string; desc: string; price: number; img: string; sections?: SecDef[] };
type MenuCat = { id: string; name: string; items: Product[] };
type RestInfo = { id:string; name:string; tagline:string; heroImg:string; time:string; rating:string; delivery:string; minOrder:string; openUntil:string; menu:MenuCat[] };
type CartItem = { cid:string; pid:string; name:string; basePrice:number; extrasPrice:number; img:string; qty:number; extras:string[]; restId:string; restName:string };

// ── CART ─────────────────────────────────────────────────────────────────────
const CART_KEY = "tastio_cart";
const getCart  = (): CartItem[] => { try { return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); } catch { return []; } };
const setCart  = (c: CartItem[]) => localStorage.setItem(CART_KEY, JSON.stringify(c));

// ── DEMO DATA ─────────────────────────────────────────────────────────────────
const CARNES: Option[] = [
  {id:"pol",label:"Pollo",price:0, img:"https://images.unsplash.com/photo-1604503468306-202f138cd338?w=150&h=150&fit=crop"},
  {id:"ter",label:"Ternera",price:0, img:"https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=150&h=150&fit=crop"},
  {id:"mix",label:"Mixto",price:0, img:"https://images.unsplash.com/photo-1544025162-d76694265947?w=150&h=150&fit=crop"}
];
const VEGS: Option[] = [
  {id:"lec",label:"Lechuga",price:0, img:"https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=150&h=150&fit=crop"},
  {id:"tom",label:"Tomate",price:0, img:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150&h=150&fit=crop"},
  {id:"ceb",label:"Cebolla",price:0, img:"https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=150&h=150&fit=crop"},
  {id:"pep",label:"Pepinillo",price:0, img:"https://images.unsplash.com/photo-1604246852329-a0352ffb617b?w=150&h=150&fit=crop"}
];
const SALS: Option[] = [
  {id:"may",label:"Mayonesa",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"},
  {id:"ket",label:"Ketchup",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"},
  {id:"bbq",label:"Barbacoa",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"}
];
const EXTR: Option[] = [
  {id:"hue",label:"Huevo Frito",price:0.50, img:"https://images.unsplash.com/photo-1521513919009-be90ad555598?w=150&h=150&fit=crop"},
  {id:"que",label:"Queso Fundido",price:0.50, img:"https://images.unsplash.com/photo-1631379578036-7e3725b8ebfa?w=150&h=150&fit=crop"},
  {id:"exc",label:"Extra carne",price:1.50, img:"https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=150&h=150&fit=crop"},
  {id:"bac",label:"Bacon",price:0.80, img:"https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=150&h=150&fit=crop"},
];
const KEBAB_SECS: SecDef[] = [
  {id:"car",title:"Tipo de Carne",max:1,type:"card",options:CARNES},
  {id:"veg",title:"Quitar ingredientes",type:"card",options:VEGS},
  {id:"sal",title:"Salsas (máx. 3)",max:3,type:"pill",options:SALS},
  {id:"ext",title:"Extras",type:"card",options:EXTR},
];
const BURGER_SECS: SecDef[] = [
  {id:"car",title:"Elegir Carne",max:1,type:"card",options:[{id:"ter",label:"100% Vacuno",price:0, img:"https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=150&h=150&fit=crop"},{id:"pol",label:"Pollo Crujiente",price:0, img:"https://images.unsplash.com/photo-1604503468306-202f138cd338?w=150&h=150&fit=crop"}]},
  {id:"veg",title:"Quitar ingredientes",type:"card",options:VEGS.filter(v => ["ceb","tom","pep"].includes(v.id))},
  {id:"sal",title:"Salsas extra",max:2,type:"pill",options:SALS},
  {id:"ext",title:"Añadir Extras",type:"card",options:EXTR},
];

const DB: Record<string,RestInfo> = {
  demo1: {
    id:"demo1",name:"McDonald's | Centro",tagline:"I'm Lovin' it",
    heroImg:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&h=600&fit=crop",
    time:"10-20 min",rating:"8.0",delivery:"Gratis",minOrder:"€10.00",openUntil:"23:00",
    menu:[
      {id:"top",name:"Lo más pedido",items:[
        {id:"mc1",name:"Big Mac Menu",desc:"Big Mac + Patatas M + Bebida",price:9.99,img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop"},
        {id:"mc2",name:"McChicken Menu",desc:"McChicken + Patatas + Bebida",price:8.49,img:"https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop"},
        {id:"mc3",name:"McNuggets x10",desc:"10 piezas con salsa a elegir",price:6.49,img:"https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop"},
        {id:"mc4",name:"McFlurry Oreo",desc:"Helado suave con trozos de Oreo",price:2.99,img:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop"},
      ]},
      {id:"burg",name:"Hamburguesas",items:[
        {id:"mc5",name:"Big Mac",desc:"Doble carne, salsa especial, lechuga, queso, pepinillos, cebolla",price:5.49,img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",sections:BURGER_SECS},
        {id:"mc6",name:"Quarter Pounder",desc:"Carne de vacuno 1/4 libra con queso",price:5.99,img:"https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop",sections:BURGER_SECS},
        {id:"mc7",name:"McDouble",desc:"Doble carne con queso americano",price:4.49,img:"https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop",sections:BURGER_SECS},
        {id:"mc8",name:"McChicken",desc:"Pollo crujiente con mayonesa y lechuga",price:4.29,img:"https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=300&fit=crop",sections:BURGER_SECS},
        {id:"mc9",name:"Filet-O-Fish",desc:"Merluza con salsa tártara y queso",price:4.99,img:"https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop"},
      ]},
      {id:"side",name:"Acompañamientos",items:[
        {id:"mc10",name:"Patatas Medianas",desc:"Patatas fritas crujientes",price:2.49,img:"https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop"},
        {id:"mc11",name:"Patatas Grandes",desc:"Ración grande de patatas fritas",price:2.99,img:"https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop"},
        {id:"mc12",name:"McNuggets x6",desc:"6 piezas con salsa",price:3.49,img:"https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop"},
        {id:"mc13",name:"Ensalada",desc:"Mix de hojas verdes con aderezo",price:2.99,img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"},
      ]},
      {id:"drin",name:"Bebidas",items:[
        {id:"mc14",name:"Coca-Cola M",desc:"Mediana con hielo",price:1.99,img:"https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop"},
        {id:"mc15",name:"Agua",desc:"Botella 500ml",price:1.49,img:"https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop"},
        {id:"mc16",name:"Zumo Naranja",desc:"Natural recién exprimido",price:2.29,img:"https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop"},
      ]},
      {id:"post",name:"Postres",items:[
        {id:"mc17",name:"McFlurry Oreo",desc:"Helado con galleta Oreo triturada",price:2.99,img:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop"},
        {id:"mc18",name:"Sundae Chocolate",desc:"Helado suave con salsa de chocolate",price:1.99,img:"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop"},
        {id:"mc19",name:"Apple Pie",desc:"Empanada de manzana caliente",price:1.29,img:"https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400&h=300&fit=crop"},
      ]},
    ],
  },
  demo7: {
    id:"demo7",name:"El Kebab Real",tagline:"El mejor kebab de la ciudad",
    heroImg:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1400&h=600&fit=crop",
    time:"10-20 min",rating:"8.8",delivery:"Gratis",minOrder:"€8.00",openUntil:"01:00",
    menu:[
      {id:"top",name:"Lo más pedido",items:[
        {id:"k1",name:"Kebab de Pollo",desc:"Pan de pita, pollo a la parrilla, verduras y salsas a elegir",price:6.50,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k2",name:"Kebab de Ternera",desc:"Pan de pita, ternera a la parrilla, verduras y salsas a elegir",price:7.00,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k3",name:"Durum de Pollo",desc:"Pan lavash, pollo a la parrilla, verduras y salsas a elegir",price:6.00,img:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",sections:KEBAB_SECS},
      ]},
      {id:"keb",name:"Kebabs",items:[
        {id:"k4",name:"Kebab de Pollo",desc:"Pan de pita con pollo, verduras y salsas",price:6.50,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k5",name:"Kebab de Ternera",desc:"Pan de pita con ternera, verduras y salsas",price:7.00,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k6",name:"Kebab Mixto",desc:"Pan de pita con pollo y ternera, verduras y salsas",price:7.00,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k7",name:"Kebab Vegetal",desc:"Pan de pita con falafel, verduras y salsas",price:5.50,img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&h=300&fit=crop",sections:KEBAB_SECS},
      ]},
      {id:"dur",name:"Durum",items:[
        {id:"k8",name:"Durum de Pollo",desc:"Pan lavash con pollo, verduras y salsas",price:6.00,img:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",sections:KEBAB_SECS},
        {id:"k9",name:"Durum de Ternera",desc:"Pan lavash con ternera, verduras y salsas",price:6.50,img:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",sections:KEBAB_SECS},
      ]},
      {id:"ext",name:"Extras y Bebidas",items:[
        {id:"k10",name:"Porción de Patatas",desc:"Patatas fritas crujientes",price:2.50,img:"https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop"},
        {id:"k11",name:"Salsa (tarrina)",desc:"Tarrina extra a elegir",price:0.50,img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"},
        {id:"k12",name:"Coca-Cola Lata",desc:"330ml",price:1.50,img:"https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop"},
        {id:"k13",name:"Agua",desc:"500ml",price:1.00,img:"https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop"},
        {id:"k14",name:"Fanta Naranja",desc:"Lata 330ml",price:1.50,img:"https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop"},
      ]},
    ],
  },
};

const FALLBACK_NAMES: Record<string,string> = { demo2:"Chinacy",demo3:"Five Guys Burguer",demo4:"Spicy Sichuan",demo5:"Taste of India",demo6:"Vapiano Algeciras",demo8:"Tokyo Sushi" };
const FALLBACK_IMGS:  Record<string,string> = {
  demo2:"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1400&h=600&fit=crop",
  demo3:"https://images.unsplash.com/photo-1586816001966-79b736744398?w=1400&h=600&fit=crop",
  demo4:"https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1400&h=600&fit=crop",
  demo5:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1400&h=600&fit=crop",
  demo6:"https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=1400&h=600&fit=crop",
  demo8:"https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1400&h=600&fit=crop",
};
["demo2","demo3","demo4","demo5","demo6","demo8"].forEach(id => {
  DB[id] = {
    id, name: FALLBACK_NAMES[id], tagline: "Deliciosa comida a domicilio",
    heroImg: FALLBACK_IMGS[id],
    time:"15-25 min", rating:"9.0", delivery:"Gratis", minOrder:"€10.00", openUntil:"23:00",
    menu:[{ id:"menu", name:"Menú", items:[
      {id:`${id}_1`,name:"Plato del día",desc:"Plato especial del chef",price:9.99,img:FALLBACK_IMGS[id].replace("1400&h=600","400&h=300")},
      {id:`${id}_2`,name:"Bebida",desc:"Refresco o agua mineral",price:1.99,img:"https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop"},
    ]}],
  };
});

// ── CUSTOMIZATION MODAL ───────────────────────────────────────────────────────
function CustomModal({ product, restId, restName, onClose, onAdd }: {
  product: Product; restId: string; restName: string;
  onClose: () => void; onAdd: (item: CartItem) => void;
}) {
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const allOpts  = (product.sections || []).flatMap(s => s.options);
  const selIds   = Object.values(sel).flat();
  const ep       = allOpts.filter(o => o.price > 0 && selIds.includes(o.id)).reduce((sum, o) => sum + o.price, 0);
  const total    = product.price + ep;

  const toggle = (secId: string, optId: string, max?: number) => {
    setSel(prev => {
      const cur = prev[secId] || [];
      if (max === 1) return { ...prev, [secId]: [optId] }; // Radio behavior
      if (cur.includes(optId)) return { ...prev, [secId]: cur.filter(x => x !== optId) };
      if (max && cur.length >= max) return prev;
      return { ...prev, [secId]: [...cur, optId] };
    });
  };

  const handleAdd = () => {
    const extrasLabels = product.sections?.flatMap(sec => {
      const selectedIds = sel[sec.id] || [];
      return selectedIds.map(id => {
        const opt = sec.options.find(o => o.id === id);
        if (!opt) return "";
        if (sec.id === "veg") return `Sin ${opt.label.replace(/^[^\w\s]*\s*/, "")}`;
        return opt.label.replace(/^[^\w\s]*\s*/, "");
      });
    }).filter(Boolean) || [];

    onAdd({ cid: Math.random().toString(36).slice(2), pid: product.id, name: product.name,
      basePrice: product.price, extrasPrice: ep, img: product.img, qty: 1,
      extras: extrasLabels, restId, restName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:items-center sm:justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-[500px] sm:rounded-[32px] rounded-t-[32px] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-[100%] sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>
        
        {/* Header Image */}
        <div className="relative h-[220px] sm:h-[260px] shrink-0 overflow-hidden sm:rounded-t-[32px] rounded-t-[32px]">
          <img src={product.img} alt={product.name} draggable={false} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:bg-white/40 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-[26px] font-black text-white leading-tight drop-shadow-md">{product.name}</h2>
            <p className="text-[13px] text-white/90 font-medium mt-1 line-clamp-2 drop-shadow-md">{product.desc}</p>
          </div>
        </div>

        {/* Scrollable Options */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          {(product.sections || []).map(sec => (
            <div key={sec.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-extrabold text-[#1B1B1B]">{sec.title}</h3>
                {sec.max === 1 && <span className="text-[11px] font-black text-white bg-[#1B1B1B] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Obligatorio</span>}
                {sec.max && sec.max > 1 && <span className="text-[11px] font-black text-[#FF6B35] bg-[#FFF3EE] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Máx {sec.max}</span>}
              </div>

              {sec.type === "card" ? (
                <div className="grid grid-cols-2 gap-3">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    return (
                      <div key={opt.id} onClick={() => toggle(sec.id, opt.id, sec.max)}
                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] h-28 ${on ? 'border-[#FF6B35] shadow-[0_4px_16px_rgba(255,107,53,0.3)]' : 'border-[#F0F0F0]'}`}>
                        {opt.img && <img src={opt.img} alt={opt.label} className="w-full h-full object-cover" draggable={false} />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3">
                           <div className="flex items-center justify-between">
                             <span className="text-[13px] font-bold text-white drop-shadow-md leading-tight">{sec.id === "veg" && on ? <span className="text-red-400 line-through decoration-2 mr-1">Sin</span> : ""}{opt.label}</span>
                             {opt.price > 0 && <span className="text-[11px] font-black text-white bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-sm">+€{opt.price.toFixed(2)}</span>}
                           </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-colors ${on ? 'border-[#FF6B35] bg-white' : 'border-white/50 bg-black/20'}`}>
                             {on && (sec.id === "veg" ? <X className="w-3.5 h-3.5 text-red-500 stroke-[3]"/> : <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]"/>)}
                          </div>
                        </div>
                        {on && sec.id === "veg" && (
                           <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex items-center justify-center">
                              <X className="w-12 h-12 text-white opacity-80" strokeWidth={3} />
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : sec.type === "pill" ? (
                <div className="flex flex-wrap gap-2.5">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => toggle(sec.id, opt.id, sec.max)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold border-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${on ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35] shadow-[0_4px_12px_rgba(255,107,53,0.2)]' : 'border-[#F0F0F0] bg-white text-[#555]'}`}>
                        {on ? <Check className="w-4 h-4 stroke-[3]"/> : null}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {sec.options.map(opt => {
                    const on = (sel[sec.id]||[]).includes(opt.id);
                    const maxed = !on && sec.max !== undefined && sec.max > 1 && (sel[sec.id]||[]).length >= sec.max;
                    return (
                      <div key={opt.id} onClick={() => !maxed && toggle(sec.id, opt.id, sec.max)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${maxed ? 'opacity-40 grayscale cursor-not-allowed border-[#F0F0F0] bg-[#F9F9F9]' : 'cursor-pointer hover:border-[#FF6B35]'} ${on ? 'border-[#FF6B35] bg-[#FFF8F5] shadow-[0_4px_16px_rgba(255,107,53,0.15)]' : 'border-[#F0F0F0] bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${on ? 'bg-[#FF6B35] text-white shadow-md' : 'bg-[#F0F0F0] text-transparent'}`}>
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <span className="text-[15px] font-bold text-[#1B1B1B]">{opt.label}</span>
                        </div>
                        {opt.price > 0 && <span className="text-[14px] font-black text-[#FF6B35]">+€{opt.price.toFixed(2)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#F0F0F0] bg-white rounded-b-[32px] shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={handleAdd}
            className="w-full flex items-center justify-between text-white px-6 py-4 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,107,53,0.35)] active:scale-95 group"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
            <span className="font-extrabold text-[16px] tracking-wide">Añadir al pedido</span>
            <span className="font-black text-[16px] bg-white/25 px-4 py-1.5 rounded-xl group-hover:bg-white/30 transition-colors">€{total.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CART DRAWER ───────────────────────────────────────────────────────────────
function CartDrawer({ cart, restName, onClose, onQty, onOrder }: {
  cart: CartItem[]; restName: string; onClose: () => void;
  onQty: (cid: string, delta: number) => void; onOrder: () => void;
}) {
  const total = cart.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative bg-white w-full sm:w-[400px] h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#F0F0F0]"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#F5F5F5] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[17px] font-extrabold text-[#1B1B1B]">Tu pedido</h2>
            <p className="text-[12px] text-[#AAAAAA] font-medium">{restName} · {count} {count === 1 ? "artículo" : "artículos"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center border-none cursor-pointer hover:bg-[#EBEBEB] transition-colors">
            <X className="w-4 h-4 text-[#555]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.map(item => (
            <div key={item.cid} className="flex items-center gap-3 bg-[#FAFAFA] rounded-2xl p-3 border border-[#F0F0F0]">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <img src={item.img} alt={item.name} draggable={false} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#1B1B1B] truncate">{item.name}</div>
                {item.extras.length > 0 && <div className="text-[11px] text-[#AAAAAA] truncate mt-0.5">{item.extras.join(", ")}</div>}
                <div className="text-[13px] font-bold text-[#FF6B35] mt-0.5">€{((item.basePrice + item.extrasPrice) * item.qty).toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onQty(item.cid, -1)} className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center border-none cursor-pointer hover:bg-[#E5E5E5] transition-colors">
                  <Minus className="w-3 h-3 text-[#555]" />
                </button>
                <span className="text-[14px] font-bold w-4 text-center">{item.qty}</span>
                <button onClick={() => onQty(item.cid, 1)} className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer text-white transition-all" style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-[#F5F5F5] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-[#888]">Total</span>
            <span className="text-[22px] font-extrabold text-[#1B1B1B]">€{total.toFixed(2)}</span>
          </div>
          <button onClick={onOrder}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-[15px] py-4 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,107,53,0.35)]"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
            Realizar pedido · €{total.toFixed(2)}
          </button>
          <p className="text-center text-[11px] text-[#CCC] mt-2">Sistema de pago próximamente 🚀</p>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RestaurantPage() {
  const params  = useParams<{ id: string }>();
  const id      = params.id;
  const [rest, setRest] = useState<RestInfo | null>(DB[id] || null);
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [modal,     setModal]     = useState<Product | null>(null);
  const [drawer,    setDrawer]    = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [liked,     setLiked]     = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      const uid = u ? u.uid : "guest";
      setUserId(uid);
      try {
        const favs = JSON.parse(localStorage.getItem(`tastio_favorites_${uid}`) || "[]");
        setLiked(favs.includes(id));
      } catch (e) {}
    });
    setCartState(getCart());
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!DB[id]) {
      const locals = JSON.parse(localStorage.getItem("tastio_restaurants") || "[]");
      const localRest = locals.find((r: any) => r.id === id);
      if (localRest) {
        setRest({
          id, name: localRest.name, tagline: localRest.address || "Local asociado a Tastio",
          subscriptionPlan: localRest.subscriptionPlan,
          heroImg: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop",
          time: "15-30 min", rating: "Nuevo", delivery: "€1.99", minOrder: "€8.00", openUntil: "23:00",
          menu: [
            {
              id: "gen", name: "Menú Principal", items: [
                {id: `${id}_1`, name: "Hamburguesa Premium", desc: "Doble carne y queso fundido", price: 8.50, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", sections: BURGER_SECS},
                {id: `${id}_2`, name: "Pizza Artesanal", desc: "Masa fina, tomate, queso y pepperoni", price: 10.00, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop"},
                {id: `${id}_3`, name: "Ensalada César", desc: "Lechuga, pollo crujiente y salsa", price: 6.50, img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"},
                {id: `${id}_4`, name: "Refresco", desc: "Lata 330ml", price: 2.00, img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop"},
              ]
            }
          ]
        });
      }
    }
  }, [id]);

  const toggleLike = () => {
    if (!userId) return;
    try {
      const favKey = `tastio_favorites_${userId}`;
      const favs: string[] = JSON.parse(localStorage.getItem(favKey) || "[]");
      let nextFavs;
      if (favs.includes(id)) {
        nextFavs = favs.filter(f => f !== id);
        setLiked(false);
      } else {
        nextFavs = [...favs, id];
        setLiked(true);
      }
      localStorage.setItem(favKey, JSON.stringify(nextFavs));
    } catch (e) {}
  };

  const [loadingOrder, setLoadingOrder] = useState(false);

  const handleOrder = async () => {
    if (cart.length === 0) return;
    if (!userId) {
      alert("Debes iniciar sesión para realizar el pedido de forma segura.");
      return;
    }
    setLoadingOrder(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          restaurantId: id,
          totalAmount: cartTotal,
          items: cart
        })
      });
      if (res.ok) {
        updateCart([]);
        setDrawer(false);
        alert("¡Pedido realizado con éxito de forma segura!");
      } else {
        alert("Hubo un error al procesar el pedido.");
      }
    } catch (e) {
      alert("Error de conexión al servidor.");
    } finally {
      setLoadingOrder(false);
    }
  };

  if (!rest) return <div className="min-h-screen bg-[#F7F7F7] p-8 text-center font-bold">Cargando restaurante...</div>;

  const updateCart = (next: CartItem[]) => { setCartState(next); setCart(next); };

  const addToCart = (item: CartItem) => updateCart([...getCart(), item]);

  const quickAdd = (product: Product) => {
    if (product.sections?.length) { setModal(product); return; }
    const prev     = getCart();
    const existing = prev.find(c => c.pid === product.id && c.extras.length === 0);
    if (existing)  updateCart(prev.map(c => c.cid === existing.cid ? { ...c, qty: c.qty + 1 } : c));
    else           updateCart([...prev, { cid: Math.random().toString(36).slice(2), pid: product.id, name: product.name, basePrice: product.price, extrasPrice: 0, img: product.img, qty: 1, extras: [], restId: id, restName: rest?.name || "" }]);
  };

  const changeQty = (cid: string, delta: number) => updateCart(getCart().map(c => c.cid === cid ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);

  if (!rest) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <div className="text-center">
        <p className="text-[18px] font-bold text-[#1B1B1B] mb-2">Restaurante no encontrado</p>
        <Link href="/" className="text-[#FF6B35] no-underline font-semibold">← Volver al inicio</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* HERO */}
      <div className="relative h-[280px] sm:h-[380px] overflow-hidden">
        <img src={rest.heroImg} alt={rest.name} draggable={false} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <Link href="/" className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center no-underline shadow-sm hover:bg-white transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#1B1B1B]" />
          </Link>
          <button onClick={toggleLike}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border-none cursor-pointer shadow-sm hover:bg-white transition-colors">
            <Heart className="w-5 h-5" fill={liked?"#FF6B35":"none"} stroke={liked?"#FF6B35":"#1B1B1B"} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:pb-8">
          <h1 className="text-[28px] sm:text-[36px] font-black text-white leading-tight drop-shadow-md flex items-center gap-3">
            {rest.name}
            {rest.subscriptionPlan && (
              <span className={`text-[12px] uppercase font-black px-2 py-1 rounded-lg ${rest.subscriptionPlan !== 'FREE' ? 'bg-[#FFBE00] text-black' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
                {rest.subscriptionPlan !== 'FREE' ? 'Premium' : 'Gratuito'}
              </span>
            )}
          </h1>
          <p className="text-white/80 text-[14px] font-medium mt-1">{rest.tagline}</p>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="bg-white border-b border-[#F0F0F0] px-4 sm:px-6 py-3">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-[#555]">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#009DE0]" />{rest.time}</span>
          <span className="text-[#DDD]">·</span>
          <span>😊 <span className="text-[#009DE0]">{rest.rating}</span></span>
          <span className="text-[#DDD]">·</span>
          <span>Abierto hasta {rest.openUntil}</span>
          <span className="text-[#DDD]">·</span>
          <span>Pedido mín. {rest.minOrder}</span>
          <span className="text-[#DDD]">·</span>
          <span className="text-green-600 font-bold">Entrega {rest.delivery}</span>
        </div>
      </div>

      {/* STICKY TABS */}
      <div className="bg-white border-b border-[#F0F0F0] sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 flex overflow-x-auto gap-1 py-2" style={{ scrollbarWidth:"none" }}>
          {rest.menu.map((cat, i) => (
            <button key={cat.id} onClick={() => { setActiveTab(i); sectionRefs.current[i]?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
              className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap"
              style={{ background: activeTab===i?"#FF6B35":"#F5F5F5", color: activeTab===i?"#fff":"#555" }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex gap-8">

        {/* Menu */}
        <div className="flex-1 space-y-10 min-w-0">
          {rest.menu.map((cat, catIdx) => (
            <div key={cat.id} ref={el => { sectionRefs.current[catIdx] = el; }}>
              <h2 className="text-[20px] font-extrabold text-[#1B1B1B] mb-4">{cat.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.items.map(product => (
                  <div key={product.id}
                    className="bg-white rounded-2xl border border-[#EFEFEF] p-4 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all cursor-pointer group"
                    onClick={() => product.sections?.length ? setModal(product) : quickAdd(product)}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-[#1B1B1B] leading-tight">{product.name}</h3>
                      <p className="text-[12px] text-[#888] mt-0.5 leading-snug" style={{ display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{product.desc}</p>
                      {product.sections && <span className="inline-block mt-1.5 text-[11px] font-bold text-[#FF6B35] bg-[#FFF3EE] px-2 py-0.5 rounded-full">Personalizable</span>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[16px] font-extrabold text-[#1B1B1B]">€{product.price.toFixed(2)}</span>
                        <button onClick={e => { e.stopPropagation(); quickAdd(product); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer text-white transition-all hover:scale-110 hover:shadow-[0_2px_10px_rgba(255,107,53,0.4)]"
                          style={{ background:"linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-2xl overflow-hidden shrink-0">
                      <img src={product.img} alt={product.name} draggable={false} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="h-24" /> {/* spacer for floating bar */}
        </div>

        {/* Desktop cart sidebar */}
        {cartCount > 0 && (
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm sticky top-[120px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F5F5F5]">
                <h2 className="text-[16px] font-extrabold text-[#1B1B1B]">Tu pedido</h2>
                <p className="text-[12px] text-[#AAAAAA] font-medium">{rest.name}</p>
              </div>
              <div className="px-4 py-3 space-y-2 max-h-[380px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.cid} className="flex items-center gap-3 py-2 border-b border-[#F8F8F8] last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[#1B1B1B] truncate">{item.name}</div>
                      {item.extras.length > 0 && <div className="text-[11px] text-[#AAAAAA] truncate">{item.extras.join(", ")}</div>}
                      <div className="text-[12px] font-bold text-[#FF6B35]">€{((item.basePrice+item.extrasPrice)*item.qty).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => changeQty(item.cid,-1)} className="w-6 h-6 rounded-full bg-[#F0F0F0] flex items-center justify-center border-none cursor-pointer hover:bg-[#E5E5E5] transition-colors">
                        <Minus className="w-2.5 h-2.5 text-[#555]" />
                      </button>
                      <span className="text-[13px] font-bold w-4 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.cid,1)} className="w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer text-white" style={{ background:"linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-[#F5F5F5]">
                <div className="flex justify-between mb-3 text-[14px] font-bold text-[#1B1B1B]">
                  <span>Total</span><span>€{cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleOrder}
                  className="w-full text-white font-bold text-[14px] py-3.5 rounded-2xl border-none cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)]"
                  style={{ background:"linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
                  Realizar pedido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart (mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 lg:hidden z-50">
          <button onClick={() => setDrawer(true)}
            className="w-full flex items-center justify-between text-white font-bold text-[15px] px-5 py-4 rounded-2xl border-none cursor-pointer shadow-[0_8px_32px_rgba(255,107,53,0.4)]"
            style={{ background:"linear-gradient(135deg,#FF6B35,#FF8C55)" }}>
            <span className="bg-white/25 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black">{cartCount}</span>
            <span>Ver pedido</span>
            <span>€{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {modal && <CustomModal product={modal} restId={id} restName={rest.name} onClose={() => setModal(null)} onAdd={addToCart} />}
      {drawer && <CartDrawer cart={cart} restName={rest.name} onClose={() => setDrawer(false)} onQty={changeQty} onOrder={handleOrder} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
