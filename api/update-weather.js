// api/update-weather.js
// Vercel Serverless Function
// Endpoint: /api/update-weather
//
// Este endpoint genera el JSON consolidado al presionar "Actualizar" en WeatherLink.
// Fuentes:
// - pronostico.js MeteoChile: tmin, tmax, condicion, categoria
// - visor EMA MeteoChile: tact
// - DIRECTEMAR Valparaíso: tact
// - boletín climatológico diario: pp_dia, pp_acum, def_sup

const PRONOSTICO_URL =
  "https://archivos.meteochile.gob.cl/portaldmc/meteochile/js/pronostico.js?version=1";

const BOLETIN_URL =
  "https://climatologia.meteochile.gob.cl/application/diario/boletinClimatologicoDiario/actual";

const EMA_BASE =
  "https://climatologia.meteochile.gob.cl/application/diariob/visorDeDatosEma/";

const DIRECTEMAR_VALPO =
  "https://serviciosonline.directemar.cl/meteomapa/fichaEstacion/VALPARAISO";

const CITIES = [
  { ciudad: "Arica", zona: "Norte", ema: "180018", indice: "arica" },
  { ciudad: "Iquique", zona: "Norte", ema: "200006", indice: "iquique" },
  { ciudad: "Antofagasta", zona: "Norte", ema: "230002", indice: "antofagasta" },
  { ciudad: "Copiapó", zona: "Norte", ema: "270009", indice: "copiapo" },
  { ciudad: "La Serena", zona: "Norte", ema: "290004", indice: "serena" },
  { ciudad: "Valparaíso", zona: "Centro", directemar: true, indice: "valpo" },
  { ciudad: "Viña del Mar", zona: "Centro", ema: "330007", indice: "vdelmar" },
  { ciudad: "Rancagua", zona: "Centro", ema: "340045", indice: "rancagua" },
  { ciudad: "Talca", zona: "Centro", ema: "350028", indice: "talca" },
  { ciudad: "Chillán", zona: "Centro", ema: "360011", indice: "chillan" },
  { ciudad: "Concepción", zona: "Centro", ema: "360019", indice: "concepcion" },
  { ciudad: "Temuco", zona: "Sur", ema: "380013", indice: "temuco" },
  { ciudad: "Valdivia", zona: "Sur", ema: "390015", indice: "valdivia" },
  { ciudad: "Osorno", zona: "Sur", ema: "400013", indice: "osorno" },
  { ciudad: "Puerto Montt", zona: "Sur", ema: "410005", indice: "ptomontt" },
  { ciudad: "Coyhaique", zona: "Sur", ema: "450004", indice: "coyhaique" },
  { ciudad: "Punta Arenas", zona: "Sur", ema: "520012", indice: "ptarenas" },
  { ciudad: "Juan Fernández", zona: "Insular", ema: "330031", indice: "juanfernandez" },
  { ciudad: "Rapa Nui", zona: "Insular", ema: "270001", indice: "pascua" },
  { ciudad: "Rey Jorge", zona: "Insular", ema: "950001", indice: "reyjorge" },
];

const STATION_MAP = {
  "chacalluta": "Arica",
  "arica": "Arica",
  "diego aracena": "Iquique",
  "iquique": "Iquique",
  "cerro moreno": "Antofagasta",
  "antofagasta": "Antofagasta",
  "desierto de atacama": "Copiapó",
  "caldera": "Copiapó",
  "copiap": "Copiapó",
  "la florida": "La Serena",
  "la serena": "La Serena",
  "rodelillo": "Valparaíso",
  "valparaíso": "Valparaíso",
  "valparaiso": "Valparaíso",
  "eulogio": "Viña del Mar",
  "viña": "Viña del Mar",
  "rancagua": "Rancagua",
  "panguilemo": "Talca",
  "talca": "Talca",
  "bernardo": "Chillán",
  "chillán": "Chillán",
  "chillan": "Chillán",
  "carriel": "Concepción",
  "concepción": "Concepción",
  "concepcion": "Concepción",
  "maquehue": "Temuco",
  "maquehua": "Temuco",
  "temuco": "Temuco",
  "pichoy": "Valdivia",
  "valdivia": "Valdivia",
  "cañal bajo": "Osorno",
  "osorno": "Osorno",
  "el tepual": "Puerto Montt",
  "puerto montt": "Puerto Montt",
  "balmaceda": "Coyhaique",
  "vidal": "Coyhaique",
  "coyhaique": "Coyhaique",
  "ibáñez": "Punta Arenas",
  "ibañez": "Punta Arenas",
  "punta arenas": "Punta Arenas",
  "robinson": "Juan Fernández",
  "juan fernández": "Juan Fernández",
  "juan fernandez": "Juan Fernández",
  "mataveri": "Rapa Nui",
  "pascua": "Rapa Nui",
  "frei montalva": "Rey Jorge",
  "marsh": "Rey Jorge",
  "antártica": "Rey Jorge",
};

function n(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(",", ".").replace(/[^\d.\-]/g, "");
  if (!s) return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

function decodeHtml(s = "") {
  return s
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í").replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarCategoria(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (t.includes("tormenta") && t.includes("lluvia")) return "TORMENTA ELÉCTRICA CON LLUVIA";
  if (t.includes("tormenta")) return "TORMENTA ELÉCTRICA";
  if (t.includes("aguanieve")) return "AGUANIEVE";
  if (t.includes("nieve")) return "NIEVE";
  if (t.includes("lluvia fuerte") || t.includes("chubascos fuertes")) return "LLUVIA FUERTE";
  if (t.includes("lluvia débil") || t.includes("chubascos débiles")) return "LLUVIA DÉBIL";
  if (t.includes("intermitente") && t.includes("lluvia")) return "LLUVIA INTERMITENTE";
  if (t.includes("llovizna")) return "LLOVIZNA";
  if (t.includes("lluvia") || t.includes("chubascos")) return "LLUVIA";
  if (t.includes("niebla")) return "NIEBLA";
  if (t.includes("neblina")) return "NEBLINA";
  if (t.includes("cubierto")) return "CUBIERTO";
  if (t.includes("nublado")) return "NUBLADO";
  if (t.includes("nubosidad parcial") || t.includes("parcial")) return "PARCIAL";
  if (t.includes("escasa nubosidad")) return "ESCASA NUBOSIDAD";
  if (t.includes("despejado")) return "DESPEJADO";
  return "CUBIERTO";
}

function tramoHorarioChile() {
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find(p => p.type === "hour")?.value ?? 12);
  if (h >= 6 && h < 12) return 1;
  if (h >= 12 && h < 18) return 2;
  return 3;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "WeatherLink/1.0",
      "Accept": "text/html,application/javascript,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.text();
}

function parsePronostico(jsText) {
  const blocks = jsText.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
  const tramo = tramoHorarioChile();
  const out = {};

  for (const block of blocks) {
    const indice = block.match(/indice\s*:\s*["']([^"']+)["']/)?.[1];
    if (!indice) continue;

    const tempBlock = block.match(/temperatura\s*:\s*\[([\s\S]*?)\]/)?.[1];
    const tempStr = tempBlock?.match(/["']([^"']*)["']/)?.[1] ?? "";
    const [minStr, maxStr] = tempStr.split("/");
    const tmin = minStr ? n(minStr) : null;
    const tmax = maxStr ? n(maxStr) : null;

    const textoBlock = block.match(/texto\s*:\s*\[([\s\S]*?)\]\s*,\s*redaccion/)?.[1];
    const firstArray = textoBlock?.match(/\[([\s\S]*?)\]/)?.[1] ?? "";
    const items = [...firstArray.matchAll(/["']([^"']*)["']/g)].map(m => decodeHtml(m[1]));
    const condicion = items[tramo] || items.find(Boolean) || null;

    out[indice] = {
      tmin,
      tmax,
      condicion,
      categoria: normalizarCategoria(condicion),
    };
  }

  return out;
}

function parseEmaTemperature(html) {
  const text = decodeHtml(html);
  const patterns = [
    /Temperatura del Aire en °C\s*([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura del Aire.*?([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura.*?([\-]?\d+(?:[,.]\d+)?)\s*°?\s*C/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return n(m[1]);
  }
  return null;
}

function parseDirectemarTemperature(html) {
  const text = decodeHtml(html);
  const patterns = [
    /Temperatura\s+del\s+Aire.*?([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura.*?([\-]?\d+(?:[,.]\d+)?)\s*°?\s*C/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return n(m[1]);
  }
  return null;
}

function matchStation(nombre) {
  const clean = nombre.toLowerCase();
  for (const [key, ciudad] of Object.entries(STATION_MAP)) {
    if (clean.includes(key)) return ciudad;
  }
  return null;
}

function parseBoletin(html) {
  const text = decodeHtml(html).replace(/\r/g, "\n");
  const out = {};

  // Primer intento: parsear líneas de texto con números.
  const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
  for (const line of lines) {
    const ciudad = matchStation(line);
    if (!ciudad) continue;

    const nums = [...line.matchAll(/S\/P|[\-]?\d+(?:[,.]\d+)?/gi)].map(m => m[0]);
    if (nums.length < 3) continue;

    // En el boletín típico, los últimos campos corresponden a PP día, a la fecha, normal, def/sup.
    // Este fallback privilegia no inventar: si no alcanza, queda null.
    const ppDia = nums.find(x => /^S\/P$/i.test(x)) ? 0 : n(nums.at(-4));
    const ppAcum = n(nums.at(-3));
    const ppNormal = n(nums.at(-2));
    const defSup = n(nums.at(-1));

    out[ciudad] = {
      pp_dia: ppDia ?? null,
      pp_acum: ppAcum ?? null,
      pp_normal: ppNormal ?? null,
      def_sup: defSup ?? null,
    };
  }

  return out;
}

async function buildWeatherJson() {
  const [pronosticoText, boletinText] = await Promise.allSettled([
    fetchText(PRONOSTICO_URL),
    fetchText(BOLETIN_URL),
  ]);

  const pronostico =
    pronosticoText.status === "fulfilled" ? parsePronostico(pronosticoText.value) : {};
  const boletin =
    boletinText.status === "fulfilled" ? parseBoletin(boletinText.value) : {};

  const rows = await Promise.all(
    CITIES.map(async (c) => {
      let tact = null;

      try {
        if (c.directemar) {
          tact = parseDirectemarTemperature(await fetchText(DIRECTEMAR_VALPO));
        } else if (c.ema) {
          tact = parseEmaTemperature(await fetchText(EMA_BASE + c.ema));
        }
      } catch {
        tact = null;
      }

      const p = pronostico[c.indice] || {};
      const b = boletin[c.ciudad] || {};

      return {
        ciudad: c.ciudad,
        zona: c.zona,
        tact,
        tmin: p.tmin ?? null,
        tmax: p.tmax ?? null,
        condicion: p.condicion ?? null,
        categoria: p.categoria ?? null,
        pp_dia: b.pp_dia ?? null,
        pp_acum: b.pp_acum ?? null,
        def_sup: b.def_sup ?? null,
      };
    })
  );

  return rows;
}

export default async function handler(req, res) {
  try {
    const data = await buildWeatherJson();

    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({
      updated_at: new Date().toISOString(),
      source: "MeteoChile + DIRECTEMAR",
      data,
    });
  } catch (err) {
    res.status(500).json({
      error: "No se pudo actualizar WeatherLink",
      detail: err?.message || String(err),
    });
  }
}
