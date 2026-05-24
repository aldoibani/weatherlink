// api/update-weather.js

const PRONOSTICO_URL =
  "https://archivos.meteochile.gob.cl/portaldmc/meteochile/js/pronostico.js?version=1";

const BOLETIN_URL =
  "https://climatologia.meteochile.gob.cl/application/diario/boletinClimatologicoDiario/actual";

const EMA_BASE =
  "https://climatologia.meteochile.gob.cl/application/diariob/visorDeDatosEma/";

const SANTIAGO_STATIONS = [
  {
    key: "quinta_normal",
    ciudad: "Quinta Normal",
    label: "Quinta Normal",
    zona: "Santiago",
    ema: "330020",
    indices: ["stgo", "santiago"],
  },
  {
    key: "pudahuel",
    ciudad: "Pudahuel",
    label: "Pudahuel",
    zona: "Santiago",
    ema: "330021",
    indices: ["stgo", "santiago"],
  },
];

const CITIES = [
  { ciudad: "Arica", zona: "Norte", ema: "180018", indices: ["arica"] },
  { ciudad: "Iquique", zona: "Norte", ema: "200006", indices: ["iquique"] },
  { ciudad: "Antofagasta", zona: "Norte", ema: "230002", indices: ["antofagasta"] },
  { ciudad: "Copiapó", zona: "Norte", ema: "270009", indices: ["copiapo"] },
  { ciudad: "La Serena", zona: "Norte", ema: "290004", indices: ["serena"] },

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
  ["quinta normal", "Quinta Normal"],
  ["pudahuel", "Pudahuel"],
  ["chacalluta", "Arica"],
  ["diego aracena", "Iquique"],
  ["cerro moreno", "Antofagasta"],
  ["desierto de atacama", "Copiapó"],
  ["caldera", "Copiapó"],
  ["la florida", "La Serena"],
  ["rodelillo", "Viña del Mar"],
  ["rancagua", "Rancagua"],
  ["panguilemo", "Talca"],
  ["talca", "Talca"],
  ["general bernardo", "Chillán"],
  ["chillan", "Chillán"],
  ["chillán", "Chillán"],
  ["carriel", "Concepción"],
  ["maquehue", "Temuco"],
  ["maquehua", "Temuco"],
  ["pichoy", "Valdivia"],
  ["canal bajo", "Osorno"],
  ["cañal bajo", "Osorno"],
  ["canal bajo osorno", "Osorno"],
  ["cañal bajo osorno", "Osorno"],
  ["canal bajo osorno ad", "Osorno"],
  ["cañal bajo osorno ad", "Osorno"],
  ["el tepual", "Puerto Montt"],
  ["tepual", "Puerto Montt"],
  ["teniente vidal", "Coyhaique"],
  ["balmaceda", "Coyhaique"],
  ["carlos ibanez", "Punta Arenas"],
  ["carlos ibañez", "Punta Arenas"],
  ["carlos ibanez punta arenas", "Punta Arenas"],
  ["carlos ibañez punta arenas", "Punta Arenas"],
  ["carlos ibanez punta arenas ap", "Punta Arenas"],
  ["carlos ibañez punta arenas ap", "Punta Arenas"],
  ["robinson crusoe", "Juan Fernández"],
  ["juan fernández", "Juan Fernández"],
  ["juan fernandez", "Juan Fernández"],
  ["juan fern", "Juan Fernández"],
  ["mataveri isla de pascua ap", "Rapa Nui"],
  ["mataveri isla de pascua", "Rapa Nui"],
  ["isla de pascua ap", "Rapa Nui"],
  ["mataveri", "Rapa Nui"],
  ["pascua", "Rapa Nui"],
  ["frei montalva", "Rey Jorge"],
  ["marsh", "Rey Jorge"],
  ["antartica", "Rey Jorge"],
  ["antártica", "Rey Jorge"],
];

function normalizeText(s = "") {
  let text = String(s);
  try { text = decodeURIComponent(escape(text)); } catch {}
  return text
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/Ã/g, "Á").replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é").replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó").replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ").replace(/Ã/g, "Á")
    .replace(/\s+/g, " ").trim();
}

function stripAccents(s = "") {
  return normalizeText(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function stationKey(s = "") {
  return stripAccents(normalizeText(s))
    .toLowerCase()
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function titleCaseFromIndice(indice = "") {
  return indice
    .replace(/_/g, " ").replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()).trim();
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

function parseMaybeNumber(v) {
  return v !== undefined && v !== null && String(v).trim() !== ""
    ? toNumber(v) : null;
}

function normalizarCategoria(texto) {
  if (!texto) return null;
  const t = stripAccents(texto).toLowerCase();
  if (t.includes("tormenta") && t.includes("lluvia")) return "TORMENTA ELÉCTRICA CON LLUVIA";
  if (t.includes("tormenta")) return "TORMENTA ELÉCTRICA";
  if (t.includes("aguanieve")) return "AGUANIEVE";
  if (t.includes("nieve")) return "NIEVE";
  if (t.includes("lluvia fuerte")) return "LLUVIA FUERTE";
  if (t.includes("lluvia debil") || t.includes("chubascos debiles")) return "LLUVIA DÉBIL";
  if (t.includes("intermitente") && t.includes("lluvia")) return "LLUVIA INTERMITENTE";
  if (t.includes("llovizna")) return "LLOVIZNA";
  if (t.includes("lluvia") || t.includes("chubascos")) return "LLUVIA";
  if (t.includes("niebla")) return "NIEBLA";
  if (t.includes("neblina")) return "NEBLINA";
  if (t.includes("cubierto")) return "CUBIERTO";
  if (t.includes("nublado")) return "NUBLADO";
  if (t.includes("parcial")) return "PARCIAL";
  if (t.includes("escasa nubosidad")) return "ESCASA NUBOSIDAD";
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

function diaNombreChile(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const name = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
  }).format(d);
  return name.charAt(0).toUpperCase() + name.slice(1);
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

function extractStringField(block, fields) {
  for (const field of fields) {
    const re = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`, "i");
    const m = block.match(re);
    if (m?.[1]) return normalizeText(m[1]);
  }
  return null;
}

function extractPronosticoName(block, indice) {
  const fromField = extractStringField(block, [
    "ciudad", "nombre", "localidad", "estacion", "titulo", "title",
  ]);
  return fromField || titleCaseFromIndice(indice);
}

function parsePronostico(jsText) {
  const blocks = jsText.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
  const tramo = tramoHorarioChile();
  const out = {};
  const options = [];

  for (const block of blocks) {
    const indice = block.match(/indice\s*:\s*["']([^"']+)["']/)?.[1];
    if (!indice) continue;

    const ciudad = extractPronosticoName(block, indice);

    const tempBlock = block.match(/temperatura\s*:\s*\[([\s\S]*?)\]/)?.[1] || "";
    const tempItems = [...tempBlock.matchAll(/["']([^"']*)["']/g)].map((m) =>
      normalizeText(m[1])
    );

    const textoOuter =
      block.match(/texto\s*:\s*\[([\s\S]*?)\]\s*,\s*redaccion/)?.[1] || "";
    const textoArrays = [];
    const arrayRe = /\[([\s\S]*?)\]/g;
    let arrM;
    while ((arrM = arrayRe.exec(textoOuter)) !== null) {
      textoArrays.push(
        [...arrM[1].matchAll(/["']([^"']*)["']/g)].map((m) => normalizeText(m[1]))
      );
    }

    const tempHoy = tempItems[0] || "";
    const [minHoy, maxHoy] = tempHoy.split("/");

    const todayTexts = textoArrays[0] || [];
    const condicionHoy =
      todayTexts[tramo] || todayTexts.find((x) => x && x.trim()) || null;

    const forecast_5d = tempItems.slice(0, 5).map((temp, i) => {
      const [mn, mx] = String(temp || "").split("/");
      const texts = textoArrays[i] || [];
      const condicion =
        texts[tramo] || texts.find((x) => x && x.trim()) || condicionHoy || null;
      return {
        dia: i === 0 ? "Hoy" : diaNombreChile(i),
        tmin: parseMaybeNumber(mn),
        tmax: parseMaybeNumber(mx),
        condicion,
        categoria: normalizarCategoria(condicion),
      };
    });

    const entry = {
      indice,
      ciudad,
      tmin: parseMaybeNumber(minHoy),
      tmax: parseMaybeNumber(maxHoy),
      condicion: condicionHoy,
      categoria: normalizarCategoria(condicionHoy),
      forecast_5d,
    };

    out[indice] = entry;

    options.push({
      indice,
      ciudad,
      condicion: entry.condicion,
      categoria: entry.categoria,
      tmin: entry.tmin,
      tmax: entry.tmax,
    });

    const blockText = stripAccents(block).toLowerCase();
    const indiceText = stripAccents(indice).toLowerCase();
    const ciudadText = stripAccents(ciudad).toLowerCase();

    if (
      blockText.includes("santiago") ||
      ciudadText.includes("santiago") ||
      ciudadText.includes("quinta normal") ||
      ciudadText.includes("pudahuel") ||
      indiceText.includes("stgo") ||
      indiceText.includes("santiago")
    ) {
      out.santiago = entry;
      out.stgo = entry;
    }
  }

  out.__options = options
    .filter((x) => x.ciudad && x.tmax !== null)
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad, "es"));

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

function parseEmaWindMax(html) {
  const text = stripAccents(normalizeText(html.replace(/<[^>]+>/g, " "))).toLowerCase();
  const section = text.match(/viento maximo[\s\S]*?hoy\s+([\s\S]*?)ayer/);
  if (section?.[1]) {
    const pairs = [...section[1].matchAll(/\b\d{1,3}\/(\d+(?:[,.]\d+)?)/g)];
    // pairs[0] = kt, pairs[1] = km/h
    if (pairs[1]?.[1]) return toNumber(pairs[1][1]);
  }
  return null;
}

function cityFromStationName(stationName, rowText = "") {
  const clean = stationKey(`${stationName} ${rowText}`);

  if (clean.includes("canal bajo") && clean.includes("osorno")) return "Osorno";
  if (clean.includes("canal bajo osorno")) return "Osorno";
  if (clean.includes("carlos ibanez") && clean.includes("punta arenas")) return "Punta Arenas";
  if (clean.includes("carlos ibanez punta arenas")) return "Punta Arenas";

  for (const [key, city] of BOLETIN_STATIONS) {
    const k = stationKey(key);
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

    const rowText = cells.join(" ");
    const city = cityFromStationName(cells[0], rowText);
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

async function buildStationRow(station, pronostico, boletin) {
  let tact = null;
  let viento_max = null;

  try {
    const emaHtml = await fetchText(EMA_BASE + station.ema);
    tact = parseEmaTemperature(emaHtml);
    viento_max = parseEmaWindMax(emaHtml);
  } catch {
    tact = null;
    viento_max = null;
  }

  const p = pickPronostico(pronostico, station.indices);
  const b = boletin[station.ciudad] || {};

  return {
    ciudad: station.ciudad,
    label: station.label || station.ciudad,
    zona: station.zona,
    tact,
    viento_max,
    tmin: p.tmin ?? b.tmin ?? null,
    tmax: p.tmax ?? null,
    condicion: p.condicion ?? null,
    categoria: p.categoria ?? null,
    pp_dia:  b.pp_dia  ?? null,
    pp_acum: b.pp_acum ?? null,
    def_sup: b.def_sup ?? null,
  };
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

  const santiagoPronostico =
    pronostico.santiago ||
    pronostico.stgo ||
    pickPronostico(pronostico, [
      "stgo", "santiago", "santiagocentro", "santiago-centro", "metropolitana", "rm",
    ]) ||
    Object.values(pronostico).find(
      (p) => Array.isArray(p?.forecast_5d) && p.forecast_5d.length === 5
    ) ||
    {};

  const santiagoStations = await Promise.all(
    SANTIAGO_STATIONS.map((station) => buildStationRow(station, pronostico, boletin))
  );

  const rows = await Promise.all(
    CITIES.map((c) => buildStationRow(c, pronostico, boletin))
  );

  return {
    santiago: {
      quinta_normal: santiagoStations.find((x) => x.ciudad === "Quinta Normal") || null,
      pudahuel:      santiagoStations.find((x) => x.ciudad === "Pudahuel")      || null,
      forecast_5d:   santiagoPronostico.forecast_5d || [],
    },
    data: rows,
    extra_forecast_options: pronostico.__options || [],
  };
}

export default async function handler(req, res) {
  try {
    const result = await buildWeatherJson();
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({
      updated_at: new Date().toISOString(),
      source: "MeteoChile",
      santiago: result.santiago,
      data: result.data,
      extra_forecast_options: result.extra_forecast_options,
    });
  } catch (err) {
    res.status(500).json({
      error: "No se pudo actualizar WeatherLink",
      detail: err?.message || String(err),
    });
  }
}
