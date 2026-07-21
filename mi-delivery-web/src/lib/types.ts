export type Option  = { id: string; label: string; price: number; img?: string };
export type SecDef  = { id: string; title: string; max?: number; options: Option[]; type?: "radio" | "pill" | "card" };
export type Product = { id: string; name: string; desc: string; price: number; img: string; sections?: SecDef[] };
export type MenuCat = { id: string; name: string; items: Product[] };
export type RestInfo = { id:string; name:string; tagline:string; heroImg:string; time:string; rating:string; delivery:string; deliveryFee:number; minOrder:string; openUntil:string; menu:MenuCat[]; subscriptionPlan?: string };
export type CartItem = { cid:string; pid:string; name:string; basePrice:number; extrasPrice:number; img:string; qty:number; extras:string[]; optionsIds?:string[]; restId:string; restName:string };


