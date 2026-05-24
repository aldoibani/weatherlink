// api/update-weather.js

const PRONOSTICO_URL =
  "https://archivos.meteochile.gob.cl/portaldmc/meteochile/js/pronostico.js?version=1";

const BOLETIN_URL =
  "https://climatologia.meteochile.gob.cl/application/diario/boletinClimatologicoDiario/actual";

const EMA_BASE =
  "https://climatologia.meteochile.gob.cl/application/diariob/visorDeDatosEma/";

const DIRECTEMAR_VALPO =
  "https://serviciosonline.directemar.cl/meteomapa/fichaEstacion/VALPARAISO";

const CITIES = [
  { ciudad: "Arica", zona: "Norte", ema: "180018", indices: ["arica"] },
  { ciudad: "Iquique", zona: "Norte", ema: "200006", indices: ["iquique"] },
  { ciudad: "Antofagasta", zona: "Norte", ema: "230002", indices: ["antofagasta"] },
  { ciudad: "Copiapó", zona: "Norte", ema: "270009", indices: ["copiapo"] },
  { ciudad: "La Serena", zona: "Norte", ema: "290004", indices: ["serena"] },
  { ciudad: "Valparaíso", zona: "Centro", directemar: true, indices: ["valpo"] },
  { ciudad: "Viña del Mar", zona: "Centro", ema: "330007", indices: ["vdelmar"] },
  { ciudad: "Rancagua", zona: "Centro", ema: "340045", indices: ["rancagua"] },
  { ciudad: "Talca", zona: "Centro", ema: "350028", indices: ["talca"] },
  { ciudad: "Chillán", zona: "Centro", ema: "360011", indices: ["chillan"] },
  { ciudad: "Concepción", zona: "Centro", ema: "360019", indices: ["concepcion"] },
  { ciudad: "Temuco", zona: "Sur", ema: "380013", indices: ["temuco"] },
  { ciudad: "Valdivia", zona: "Sur", ema: "390015", indices: ["valdivia"] },
  { ciudad: "Osorno", zona: "Sur", ema: "400013", indices: ["osorno"] },
  { ciudad: "Puerto Montt", zona: "Sur", ema: "410005", indices: ["pmontt", "ptomontt"] },
  { ciudad: "Coyhaique", zona: "Sur", ema: "450004", indices: ["coyhaique"] },
  { ciudad: "Punta Arenas", zona: "Sur", ema: "520012", indices: ["parenas", "ptarenas"] },
  { ciudad: "Juan Fernández", zona: "Insular", ema: "330031", indices: ["jfernandez", "juanfernandez"] },
  { ciudad: "Rapa Nui", zona: "Insular", ema: "270001", indices: ["rapanui", "pascua"] },
  { ciudad: "Rey Jorge", zona: "Insular", ema: "950001", indices: ["antartica", "reyjorge", "frei", "marsh"] },
];

const BOLETIN_STATIONS = [
  ["chacalluta", "Arica"],
  ["diego aracena", "Iquique"],
  ["cerro moreno", "Antofagasta"],
  ["desierto de atacama", "Copiapó"],
  ["caldera", "Copiapó"],
  ["la florida", "La Serena"],

  // VALPARAÍSO — Faro Punta Ángeles
  ["punta angeles faro", "Valparaíso"],
  ["punta ángeles faro", "Valparaíso"],
  ["punta ãngeles faro", "Valparaíso"],
  ["punta Ãngeles faro", "Valparaíso"],
  ["faro punta angeles", "Valparaíso"],
  ["faro punta ángeles", "Valparaíso"],
  ["angeles faro", "Valparaíso"],
  ["ángeles faro", "Valparaíso"],
  ["punta angeles", "Valparaíso"],
  ["punta ángeles", "Valparaíso"],
  ["punta ãngeles", "Valparaíso"],
  ["punta Ãngeles", "Valparaíso"],

  ["rodelillo", "Viña del Mar"],
  ["rancagua", "Rancagua"],
  ["panguilemo", "Talca"],
  ["talca", "Talca"],
  ["general bernardo", "Chillán"],
  ["bernardo o", "Chillán"],
  ["chillan", "Chillán"],
  ["chillán", "Chillán"],
  ["carriel", "Concepción"],
  ["maquehue", "Temuco"],
  ["maquehua", "Temuco"],
  ["pichoy", "Valdivia"],
  ["canal bajo", "Osorno"],
  ["cañal bajo", "Osorno"],
  ["el tepual", "Puerto Montt"],
  ["tepual", "Puerto Montt"],
  ["teniente vidal", "Coyhaique"],
  ["balmaceda", "Coyhaique"],
  ["carlos ibanez", "Punta Arenas"],
  ["carlos ibañez", "Punta Arenas"],

  // JUAN FERNÁNDEZ
  ["robinson crusoe", "Juan Fernández"],
  ["juan fernández, estación meteorológica", "Juan Fernández"],
  ["juan fernandez, estacion meteorologica", "Juan Fernández"],
  ["juan fernã¡ndez", "Juan Fernández"],
  ["estaciã³n meteorolã³gica", "Juan Fernández"],
  ["juan fernandez", "Juan Fernández"],
  ["juan fernández", "Juan Fernández"],
  ["juan fern", "Juan Fernández"],

  // RAPA NUI
  ["mataveri isla de pascua ap", "Rapa Nui"],
  ["mataveri isla de pascua", "Rapa Nui"],
  ["isla de pascua ap", "Rapa Nui"],
  ["mataveri", "Rapa Nui"],
  ["isla de pascua", "Rapa Nui"],
  ["pascua", "Rapa Nui"],

  // REY JORGE
  ["frei montalva", "Rey Jorge"],
  ["marsh", "Rey Jorge"],
  ["antartica", "Rey Jorge"],
  ["antártica", "Rey Jorge"],
];

function normalizeText(s = "") {
  return String(s)
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/Ã/g, "Á").replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é").replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó").replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/\s+/g, " ").trim();
}

function stripAccents(s = "") {
  return normalizeText(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim();
  if (!raw || raw === "-" || raw === "." || /^S\/P$/i.test(raw)) return null;
  const x = Number(raw.replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function numberOrZeroIfSP(v) {
  if (v === null || v === undefined) return null;
  if (/^S\/P$/i.test(String(v).trim())) return 0;
  return toNumber(v);
}

function normalizarCategoria(texto) {
  if (!texto) return null;
  const t = stripAccents(texto).toLowerCase();
  if (t.includes("tormenta") && t.includes("lluvia")) return "TORMENTA ELÉCTRICA CON LLUVIA";
  if (t.includes("tormenta")) return "TORMENTA ELÉCTRICA";
  if (t.includes("aguanieve")) return "AGUANIEVE";
  if (t.includes("nieve")) return "NIEVE";
  if (t.includes("lluvia fuerte")) return "LLUVIA FUERTE";
  if (t.includes("llovizna")) return "LLOVIZNA";
  if (t.includes("lluvia")) return "LLUVIA";
  if (t.includes("niebla")) return "NIEBLA";
  if (t.includes("neblina")) return "NEBLINA";
  if (t.includes("cubierto")) return "CUBIERTO";
  if (t.includes("nublado")) return "NUBLADO";
  if (t.includes("parcial")) return "PARCIAL";
  if (t.includes("despejado")) return "DESPEJADO";
  return "NUBLADO";
}

function tramoHorarioChile() {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (h >= 6 && h < 12) return 1;
  if (h >= 12 && h < 18) return 2;
  return 3;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "WeatherLink/1.0",
      Accept: "text/html,application/javascript,*/*",
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

    const tempStr =
      block.match(/temperatura\s*:\s*\[\s*["']([^"']*)["']/)?.[1] || "";
    const [minStr, maxStr] = tempStr.split("/");
    const tmin = minStr ? toNumber(minStr) : null;
    const tmax = maxStr ? toNumber(maxStr) : null;

    const textoMatch = block.match(/texto\s*:\s*\[\s*\[([\s\S]*?)\]\s*,/);
    const textoItems = textoMatch
      ? [...textoMatch[1].matchAll(/["']([^"']*)["']/g)].map((m) =>
          normalizeText(m[1])
        )
      : [];

    const condicion =
      textoItems[tramo] || textoItems.find((x) => x && x.trim()) || null;

    out[indice] = { tmin, tmax, condicion, categoria: normalizarCategoria(condicion) };
  }
  return out;
}

function pickPronostico(pronostico, indices = []) {
  for (const idx of indices) {
    if (pronostico[idx]) return pronostico[idx];
  }
  return {};
}

function parseEmaTemperature(html) {
  const text = normalizeText(html.replace(/<[^>]+>/g, " "));
  const patterns = [
    /Temperatura del Aire en °C\s*([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura del Aire.*?([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura.*?([\-]?\d+(?:[,.]\d+)?)\s*°?\s*C/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return toNumber(m[1]);
  }
  return null;
}

function parseDirectemarTemperature(html) {
  const text = normalizeText(html.replace(/<[^>]+>/g, " "));
  const patterns = [
    /Temperatura\s+del\s+Aire.*?([\-]?\d+(?:[,.]\d+)?)/i,
    /Temperatura.*?([\-]?\d+(?:[,.]\d+)?)\s*°?\s*C/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return toNumber(m[1]);
  }
  return null;
}

function cityFromStationName(stationName) {
  const clean = stripAccents(stationName).toLowerCase();
  for (const [key, city] of BOLETIN_STATIONS) {
    const k = stripAccents(key).toLowerCase();
    if (clean.includes(k)) return city;
  }
  return null;
}

function extractCells(rowHtml) {
  const cells = [];
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m;
  while ((m = cellRe.exec(rowHtml)) !== null) {
    cells.push(normalizeText(m[1].replace(/<[^>]+>/g, " ")));
  }
  return cells;
}

function parseBoletin(html) {
  const out = {};
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const cells = extractCells(rowMatch[0]);
    if (cells.length < 10) continue;

    const city = cityFromStationName(cells[0]);
    if (!city) continue;

    out[city] = {
      tmin:    toNumber(cells[1]),
      pp_dia:  numberOrZeroIfSP(cells[5]),
      pp_acum: numberOrZeroIfSP(cells[6]),
      def_sup: /^S\/P$/i.test(cells[9]) ? null : toNumber(cells[9]),
    };
  }

  return out;
}

async function buildWeatherJson() {
  const [pronosticoSettled, boletinSettled] = await Promise.allSettled([
    fetchText(PRONOSTICO_URL),
    fetchText(BOLETIN_URL),
  ]);

  const pronostico =
    pronosticoSettled.status === "fulfilled"
      ? parsePronostico(pronosticoSettled.value)
      : {};

  const boletin =
    boletinSettled.status === "fulfilled"
      ? parseBoletin(boletinSettled.value)
      : {};

  const rows = await Promise.all(
    CITIES.map(async (c) => {
      let tact = null;
      try {
        if (c.directemar) {
          tact = parseDirectemarTemperature(await fetchText(DIRECTEMAR_VALPO));
        } else {
          tact = parseEmaTemperature(await fetchText(EMA_BASE + c.ema));
        }
      } catch {
        tact = null;
      }

      const p = pickPronostico(pronostico, c.indices);
      const b = boletin[c.ciudad] || {};

      return {
        ciudad: c.ciudad,
        zona: c.zona,
        tact,
        tmin: p.tmin ?? b.tmin ?? null,
        tmax: p.tmax ?? null,
        condicion: p.condicion ?? null,
        categoria: p.categoria ?? null,
        pp_dia:  b.pp_dia  ?? null,
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
