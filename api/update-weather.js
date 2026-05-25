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
    indices: ["stgo"],
  },
  {
    key: "pudahuel",
    ciudad: "Pudahuel",
    label: "Pudahuel",
    zona: "Santiago",
    ema: "330021",
    indices: ["stgo"],
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
  { ciudad: "Puerto Montt", zona: "Sur", ema: "410005", indices: ["pmontt"] },
  { ciudad: "Coyhaique", zona: "Sur", ema: "450004", indices: ["coyhaique"] },
  { ciudad: "Punta Arenas", zona: "Sur", ema: "520012", indices: ["parenas"] },

  { ciudad: "Juan Fernández", zona: "Insular", ema: "330031", indices: ["jfernandez"] },
  { ciudad: "Rapa Nui", zona: "Insular", ema: "270001", indices: ["rapanui"] },
  { ciudad: "Rey Jorge", zona: "Insular", ema: "950001", indices: ["reyjorge"] },
];

function normalizeText(s = "") {
  return String(s)
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
  if (!raw || raw === "-" || raw === ".") return null;
  const x = Number(raw.replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : null;
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
  if (t.includes("llovizna")) return "LLOVIZNA";
  if (t.includes("lluvia") || t.includes("chubascos")) return "LLUVIA";
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function parsePronostico(jsText) {
  const blocks = jsText.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
  const tramo = tramoHorarioChile();
  const out = {};

  for (const block of blocks) {
    const indice = block.match(/indice\s*:\s*["']([^"']+)["']/)?.[1];
    if (!indice) continue;

    const ciudad =
      block.match(/ciudad\s*:\s*["']([^"']+)["']/)?.[1] || indice;

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

    out[indice] = {
      indice,
      ciudad,
      tmin: parseMaybeNumber(minHoy),
      tmax: parseMaybeNumber(maxHoy),
      condicion: condicionHoy,
      categoria: normalizarCategoria(condicionHoy),
      forecast_5d,
    };
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
  const match = text.match(/Temperatura del Aire.*?([\-]?\d+(?:[,.]\d+)?)/i);
  return match ? toNumber(match[1]) : null;
}

function parseEmaWindMax(html) {
  const text = stripAccents(normalizeText(html.replace(/<[^>]+>/g, " "))).toLowerCase();
  const section = text.match(/viento maximo[\s\S]*?hoy\s+([\s\S]*?)ayer/);
  if (section?.[1]) {
    const pairs = [...section[1].matchAll(/\b\d{1,3}\/(\d+(?:[,.]\d+)?)/g)];
    if (pairs[1]?.[1]) return toNumber(pairs[1][1]);
  }
  return null;
}

async function buildStationRow(station, pronostico) {
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

  return {
    ciudad: station.ciudad,
    label: station.label || station.ciudad,
    zona: station.zona,
    tact,
    viento_max,
    tmin: p.tmin ?? null,
    tmax: p.tmax ?? null,
    condicion: p.condicion ?? null,
    categoria: p.categoria ?? null,
  };
}

async function buildWeatherJson() {
  const pronosticoText = await fetchText(PRONOSTICO_URL);
  const pronostico = parsePronostico(pronosticoText);

  const santiagoPronostico =
    pronostico.stgo || pickPronostico(pronostico, ["stgo"]) || {};

  const santiagoStations = await Promise.all(
    SANTIAGO_STATIONS.map((station) => buildStationRow(station, pronostico))
  );

  const rows = await Promise.all(
    CITIES.map((c) => buildStationRow(c, pronostico))
  );

  return {
    santiago: {
      quinta_normal: santiagoStations.find((x) => x.ciudad === "Quinta Normal") || null,
      pudahuel:      santiagoStations.find((x) => x.ciudad === "Pudahuel")      || null,
      forecast_5d:   santiagoPronostico.forecast_5d || [],
    },
    data: rows,
  };
}

export default async function handler(req, res) {
  try {
    const result = await buildWeatherJson();
    res.status(200).json({
      updated_at: new Date().toISOString(),
      source: "MeteoChile",
      santiago: result.santiago,
      data: result.data,
    });
  } catch (err) {
    res.status(500).json({
      error: "No se pudo actualizar WeatherLink",
      detail: err?.message || String(err),
    });
  }
}
