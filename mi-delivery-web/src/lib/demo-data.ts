export type Option  = { id: string; label: string; price: number; img?: string };
export type SecDef  = { id: string; title: string; max?: number; options: Option[]; type?: "radio" | "pill" | "card" };
export type Product = { id: string; name: string; desc: string; price: number; img: string; sections?: SecDef[] };
export type MenuCat = { id: string; name: string; items: Product[] };
export type RestInfo = { id:string; name:string; tagline:string; heroImg:string; time:string; rating:string; delivery:string; minOrder:string; openUntil:string; menu:MenuCat[]; subscriptionPlan?: string };
export type CartItem = { cid:string; pid:string; name:string; basePrice:number; extrasPrice:number; img:string; qty:number; extras:string[]; restId:string; restName:string };

export const CARNES: Option[] = [
  {id:"pol",label:"Pollo",price:0, img:"https://images.unsplash.com/photo-1604503468306-202f138cd338?w=150&h=150&fit=crop"},
  {id:"ter",label:"Ternera",price:0, img:"https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=150&h=150&fit=crop"},
  {id:"mix",label:"Mixto",price:0, img:"https://images.unsplash.com/photo-1544025162-d76694265947?w=150&h=150&fit=crop"}
];
export const VEGS: Option[] = [
  {id:"lec",label:"Lechuga",price:0, img:"https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=150&h=150&fit=crop"},
  {id:"tom",label:"Tomate",price:0, img:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150&h=150&fit=crop"},
  {id:"ceb",label:"Cebolla",price:0, img:"https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=150&h=150&fit=crop"},
  {id:"pep",label:"Pepinillo",price:0, img:"https://images.unsplash.com/photo-1604246852329-a0352ffb617b?w=150&h=150&fit=crop"}
];
export const SALS: Option[] = [
  {id:"may",label:"Mayonesa",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"},
  {id:"ket",label:"Ketchup",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"},
  {id:"bbq",label:"Barbacoa",price:0, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop"}
];
export const EXTR: Option[] = [
  {id:"hue",label:"Huevo Frito",price:0.50, img:"https://images.unsplash.com/photo-1521513919009-be90ad555598?w=150&h=150&fit=crop"},
  {id:"que",label:"Queso Fundido",price:0.50, img:"https://images.unsplash.com/photo-1631379578036-7e3725b8ebfa?w=150&h=150&fit=crop"},
  {id:"exc",label:"Extra carne",price:1.50, img:"https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=150&h=150&fit=crop"},
  {id:"bac",label:"Bacon",price:0.80, img:"https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=150&h=150&fit=crop"},
];
export const KEBAB_SECS: SecDef[] = [
  {id:"car",title:"Tipo de Carne",max:1,type:"card",options:CARNES},
  {id:"veg",title:"Quitar ingredientes",type:"card",options:VEGS},
  {id:"sal",title:"Salsas (máx. 3)",max:3,type:"pill",options:SALS},
  {id:"ext",title:"Extras",type:"card",options:EXTR},
];
export const BURGER_SECS: SecDef[] = [
  {id:"car",title:"Elegir Carne",max:1,type:"card",options:[{id:"ter",label:"100% Vacuno",price:0, img:"https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=150&h=150&fit=crop"},{id:"pol",label:"Pollo Crujiente",price:0, img:"https://images.unsplash.com/photo-1604503468306-202f138cd338?w=150&h=150&fit=crop"}]},
  {id:"veg",title:"Quitar ingredientes",type:"card",options:VEGS.filter(v => ["ceb","tom","pep"].includes(v.id))},
  {id:"sal",title:"Salsas extra",max:2,type:"pill",options:SALS},
  {id:"ext",title:"Añadir Extras",type:"card",options:EXTR},
];

export const DB: Record<string,RestInfo> = {
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
    id:"demo7",name:"Paloma Blanca",tagline:"Paloma Blanca & More Kebab",
    heroImg:"/paloma-blanca-banner.png",
    time:"10-20 min",rating:"9.5",delivery:"Gratis",minOrder:"€8.00",openUntil:"01:00",
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
