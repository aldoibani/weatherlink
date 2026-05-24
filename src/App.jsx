import { useState, useEffect } from "react";

// ── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

const GoogleFonts = () => (
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
);

// ── Normalización de categorías ───────────────────────────────────────────────
function normalizarCategoria(texto) {
  if (!texto) return "CUBIERTO";
  const t = texto.toLowerCase();
  if (t.includes("tormenta") && t.includes("lluvia")) return "TORMENTA ELÉCTRICA CON LLUVIA";
  if (t.includes("tormenta"))                          return "TORMENTA ELÉCTRICA";
  if (t.includes("aguanieve"))                         return "AGUANIEVE";
  if (t.includes("nieve"))                             return "NIEVE";
  if (t.includes("lluvia fuerte") || t.includes("chubascos fuertes")) return "LLUVIA FUERTE";
  if (t.includes("lluvia débil") || t.includes("chubascos débiles"))  return "LLUVIA DÉBIL";
  if (t.includes("intermitente") && t.includes("lluvia")) return "LLUVIA INTERMITENTE";
  if (t.includes("llovizna"))                          return "LLOVIZNA";
  if (t.includes("lluvia") || t.includes("chubascos")) return "LLUVIA";
  if (t.includes("niebla"))                            return "NIEBLA";
  if (t.includes("neblina"))                           return "NEBLINA";
  if (t.includes("cubierto"))                          return "CUBIERTO";
  if (t.includes("nublado"))                           return "NUBLADO";
  if (t.includes("nubosidad parcial") || t.includes("parcial")) return "PARCIAL";
  if (t.includes("escasa nubosidad"))                  return "ESCASA NUBOSIDAD";
  if (t.includes("despejado"))                         return "DESPEJADO";
  return "CUBIERTO";
}

// ── Tramo horario ─────────────────────────────────────────────────────────────
function tramoHorario() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 1; // mañana
  if (h >= 12 && h < 18) return 2; // tarde
  return 3;                         // noche
}

// ── Fetch pronostico.js de MeteoChile ─────────────────────────────────────────
const INDICE_MAP = {
  "Arica":"arica","Iquique":"iquique","Antofagasta":"antofagasta","Copiapó":"copiapo",
  "La Serena":"serena","Valparaíso":"valpo","Viña del Mar":"vdelmar","Santiago":"stgo","Pudahuel":"stgo",
  "Rancagua":"rancagua","Talca":"talca","Chillán":"chillan","Concepción":"concepcion",
  "Temuco":"temuco","Valdivia":"valdivia","Osorno":"osorno","Puerto Montt":"ptomontt",
  "Coyhaique":"coyhaique","Punta Arenas":"ptarenas","Juan Fernández":"juanfernandez",
  "Rapa Nui":"pascua","Rey Jorge":"reyjorge",
};

async function fetchPronostico() {
  try {
    const PROXY = "https://corsproxy.io/?";
    const url = "https://archivos.meteochile.gob.cl/portaldmc/meteochile/js/pronostico.js?version=1";
    const res = await fetch(PROXY + encodeURIComponent(url));
    const text = await res.text();

    // Extraer todos los bloques Pronostico.push({...})
    const blocks = text.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
    const result = {};
    const tramo = tramoHorario();

    for (const block of blocks) {
      try {
        // Extraer indice
        const indiceM = block.match(/indice\s*:\s*["']([^"']+)["']/);
        if (!indiceM) continue;
        const indice = indiceM[1];

        // Extraer temperatura[0]
        const tempM = block.match(/temperatura\s*:\s*\[([\s\S]*?)\]/);
        if (!tempM) continue;
        const temps = tempM[1].match(/["'][^"']*["']/g) || [];
        const tempStr = temps[0] ? temps[0].replace(/["']/g, "").trim() : "";
        const parts = tempStr.split("/");
        const tmin = parts[0] ? parseFloat(parts[0]) : null;
        const tmax = parts[1] ? parseFloat(parts[1]) : null;

        // Extraer texto[0][tramo]
        const textoM = block.match(/texto\s*:\s*\[([\s\S]*?)\]\s*,\s*redaccion/);
        if (!textoM) continue;
        // primer subarray
        const subM = textoM[1].match(/\[([\s\S]*?)\]/);
        if (!subM) continue;
        const subItems = subM[1].match(/["'][^"']*["']/g) || [];
        // buscar tramo, fallback a primer no vacío
        let condicion = "";
        const idx = tramo < subItems.length ? subItems[tramo]?.replace(/["']/g,"").trim() : "";
        condicion = idx || subItems.find(s => s.replace(/["']/g,"").trim())?.replace(/["']/g,"").trim() || "";
        // decode HTML entities básicas
        condicion = condicion.replace(/&aacute;/g,"á").replace(/&eacute;/g,"é")
          .replace(/&iacute;/g,"í").replace(/&oacute;/g,"ó").replace(/&uacute;/g,"ú")
          .replace(/&ntilde;/g,"ñ").replace(/&Aacute;/g,"Á").replace(/&Eacute;/g,"É")
          .replace(/&Iacute;/g,"Í").replace(/&Oacute;/g,"Ó").replace(/&Uacute;/g,"Ú")
          .replace(/&Ntilde;/g,"Ñ");

        result[indice] = { tmin: isNaN(tmin)?null:tmin, tmax: isNaN(tmax)?null:tmax, condicion };
      } catch {}
    }
    return result;
  } catch { return null; }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ cat, size = 26 }) => {
  const s = { width: size, height: size, display: "block", flexShrink: 0 };
  const map = {
    DESPEJADO: <svg viewBox="0 0 32 32" style={s} fill="none"><circle cx="16" cy="16" r="6.5" fill="#FBBF24"/>{[0,45,90,135,180,225,270,315].map((a,i)=><line key={i} x1={16+9.5*Math.cos(a*Math.PI/180)} y1={16+9.5*Math.sin(a*Math.PI/180)} x2={16+12.5*Math.cos(a*Math.PI/180)} y2={16+12.5*Math.sin(a*Math.PI/180)} stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>)}</svg>,
    "ESCASA NUBOSIDAD": <svg viewBox="0 0 32 32" style={s} fill="none"><circle cx="10" cy="14" r="4.5" fill="#FBBF24" opacity=".9"/><ellipse cx="19" cy="20" rx="9" ry="5" fill="#CBD5E1"/><ellipse cx="13" cy="21" rx="6" ry="4" fill="#E2E8F0"/></svg>,
    PARCIAL: <svg viewBox="0 0 32 32" style={s} fill="none"><circle cx="9" cy="14" r="5" fill="#FBBF24" opacity=".75"/><ellipse cx="19" cy="20" rx="9.5" ry="5.5" fill="#94A3B8"/><ellipse cx="12" cy="21" rx="7" ry="4.5" fill="#CBD5E1"/></svg>,
    NUBLADO: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="18" cy="14" rx="6.5" ry="5.5" fill="#94A3B8"/><ellipse cx="17" cy="19" rx="11" ry="6" fill="#94A3B8"/><ellipse cx="11" cy="20" rx="7" ry="5" fill="#B0BEC5"/></svg>,
    CUBIERTO: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="18" cy="13" rx="7" ry="5.5" fill="#607D8B"/><ellipse cx="16" cy="19" rx="12" ry="7" fill="#607D8B"/><ellipse cx="10" cy="20" rx="8" ry="5.5" fill="#78909C"/></svg>,
    NEBLINA: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="9" ry="5" fill="#B0BEC5" opacity=".5"/>{[16,20,24].map((y,i)=><line key={i} x1="4" y1={y} x2="28" y2={y} stroke="#90A4AE" strokeWidth="2.5" strokeLinecap="round" opacity={.45+i*.12}/>)}</svg>,
    NIEBLA: <svg viewBox="0 0 32 32" style={s} fill="none">{[10,14,18,22,26].map((y,i)=><line key={i} x1="4" y1={y} x2="28" y2={y} stroke="#78909C" strokeWidth="2.5" strokeLinecap="round" opacity={.35+i*.12}/>)}</svg>,
    LLOVIZNA: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="13" rx="11" ry="6" fill="#607D8B"/>{[0,1,2,3,4].map(i=><line key={i} x1={8+i*4} y1="22" x2={6.5+i*4} y2="28" stroke="#90CAF9" strokeWidth="1.5" strokeLinecap="round"/>)}</svg>,
    "LLUVIA DÉBIL": <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="11" ry="6" fill="#546E7A"/>{[0,1,2,3].map(i=><line key={i} x1={9+i*5} y1="21" x2={7+i*5} y2="29" stroke="#64B5F6" strokeWidth="2" strokeLinecap="round"/>)}</svg>,
    LLUVIA: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="11" ry="6" fill="#455A64"/>{[0,1,2,3,4].map(i=><line key={i} x1={8+i*4} y1="21" x2={5+i*4} y2="30" stroke="#1E88E5" strokeWidth="2.5" strokeLinecap="round"/>)}</svg>,
    "LLUVIA FUERTE": <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="11" rx="12" ry="6" fill="#37474F"/>{[0,1,2,3,4,5].map(i=><line key={i} x1={6+i*4} y1="20" x2={3+i*4} y2="30" stroke="#1565C0" strokeWidth="2.5" strokeLinecap="round"/>)}</svg>,
    "LLUVIA INTERMITENTE": <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="11" ry="6" fill="#546E7A"/>{[0,1,2].map(i=><line key={i} x1={9+i*6} y1="21" x2={7+i*6} y2="28" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round"/>)}</svg>,
    NIEVE: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="11" ry="6" fill="#78909C"/>{[0,1,2,3,4].map(i=><circle key={i} cx={8+i*4} cy={22+(i%2)*4} r="2" fill="#E3F2FD"/>)}</svg>,
    "TORMENTA ELÉCTRICA": <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="11" rx="12" ry="6" fill="#37474F"/><polygon points="18,18 13,26 16,24 14,31 20,22 17,24" fill="#FDD835"/></svg>,
    "TORMENTA ELÉCTRICA CON LLUVIA": <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="10" rx="12" ry="5.5" fill="#263238"/><polygon points="17,17 12,24 15,22 13,29 19,21 16,23" fill="#FDD835"/><line x1="7" y1="19" x2="5" y2="27" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round"/><line x1="24" y1="19" x2="22" y2="27" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round"/></svg>,
    AGUANIEVE: <svg viewBox="0 0 32 32" style={s} fill="none"><ellipse cx="16" cy="12" rx="11" ry="6" fill="#546E7A"/>{[0,1,2].map(i=><line key={i} x1={8+i*5} y1="21" x2={6+i*5} y2="28" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round"/>)}{[0,1].map(i=><circle key={i} cx={12+i*7} cy="25" r="2" fill="#E3F2FD"/>)}</svg>,
  };
  return map[cat] || map["CUBIERTO"];
};

// ── Parser boletín tabulado ───────────────────────────────────────────────────
const STATION_MAP = {
  "chacalluta":"Arica","arica":"Arica","diego aracena":"Iquique","iquique":"Iquique",
  "cerro moreno":"Antofagasta","antofagasta":"Antofagasta","desierto de atacama":"Copiapó",
  "caldera":"Copiapó","copiap":"Copiapó","la florida":"La Serena","la serena":"La Serena",
  "rodelillo":"Valparaíso","ángeles faro":"Valparaíso","angeles faro":"Valparaíso",
  "eulogio":"Viña del Mar","tobalaba":"Viña del Mar","viña":"Viña del Mar",
  "quinta normal":"Santiago","pudahuel":"Santiago",
  "rancagua":"Rancagua","maquehua":"Temuco","maquehue":"Temuco","temuco":"Temuco",
  "general freire":"Talca","panguilemo":"Talca","talca":"Talca",
  "bernardo":"Chillán","chillán":"Chillán","chillan":"Chillán",
  "carriel":"Concepción","concepción":"Concepción","concepcion":"Concepción",
  "pichoy":"Valdivia","valdivia":"Valdivia","cañal bajo":"Osorno","osorno":"Osorno",
  "el tepual":"Puerto Montt","puerto montt":"Puerto Montt",
  "balmaceda":"Coyhaique","vidal":"Coyhaique","coyhaique":"Coyhaique",
  "carlos ibáñez":"Punta Arenas","ibañez":"Punta Arenas","punta arenas":"Punta Arenas",
  "robinson":"Juan Fernández","juan fernández":"Juan Fernández","juan fernandez":"Juan Fernández",
  "mataveri":"Rapa Nui","pascua":"Rapa Nui",
  "frei montalva":"Rey Jorge","marsh":"Rey Jorge","antártica":"Rey Jorge",
};

function matchStation(nombre) {
  const n = nombre.toLowerCase();
  for (const [key, ciudad] of Object.entries(STATION_MAP)) {
    if (n.includes(key)) return ciudad;
  }
  return null;
}

function parseBoletinText(text) {
  const results = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cols = line.split(/\t+/).map(c => c.trim());
    if (cols.length < 7) continue;
    const nombre = cols[0];
    if (!nombre || nombre.length < 3) continue;
    if (/nombre|estaci[oó]n|t\.\s*m[ií]n|valor|hora/i.test(nombre)) continue;
    const ciudad = matchStation(nombre);
    if (!ciudad) continue;
    const pn = (v) => {
      if (!v || v === "S/P" || v === "-" || v === ".") return null;
      const n = parseFloat((v||"").replace(",",".").replace(/[^\d.\-]/g,""));
      return isNaN(n) ? null : n;
    };
    const obj = {
      tmin: pn(cols[1]), tmax: pn(cols[3]),
      pp_dia: pn(cols[5]) ?? 0,
      pp_anio: pn(cols[6]),
      pp_normal: pn(cols[8]),
      def_sup: pn(cols[9]),
    };
    if (!results[ciudad] || nombre.toLowerCase().includes("quinta normal")) results[ciudad] = obj;
  }
  return results;
}

// ── Parser JSON de ChatGPT ────────────────────────────────────────────────────
function parseJsonChatGPT(text) {
  try {
    const arr = JSON.parse(text.trim());
    if (!Array.isArray(arr)) return null;
    const results = {};
    for (const r of arr) {
      const ciudad = r.ciudad;
      if (!ciudad) continue;
      results[ciudad] = {
        tact:      r.tact      ?? null,
        tmin:      r.tmin      ?? null,
        tmax:      r.tmax      ?? null,
        condicion: r.condicion ?? "",
        categoria: r.categoria || normalizarCategoria(r.condicion),
        pp_dia:    r.pp_dia    ?? null,
        pp_anio:   r.pp_acum   ?? r.pp_anio  ?? null,
        def_sup:   r.def_sup   ?? null,
        pp_normal: r.pp_normal ?? null,
      };
    }
    return Object.keys(results).length > 0 ? results : null;
  } catch { return null; }
}

// ── Datos base 23 mayo 2026 ───────────────────────────────────────────────────
const DEFAULT_DATA = [
  { zona:"Santiago", ciudad:"Santiago",       estacion:"Quinta Normal", tmin:null, tmax:null, tact:null, categoria:"NUBLADO", condicion:"", pp_dia:null, pp_anio:null, def_sup:null, pp_normal:null },
  { zona:"Santiago", ciudad:"Pudahuel",       estacion:"Pudahuel",      tmin:null, tmax:null, tact:null, categoria:"NUBLADO", condicion:"", pp_dia:null, pp_anio:null, def_sup:null, pp_normal:null },
  { zona:"Norte",   ciudad:"Arica",         tmin:null, tmax:22,   tact:19.2, categoria:"CUBIERTO",  condicion:"Cubierto",                               pp_dia:0,    pp_anio:1.5,   def_sup:50,    pp_normal:1.0   },
  { zona:"Norte",   ciudad:"Iquique",        tmin:17.1, tmax:21.0, tact:20.2, categoria:"NUBLADO",   condicion:"Nublado variando a despejado",            pp_dia:0,    pp_anio:0,     def_sup:-100,  pp_normal:null  },
  { zona:"Norte",   ciudad:"Antofagasta",    tmin:11.3, tmax:16.5, tact:17.6, categoria:"NUBLADO",   condicion:"Nublado variando a nubosidad parcial",    pp_dia:0,    pp_anio:0,     def_sup:-100,  pp_normal:null  },
  { zona:"Norte",   ciudad:"Copiapó",        tmin:11.2, tmax:17.0, tact:17.6, categoria:"CUBIERTO",  condicion:"Cubierto variando a nubosidad parcial",   pp_dia:0,    pp_anio:0.8,   def_sup:null,  pp_normal:null  },
  { zona:"Norte",   ciudad:"La Serena",      tmin:10.5, tmax:15.3, tact:13.5, categoria:"NEBLINA",   condicion:"Cubierto y neblina",                     pp_dia:0,    pp_anio:1.2,   def_sup:-90.2, pp_normal:12.2  },
  { zona:"Centro",  ciudad:"Valparaíso",     tmin:null, tmax:11.0, tact:null,  categoria:"LLOVIZNA", condicion:"Cubierto, neblina y llovizna",            pp_dia:0,    pp_anio:23.6,  def_sup:-54.4, pp_normal:51.7  },
  { zona:"Centro",  ciudad:"Viña del Mar",   tmin: 4.6, tmax:12.1, tact:11.2, categoria:"LLOVIZNA",  condicion:"Cubierto, neblina y llovizna",            pp_dia:0,    pp_anio:42.3,  def_sup:-43.7, pp_normal:75.1  },
  { zona:"Centro",  ciudad:"Rancagua",       tmin: 1.6, tmax:16.8, tact: 6.5, categoria:"NIEBLA",    condicion:"Cubierto y niebla",                      pp_dia:null, pp_anio:null,  def_sup:null,  pp_normal:null  },
  { zona:"Centro",  ciudad:"Talca",          tmin: 1.0, tmax:10.5, tact:12.3, categoria:"NIEBLA",    condicion:"Cubierto y niebla",                      pp_dia:null, pp_anio:null,  def_sup:null,  pp_normal:null  },
  { zona:"Centro",  ciudad:"Chillán",        tmin: 1.7, tmax: 6.7, tact:13.2, categoria:"NEBLINA",   condicion:"Cubierto y neblina",                     pp_dia:0,    pp_anio:142.7, def_sup:-33.6, pp_normal:214.9 },
  { zona:"Centro",  ciudad:"Concepción",     tmin:10.5, tmax:11.9, tact:13.0, categoria:"CUBIERTO",  condicion:"Cubierto",                               pp_dia:0,    pp_anio:206.8, def_sup:-1.6,  pp_normal:210.2 },
  { zona:"Sur",     ciudad:"Temuco",         tmin: 6.5, tmax: 8.8, tact:12.3, categoria:"CUBIERTO",  condicion:"Cubierto",                               pp_dia:0,    pp_anio:321.6, def_sup:11.2,  pp_normal:289.2 },
  { zona:"Sur",     ciudad:"Valdivia",       tmin: 5.0, tmax: 8.9, tact: 9.4, categoria:"NIEBLA",    condicion:"Nublado y niebla",                       pp_dia:0,    pp_anio:472.8, def_sup:13.5,  pp_normal:416.6 },
  { zona:"Sur",     ciudad:"Osorno",         tmin: 8.3, tmax:13.2, tact:10.4, categoria:"NIEBLA",    condicion:"Nublado y niebla",                       pp_dia:0,    pp_anio:334.0, def_sup:-4.9,  pp_normal:351.2 },
  { zona:"Sur",     ciudad:"Puerto Montt",   tmin: 3.1, tmax: 9.0, tact:11.6, categoria:"NIEBLA",    condicion:"Nublado y niebla",                       pp_dia:0,    pp_anio:495.2, def_sup:-4.4,  pp_normal:517.9 },
  { zona:"Sur",     ciudad:"Coyhaique",      tmin:-4.0, tmax: 0.5, tact: 6.8, categoria:"NIEBLA",    condicion:"Nubosidad parcial, niebla y helada",     pp_dia:0,    pp_anio:315.6, def_sup:-13.5, pp_normal:365.0 },
  { zona:"Sur",     ciudad:"Punta Arenas",   tmin: 3.1, tmax:14.7, tact: 5.4, categoria:"NUBLADO",   condicion:"Nublado",                                pp_dia:0,    pp_anio:186.4, def_sup:2.0,   pp_normal:182.7 },
  { zona:"Insular", ciudad:"Juan Fernández", tmin:14.0, tmax:17.1, tact:15.0, categoria:"CUBIERTO",  condicion:"Cubierto",                               pp_dia:0.1,  pp_anio:252.5, def_sup:-14.1, pp_normal:293.7 },
  { zona:"Insular", ciudad:"Rapa Nui",       tmin:15.8, tmax:24.3, tact:23.0, categoria:"PARCIAL",   condicion:"Nubosidad parcial",                      pp_dia:0.4,  pp_anio:237.0, def_sup:-47.5, pp_normal:451.4 },
  { zona:"Insular", ciudad:"Rey Jorge",      tmin:-1.1, tmax:-0.4, tact:-0.8, categoria:"NIEVE",     condicion:"Cubierto y chubascos de nieve aislados", pp_dia:0,    pp_anio:183.0, def_sup:-19.1, pp_normal:226.2 },
];

const SANTIAGO_5 = [
  { dia:"Sábado 23",    tmin:3.8,  tmax:11.0, condicion:"Cubierto y niebla", categoria:"NIEBLA"    },
  { dia:"Domingo 24",   tmin:6.0,  tmax:13.0, condicion:"Cubierto",          categoria:"CUBIERTO"  },
  { dia:"Lunes 25",     tmin:4.0,  tmax:21.0, condicion:"Despejado",         categoria:"DESPEJADO" },
  { dia:"Martes 26",    tmin:3.0,  tmax:23.0, condicion:"Despejado",         categoria:"DESPEJADO" },
  { dia:"Miércoles 27", tmin:7.0,  tmax:18.0, condicion:"Despejado",         categoria:"DESPEJADO" },
];

const ZONAS = ["Norte","Centro","Sur","Insular"];

function generateExcel(data) {
  const XLSX = window.XLSX;
  if (!XLSX) return;
  const wb = XLSX.utils.book_new();
  const rows = [["Zona","Ciudad","Mínima","Máxima","Condición","Categoría"]];
  ZONAS.forEach(zona => {
    data.filter(d=>d.zona===zona).forEach((d,i)=>{
      rows.push([i===0?zona:"", d.ciudad, d.tmin, d.tmax, d.condicion, d.categoria]);
    });
  });
  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1["!cols"] = [{wch:16},{wch:22},{wch:12},{wch:12},{wch:52},{wch:28}];
  XLSX.utils.book_append_sheet(wb, ws1, "Pronóstico");
  const rows2 = [["Ciudad","Día","Mínima","Máxima","Condición","Categoría"],
    ...SANTIAGO_5.map(d=>["Santiago",d.dia,d.tmin,d.tmax,d.condicion,d.categoria])];
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2["!cols"] = [{wch:14},{wch:16},{wch:12},{wch:12},{wch:40},{wch:24}];
  XLSX.utils.book_append_sheet(wb, ws2, "Santiago 5 días");
  XLSX.writeFile(wb, "Pronostico_WeatherLink.xlsx");
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:"#F5F6F8", surface:"#FFFFFF", border:"#E8EBF0",
  text:"#1A1F2E", muted:"#8892A4", accent:"#2563EB", accentBg:"#EFF4FF",
  green:"#16A34A", greenBg:"#F0FDF4", greenBorder:"#BBF7D0",
  red:"#DC2626", redBg:"#FEF2F2", blue:"#3B82F6", orange:"#F97316",
};
const mono = { fontFamily:"'Geist Mono','Courier New',monospace" };

const fmtT = (v) => v === null || v === undefined ? "—" : `${v}°`;
const fmtN = (v, u="") => v === null || v === undefined ? "—" : `${v}${u}`;

const stationName = (row) => {
  if (!row) return "";
  if (row.estacion) return row.estacion;
  if (row.ciudad === "Santiago") return "Quinta Normal";
  if (row.ciudad === "Pudahuel") return "Pudahuel";
  return row.ciudad;
};

const shortDay = (dia = "") => String(dia).split(" ")[0] || "";

const pickSantiagoForecast = (payload, fallback) => {
  const candidates = [
    payload?.santiago?.forecast_5d,
    payload?.santiago?.forecast5d,
    payload?.forecast_5d,
    payload?.forecast5d,
    payload?.pronostico_5d,
  ];
  const found = candidates.find(Array.isArray);
  return found && found.length ? found.slice(0, 5) : fallback;
};


// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [tab, setTab]               = useState("condicion");
  const [zona, setZona]             = useState("Todas");
  const [data, setData]             = useState(DEFAULT_DATA);
  const [santiagoForecast, setSantiagoForecast] = useState(SANTIAGO_5);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [pronosticoStatus, setPronosticoStatus] = useState("idle"); // idle|loading|ok|error
  const [pasteOpen, setPasteOpen]   = useState(false);
  const [pasteText, setPasteText]   = useState("");
  const [pasteError, setPasteError] = useState("");
  const [pasteMode, setPasteMode]   = useState("boletin"); // boletin|json
  const [imported, setImported]     = useState(false);
  const [xlsxReady, setXlsxReady]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [updateError, setUpdateError] = useState("");

  // SheetJS
  useEffect(() => {
    if (window.XLSX) { setXlsxReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => setXlsxReady(true);
    document.head.appendChild(s);
  }, []);

  // Fetch automático pronostico.js al montar
  useEffect(() => {
    const loadPronostico = async () => {
      setPronosticoStatus("loading");
      const result = await fetchPronostico();
      if (result && Object.keys(result).length > 0) {
        setData(prev => prev.map(d => {
          const idx = INDICE_MAP[d.ciudad];
          const p = idx ? result[idx] : null;
          if (!p) return d;
          return {
            ...d,
            tmin:      p.tmin      ?? d.tmin,
            tmax:      p.tmax      ?? d.tmax,
            condicion: p.condicion || d.condicion,
            categoria: normalizarCategoria(p.condicion || d.condicion),
          };
        }));
        setLastUpdate(new Date());
        setPronosticoStatus("ok");
      } else {
        setPronosticoStatus("error");
      }
    };
    loadPronostico();
    const interval = setInterval(loadPronostico, 60 * 60 * 1000); // cada hora
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);


  const handleAutoUpdate = async () => {
    setUpdating(true);
    setUpdateError("");

    try {
      const res = await fetch("/api/update-weather", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = await res.json();
      setSantiagoForecast(pickSantiagoForecast(payload, SANTIAGO_5));
      const rows = Array.isArray(payload) ? payload : (payload.data || payload.regiones || []);

      if (!Array.isArray(rows)) {
        throw new Error("Respuesta inválida: no viene array de datos");
      }

      const santiagoExtra = [];
      if (payload?.santiago?.quinta_normal) santiagoExtra.push({ ...payload.santiago.quinta_normal, ciudad:"Santiago", zona:"Santiago", estacion:"Quinta Normal" });
      if (payload?.santiago?.pudahuel) santiagoExtra.push({ ...payload.santiago.pudahuel, ciudad:"Pudahuel", zona:"Santiago", estacion:"Pudahuel" });
      const mergedRows = [...rows, ...santiagoExtra];

      setData(prev => prev.map(d => {
        const m = mergedRows.find(r => r.ciudad === d.ciudad);
        if (!m) return d;

        return {
          ...d,
          tact:      m.tact      ?? null,
          tmin:      m.tmin      ?? null,
          tmax:      m.tmax      ?? null,
          condicion: m.condicion ?? "",
          categoria: m.categoria || normalizarCategoria(m.condicion),
          pp_dia:    m.pp_dia    ?? null,
          pp_anio:   m.pp_acum   ?? m.pp_anio ?? null,
          def_sup:   m.def_sup   ?? null,
          pp_normal: m.pp_normal ?? d.pp_normal ?? null,
        };
      }));

      setImported(true);
      setLastUpdate(new Date());
      setPronosticoStatus("ok");
    } catch (error) {
      console.error(error);
      setUpdateError("No se pudo actualizar. Revisa /api/update-weather.");
      setPronosticoStatus("error");
    } finally {
      setUpdating(false);
    }
  };

  const handleImport = () => {
    setPasteError("");
    if (!pasteText.trim()) { setPasteError("Pega el contenido primero."); return; }

    // Intentar JSON primero (ChatGPT), luego boletín tabulado
    const jsonResult = parseJsonChatGPT(pasteText);
    if (jsonResult) {
      setData(prev => prev.map(d => {
        const m = jsonResult[d.ciudad];
        if (!m) return d;
        return { ...d,
          tact:      m.tact      ?? d.tact,
          tmin:      m.tmin      ?? d.tmin,
          tmax:      m.tmax      ?? d.tmax,
          condicion: m.condicion || d.condicion,
          categoria: m.categoria || normalizarCategoria(m.condicion) || d.categoria,
          pp_dia:    m.pp_dia    ?? d.pp_dia,
          pp_anio:   m.pp_anio   ?? d.pp_anio,
          def_sup:   m.def_sup   ?? d.def_sup,
          pp_normal: m.pp_normal ?? d.pp_normal,
        };
      }));
      setImported(true); setPasteOpen(false); setPasteText("");
      setLastUpdate(new Date());
      return;
    }

    // Fallback: boletín tabulado
    const boletinResult = parseBoletinText(pasteText);
    if (Object.keys(boletinResult).length === 0) {
      setPasteError("No se reconoció el formato. Pega el JSON de ChatGPT o la tabla del boletín MeteoChile.");
      return;
    }
    setData(prev => prev.map(d => {
      const m = boletinResult[d.ciudad];
      if (!m) return d;
      return { ...d,
        tmin:     m.tmin     ?? d.tmin,
        tmax:     m.tmax     ?? d.tmax,
        pp_dia:   m.pp_dia   ?? d.pp_dia,
        pp_anio:  m.pp_anio  ?? d.pp_anio,
        def_sup:  m.def_sup  ?? d.def_sup,
        pp_normal:m.pp_normal?? d.pp_normal,
      };
    }));
    setImported(true); setPasteOpen(false); setPasteText("");
    setLastUpdate(new Date());
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { generateExcel(data); setGenerating(false); setGenerated(true); }, 900);
  };

  const filtered = zona === "Todas" ? data : data.filter(d => d.zona === zona);
  const zones    = zona === "Todas" ? ZONAS : [zona];
  const santiagoRows = [
    data.find(d => d.ciudad === "Santiago"),
    data.find(d => d.ciudad === "Pudahuel"),
  ].filter(Boolean);
  const showSantiagoBlock = zona === "Todas" || zona === "Santiago";

  // Indicador pronóstico
  const statusColor = { idle:"#94A3B8", loading:"#F59E0B", ok:"#22C55E", error:"#EF4444" }[pronosticoStatus];
  const statusLabel = { idle:"—", loading:"Actualizando pronóstico…", ok:`Pronóstico · ${lastUpdate.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}`, error:"Sin pronóstico (datos base)" }[pronosticoStatus];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Geist','Segoe UI',sans-serif", color:C.text }}>
      <GoogleFonts />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:20, padding: isMobile ? "0 16px" : "0 28px" }}>
        {/* Desktop header */}
        {!isMobile && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:58 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#3B82F6,#1D4ED8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v1M12 20v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M18.4 5.6l.7-.7M18.4 18.4l.7.7M5.6 18.4l-.7.7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="2"/>
                </svg>
              </div>
              <span style={{ fontWeight:600, fontSize:14, letterSpacing:"-.3px" }}>WeatherLink</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.muted }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:statusColor, display:"inline-block", transition:"background .3s" }}/>
              {statusLabel}
            </div>
            <nav style={{ display:"flex", background:"#F0F2F5", borderRadius:10, padding:3, gap:2 }}>
              {[["condicion","Condición actual"],["pronostico","Generar pronóstico"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab(id)} style={{ padding:"5px 16px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:500, background: tab===id ? C.surface : "transparent", color: tab===id ? C.accent : C.muted, boxShadow: tab===id ? "0 1px 3px rgba(0,0,0,0.07)" : "none", transition:"all .14s" }}>{lbl}</button>
              ))}
            </nav>
          </div>
        )}
        {/* Mobile header */}
        {isMobile && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#3B82F6,#1D4ED8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v1M12 20v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M18.4 5.6l.7-.7M18.4 18.4l.7.7M5.6 18.4l-.7.7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="2"/>
                  </svg>
                </div>
                <span style={{ fontWeight:600, fontSize:14, letterSpacing:"-.3px" }}>WeatherLink</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:C.muted }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:statusColor, display:"inline-block" }}/>
                {pronosticoStatus === "ok" ? lastUpdate.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}) : pronosticoStatus === "loading" ? "…" : "base"}
              </div>
            </div>
            <div style={{ display:"flex", background:"#F0F2F5", borderRadius:10, padding:3, gap:2, marginBottom:10 }}>
              {[["condicion","Condición actual"],["pronostico","Pronóstico"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"7px 8px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:500, background: tab===id ? C.surface : "transparent", color: tab===id ? C.accent : C.muted, boxShadow: tab===id ? "0 1px 3px rgba(0,0,0,0.07)" : "none", transition:"all .14s" }}>{lbl}</button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Tab: Condición actual ───────────────────────────────────────────── */}
      {tab === "condicion" && (
        <main style={{ padding: isMobile ? "12px 12px" : "22px 28px", maxWidth:1300, margin:"0 auto" }}>

          {/* Toolbar */}
          <div style={{ marginBottom: isMobile ? 12 : 18 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
                {["Todas",...ZONAS].map(z=>(
                  <button key={z} onClick={()=>setZona(z)} style={{ padding: isMobile ? "5px 14px" : "3px 12px", borderRadius:20, border:`1px solid ${zona===z ? C.accent : C.border}`, background: zona===z ? C.accentBg : C.surface, color: zona===z ? C.accent : C.muted, fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"inherit", transition:"all .12s", whiteSpace:"nowrap", flexShrink:0 }}>{z}</button>
                ))}
              </div>
              <button onClick={handleAutoUpdate} disabled={updating} style={{ display:"flex", alignItems:"center", gap:5, padding: isMobile ? "7px 12px" : "6px 14px", borderRadius:8, border:`1px solid ${imported ? C.green : C.border}`, background: imported ? C.greenBg : C.surface, color: imported ? C.green : C.muted, fontSize:11, fontWeight:500, cursor: updating ? "wait" : "pointer", opacity: updating ? 0.75 : 1, fontFamily:"inherit", transition:"all .14s", flexShrink:0, marginLeft:8 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {updating ? "Actualizando…" : imported ? "✓ Actualizado" : "Actualizar"}
              </button>
            </div>
          </div>

          {updateError && (
            <div style={{ background:C.redBg, color:C.red, border:`1px solid #FECACA`, borderRadius:10, padding:"8px 12px", fontSize:12, marginBottom:12 }}>
              {updateError}
            </div>
          )}

          {/* Panel importar */}
          {pasteOpen && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px", marginBottom:18, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <p style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:4 }}>Actualizar datos meteorológicos</p>
              <p style={{ fontSize:11, color:C.muted, marginBottom:12 }}>
                Acepta dos formatos: <strong>JSON de ChatGPT</strong> (con campos ciudad, tact, tmin, tmax, condicion, categoria, pp_dia, pp_acum, def_sup) o <strong>tabla del boletín MeteoChile</strong> copiada directamente.
              </p>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
                placeholder={'[{"ciudad":"Arica","tact":19.2,"tmin":null,"tmax":22,"condicion":"Cubierto","categoria":"CUBIERTO","pp_dia":0,"pp_acum":1.5,"def_sup":50}, ...]'}
                style={{ width:"100%", minHeight:120, resize:"vertical", border:`1px solid ${pasteError?C.red:C.border}`, borderRadius:8, padding:"10px 12px", fontFamily:"'Geist Mono',monospace", fontSize:10.5, color:C.text, background:"#FAFBFC", outline:"none", boxSizing:"border-box", lineHeight:1.6 }}
              />
              {pasteError && <p style={{ fontSize:11, color:C.red, marginTop:6 }}>{pasteError}</p>}
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={handleImport} style={{ padding:"7px 20px", borderRadius:8, border:"none", cursor:"pointer", background:C.accent, color:"#fff", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>Aplicar</button>
                <button onClick={()=>{ setData(DEFAULT_DATA); setImported(false); setPasteOpen(false); setPasteText(""); }} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Restaurar datos base</button>
              </div>
            </div>
          )}

          {showSantiagoBlock && (
            <section style={{ marginBottom:18 }}>
              <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".1em", padding:"0 18px", marginBottom:6 }}>
                Santiago
              </div>
              <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, padding:isMobile ? "14px" : "18px", boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "repeat(2,1fr)", gap:10, marginBottom:16 }}>
                  {santiagoRows.map((d) => {
                    const sup = d.def_sup !== null && d.def_sup !== undefined && d.def_sup >= 0;

                    return (
                      <div key={d.ciudad} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:13, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:12 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <Icon cat={d.categoria} size={28}/>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, letterSpacing:"-.15px" }}>{stationName(d)}</div>
                              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Estación Santiago</div>
                            </div>
                          </div>

                          <div style={{ textAlign:"right" }}>
                            <div style={{ ...mono, fontSize:22, fontWeight:600, color:C.text }}>{fmtT(d.tact)}</div>
                            <div style={{ ...mono, fontSize:11, marginTop:2 }}>
                              <span style={{ color:"#60A5FA" }}>{fmtT(d.tmin)}</span>
                              <span style={{ color:C.border, margin:"0 4px" }}>/</span>
                              <span style={{ color:C.orange }}>{fmtT(d.tmax)}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                          <div>
                            <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>PP hoy</div>
                            <div style={{ ...mono, fontSize:12, color: d.pp_dia > 0 ? C.blue : "#475569", marginTop:3 }}>
                              {d.pp_dia === null || d.pp_dia === undefined ? "—" : `${d.pp_dia} mm`}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>PP año</div>
                            <div style={{ ...mono, fontSize:12, color:"#475569", marginTop:3 }}>
                              {d.pp_anio === null || d.pp_anio === undefined ? "—" : `${d.pp_anio} mm`}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Vs normal</div>
                            <div style={{ marginTop:3 }}>
                              {d.def_sup === null || d.def_sup === undefined
                                ? <span style={{ fontSize:11, color:C.border }}>—</span>
                                : <span style={{
                                    display:"inline-flex",
                                    alignItems:"center",
                                    gap:3,
                                    fontSize:11,
                                    fontWeight:600,
                                    ...mono,
                                    color: sup ? C.green : C.red,
                                    background: sup ? C.greenBg : C.redBg,
                                    borderRadius:20,
                                    padding:"2px 8px"
                                  }}>
                                    {sup ? "▲" : "▼"} {Math.abs(d.def_sup)}%
                                  </span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>
                  Pronóstico extendido Santiago · 5 días
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile ? "repeat(5, minmax(76px, 1fr))" : "repeat(5,1fr)", gap:8, overflowX:isMobile ? "auto" : "visible", paddingBottom:isMobile ? 2 : 0 }}>
                  {santiagoForecast.slice(0,5).map((d,i)=>(
                    <div key={`${d.dia || i}-${i}`} style={{ minWidth:isMobile ? 76 : "auto", background:C.bg, borderRadius:12, padding:"11px 8px", border:`1px solid ${C.border}`, textAlign:"center" }}>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:7 }}>{shortDay(d.dia)}</div>
                      <div style={{ display:"flex", justifyContent:"center" }}><Icon cat={d.categoria || normalizarCategoria(d.condicion)} size={24}/></div>
                      <div style={{ fontSize:11, ...mono, marginTop:7 }}>
                        <span style={{color:"#60A5FA"}}>{fmtT(d.tmin)}</span>
                        <span style={{color:C.border, margin:"0 3px"}}>/</span>
                        <span style={{color:C.orange}}>{fmtT(d.tmax)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Encabezados */}
          {!isMobile && (
            <div style={{ display:"grid", gridTemplateColumns:"200px 74px 68px 68px 84px 96px 106px", padding:"0 18px 8px", gap:8, fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".08em" }}>
              <span>Ciudad</span><span style={{textAlign:"center"}}>Actual</span>
              <span style={{textAlign:"center"}}>Mín</span><span style={{textAlign:"center"}}>Máx</span>
              <span style={{textAlign:"center"}}>PP hoy</span><span style={{textAlign:"center"}}>PP año</span>
              <span style={{textAlign:"center"}}>vs. Normal</span>
            </div>
          )}
          {isMobile && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 90px 90px", padding:"0 14px 8px", gap:6, fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".08em" }}>
              <span>Ciudad</span><span style={{textAlign:"center"}}>Actual</span>
              <span style={{textAlign:"center"}}>Mín / Máx</span>
              <span style={{textAlign:"center"}}>vs. Normal</span>
            </div>
          )}

          {/* Filas por zona */}
          {zones.map(z => {
            const rows = filtered.filter(d => d.zona === z);
            if (!rows.length) return null;
            return (
              <section key={z} style={{ marginBottom:16 }}>
                <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".1em", padding:"0 18px", marginBottom:5 }}>Zona {z}</div>
                <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.03)" }}>
                  {rows.map((d, i) => {
                    const sup = d.def_sup !== null && d.def_sup >= 0;
                    return (
                      <>
                      {/* Desktop row */}
                      {!isMobile && (
                        <div key={d.ciudad} style={{ display:"grid", gridTemplateColumns:"200px 74px 68px 68px 84px 96px 106px", alignItems:"center", padding:"11px 18px", gap:8, borderBottom: i<rows.length-1 ? `1px solid ${C.border}` : "none", transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#FAFBFC"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <Icon cat={d.categoria} size={26}/>
                            <span style={{ fontWeight:500, fontSize:13, letterSpacing:"-.15px" }}>{d.ciudad}</span>
                          </div>
                          <div style={{ textAlign:"center", ...mono, fontSize:14, fontWeight:600, color:C.text }}>
                            {d.tact !== null ? `${d.tact}°` : <span style={{ fontSize:11, color:C.border }}>—</span>}
                          </div>
                          <div style={{ textAlign:"center", ...mono, fontSize:13, fontWeight:500, color:"#60A5FA" }}>{fmtT(d.tmin)}</div>
                          <div style={{ textAlign:"center", ...mono, fontSize:13, fontWeight:500, color:C.orange }}>{fmtT(d.tmax)}</div>
                          <div style={{ textAlign:"center", ...mono, fontSize:12, color: d.pp_dia > 0 ? C.blue : C.muted }}>
                            {d.pp_dia === null ? "—" : d.pp_dia > 0 ? `${d.pp_dia} mm` : "0 mm"}
                          </div>
                          <div style={{ textAlign:"center", ...mono, fontSize:12, color:"#475569" }}>{fmtN(d.pp_anio," mm")}</div>
                          <div style={{ textAlign:"center" }}>
                            {d.def_sup === null
                              ? <span style={{ fontSize:11, color:C.border }}>—</span>
                              : <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:600, ...mono, color: sup?C.green:C.red, background: sup?C.greenBg:C.redBg, borderRadius:20, padding:"2px 9px" }}>
                                  {sup?"▲":"▼"} {Math.abs(d.def_sup)}%
                                </span>
                            }
                          </div>
                        </div>
                      )}
                      {/* Mobile row */}
                      {isMobile && (
                        <div key={d.ciudad+"m"} style={{ display:"grid", gridTemplateColumns:"1fr 60px 90px 90px", alignItems:"center", padding:"12px 14px", gap:6, borderBottom: i<rows.length-1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <Icon cat={d.categoria} size={24}/>
                            <span style={{ fontWeight:500, fontSize:13, letterSpacing:"-.15px" }}>{d.ciudad}</span>
                          </div>
                          <div style={{ textAlign:"center", ...mono, fontSize:15, fontWeight:600, color:C.text }}>
                            {d.tact !== null ? `${d.tact}°` : <span style={{ fontSize:11, color:C.border }}>—</span>}
                          </div>
                          <div style={{ textAlign:"center", ...mono, fontSize:12 }}>
                            <span style={{ color:"#60A5FA" }}>{fmtT(d.tmin)}</span>
                            <span style={{ color:C.border, margin:"0 3px" }}>/</span>
                            <span style={{ color:C.orange }}>{fmtT(d.tmax)}</span>
                          </div>
                          <div style={{ textAlign:"center" }}>
                            {d.def_sup === null
                              ? <span style={{ fontSize:11, color:C.border }}>—</span>
                              : <span style={{ display:"inline-flex", alignItems:"center", gap:2, fontSize:11, fontWeight:600, ...mono, color: sup?C.green:C.red, background: sup?C.greenBg:C.redBg, borderRadius:20, padding:"2px 7px" }}>
                                  {sup?"▲":"▼"} {Math.abs(d.def_sup)}%
                                </span>
                            }
                          </div>
                        </div>
                      )}
                      </>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div style={{ fontSize:10, color:"#C0C8D4", textAlign:"right", marginTop:6 }}>
            Condición/pronóstico: MeteoChile pronostico.js · Temperatura: EMA · PP: Boletín DMC · Normales 1991–2020
          </div>
        </main>
      )}

      {/* ── Tab: Generar pronóstico ─────────────────────────────────────────── */}
      {tab === "pronostico" && (
        <main style={{ padding:"40px 28px", maxWidth:660, margin:"0 auto" }}>
          <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, padding:"24px 28px", marginBottom:18, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".09em", marginBottom:14 }}>Contenido del archivo</div>
            <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>Pronóstico por zona · {data.filter(d=>d.zona!=="Santiago").length} ciudades</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:22 }}>
              {ZONAS.map(z=>(
                <div key={z} style={{ background:C.bg, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9.5, color:C.muted, textTransform:"uppercase", letterSpacing:".07em" }}>Zona {z}</div>
                  <div style={{ fontSize:20, fontWeight:600, color:C.accent, marginTop:2 }}>{data.filter(d=>d.zona===z).length}</div>
                  <div style={{ fontSize:10, color:C.muted }}>ciudades</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>Pronóstico extendido Santiago · 5 días</div>
            <div style={{ display:"flex", gap:7 }}>
              {SANTIAGO_5.map((d,i)=>(
                <div key={i} style={{ flex:1, background:C.bg, borderRadius:10, padding:"10px 8px", border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontSize:9.5, color:C.muted, marginBottom:6 }}>{d.dia.split(" ")[0]}</div>
                  <div style={{ display:"flex", justifyContent:"center" }}><Icon cat={d.categoria} size={22}/></div>
                  <div style={{ fontSize:11, ...mono, marginTop:5 }}>
                    <span style={{color:"#60A5FA"}}>{d.tmin}°</span>
                    <span style={{color:C.border, margin:"0 2px"}}>/</span>
                    <span style={{color:C.orange}}>{d.tmax}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, padding:"18px 28px", marginBottom:22, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".09em", marginBottom:10 }}>Columnas incluidas</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {["Zona","Ciudad","Mínima (°C)","Máxima (°C)","Condición","Categoría"].map(c=>(
                <span key={c} style={{ fontSize:11, fontWeight:500, color:"#374151", background:C.bg, borderRadius:6, padding:"3px 11px", border:`1px solid ${C.border}` }}>{c}</span>
              ))}
            </div>
          </div>

          {!generated ? (
            <button onClick={handleGenerate} disabled={generating||!xlsxReady} style={{ width:"100%", padding:"15px", borderRadius:13, border:"none", cursor: generating?"wait":"pointer", background: generating?"#93C5FD":"linear-gradient(135deg,#3B82F6,#1D4ED8)", color:"#fff", fontSize:14, fontWeight:600, fontFamily:"inherit", letterSpacing:"-.2px", boxShadow:"0 4px 16px rgba(37,99,235,.22)", transition:"all .18s", display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
              {generating
                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{animation:"spin 1s linear infinite"}}><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/><path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Generando…</>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 11l5 5 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>Generar y descargar Excel</>
              }
            </button>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ width:"100%", padding:"14px", borderRadius:13, background:C.greenBg, border:`1px solid ${C.greenBorder}`, display:"flex", alignItems:"center", justifyContent:"center", gap:9, fontSize:13, fontWeight:600, color:C.green }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Archivo generado correctamente
              </div>
              <button onClick={handleGenerate} style={{ width:"100%", padding:"12px", borderRadius:13, border:`1px solid ${C.border}`, cursor:"pointer", background:C.surface, color:C.muted, fontSize:12, fontWeight:500, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Descargar nuevamente
              </button>
            </div>
          )}
          <p style={{ textAlign:"center", fontSize:11, color:C.muted, marginTop:14 }}>
            {data.filter(d=>d.zona!=="Santiago").length} ciudades · pronóstico extendido Santiago 5 días · formato .xlsx
          </p>
        </main>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus { outline: 1px solid #3B82F6 !important; border-color: #3B82F6 !important; }
      `}</style>
    </div>
  );
}
