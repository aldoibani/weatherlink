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
  { ciudad: "Puerto Montt", zona: "Sur", ema: "410005", indices: ["pmontt"] },
  { ciudad: "Coyhaique", zona: "Sur", ema: "450004", indices: ["coyhaique"] },
  { ciudad: "Punta Arenas", zona: "Sur", ema: "520012", indices: ["parenas"] },
  { ciudad: "Juan Fernández", zona: "Insular", ema: "330031", indices: ["jfernandez"] },
  { ciudad: "Rapa Nui", zona: "Insular", ema: "270001", indices: ["rapanui"] },
  { ciudad: "Rey Jorge", zona: "Insular", ema: "950001", indices: ["antartica"] },
];

function normalizeText(s = "") {
  return String(s)
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAccents(s = "") {
  return normalizeText(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim();
  if (!raw || raw === "-" || /^S\/P$/i.test(raw)) return null;
  const x = Number(raw.replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function normalizarCategoria(texto) {
  if (!texto) return "NUBLADO";
  const t = stripAccents(texto).toLowerCase();
  if (t.includes("despejado")) return "DESPEJADO";
  if (t.includes("parcial")) return "PARCIAL";
  if (t.includes("cubierto")) return "CUBIERTO";
  if (t.includes("chubasco")) return "CHUBASCOS";
  if (t.includes("lluvia")) return "LLUVIA";
  if (t.includes("niebla")) return "NIEBLA";
  return "NUBLADO";
}

function diaNombreChile(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const name = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
  }).format(d);
  return offset === 0
    ? "Hoy"
    : name.charAt(0).toUpperCase() + name.slice(1);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "WeatherLink/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function parsePronostico(jsText) {
  const blocks = jsText.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
  const out = {};

  for (const block of blocks) {
    const indice = block.match(/indice\s*:\s*["']([^"']+)["']/)?.[1];
    if (!indice) continue;

    const ciudad =
      block.match(/ciudad\s*:\s*["']([^"']+)["']/)?.[1] || indice;

    const tempBlock =
      block.match(/temperatura\s*:\s*\[([\s\S]*?)\]/)?.[1] || "";
    const tempItems = [...tempBlock.matchAll(/["']([^"']*)["']/g)].map(
      (m) => normalizeText(m[1])
    );

    const textoBlock =
      block.match(/texto\s*:\s*\[([\s\S]*?)\]\s*,\s*redaccion/)?.[1] || "";
    const textoItems = [...textoBlock.matchAll(/["']([^"']+)["']/g)].map(
      (m) => normalizeText(m[1])
    );

    const forecast_5d = [];
    for (let i = 0; i < 5; i++) {
      const [mn, mx] = String(tempItems[i] || "").split("/");
      const condicion = textoItems[i] || textoItems[0] || "Nublado";
      forecast_5d.push({
        dia: diaNombreChile(i),
        tmin: toNumber(mn),
        tmax: toNumber(mx),
        condicion,
        categoria: normalizarCategoria(condicion),
      });
    }

    out[indice] = {
      ciudad,
      tmin: forecast_5d[0]?.tmin ?? null,
      tmax: forecast_5d[0]?.tmax ?? null,
      condicion: forecast_5d[0]?.condicion ?? null,
      categoria: forecast_5d[0]?.categoria ?? null,
      forecast_5d,
    };
  }

  return out;
}

function parseEmaTemperature(html) {
  const text = normalizeText(html.replace(/<[^>]+>/g, " "));
  const m = text.match(/Temperatura del Aire.*?([\-]?\d+(?:[,.]\d+)?)/i);
  return m ? toNumber(m[1]) : null;
}

function parseEmaWindMax(html) {
  const text = stripAccents(
    normalizeText(html.replace(/<[^>]+>/g, " "))
  ).toLowerCase();

  const section = text.match(/viento maximo[\s\S]*?hoy\s+([\s\S]*?)ayer/);
  if (section?.[1]) {
    const pairs = [...section[1].matchAll(/\b\d{1,3}\/(\d+(?:[,.]\d+)?)/g)];
    if (pairs[1]?.[1]) return toNumber(pairs[1][1]);
  }

  return null;
}

function parseBoletin(html) {
  const out = {};
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((m) => normalizeText(m[1].replace(/<[^>]+>/g, " ")));

    if (cells.length < 10) continue;

    const station = stripAccents(cells[0]).toLowerCase();
    let city = null;

    if (station.includes("chacalluta"))       city = "Arica";
    else if (station.includes("diego aracena")) city = "Iquique";
    else if (station.includes("cerro moreno"))  city = "Antofagasta";
    else if (station.includes("atacama"))       city = "Copiapó";
    else if (station.includes("la florida"))    city = "La Serena";
    else if (station.includes("rodelillo"))     city = "Viña del Mar";
    else if (station.includes("rancagua"))      city = "Rancagua";
    else if (station.includes("talca"))         city = "Talca";
    else if (station.includes("chillan"))       city = "Chillán";
    else if (station.includes("carriel"))       city = "Concepción";
    else if (station.includes("maquehue"))      city = "Temuco";
    else if (station.includes("pichoy"))        city = "Valdivia";
    else if (station.includes("canal bajo"))    city = "Osorno";
    else if (station.includes("tepual"))        city = "Puerto Montt";
    else if (station.includes("balmaceda"))     city = "Coyhaique";
    else if (station.includes("ibanez"))        city = "Punta Arenas";
    else if (station.includes("fernandez"))     city = "Juan Fernández";
    else if (station.includes("mataveri"))      city = "Rapa Nui";
    else if (station.includes("frei"))          city = "Rey Jorge";
    else if (station.includes("quinta normal")) city = "Quinta Normal";
    else if (station.includes("pudahuel"))      city = "Pudahuel";

    if (!city) continue;

    out[city] = {
      tmin:    toNumber(cells[1]),
      pp_dia:  toNumber(cells[5]) ?? 0,
      pp_acum: toNumber(cells[6]),
      def_sup: toNumber(cells[9]),
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
  } catch {}

  const p = pronostico[station.indices[0]] || {};
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

export default async function handler(req, res) {
  try {
    const [pronosticoText, boletinHtml] = await Promise.all([
      fetchText(PRONOSTICO_URL),
      fetchText(BOLETIN_URL),
    ]);

    const pronostico = parsePronostico(pronosticoText);
    const boletin = parseBoletin(boletinHtml);

    const santiagoStations = await Promise.all(
      SANTIAGO_STATIONS.map((s) => buildStationRow(s, pronostico, boletin))
    );

    const rows = await Promise.all(
      CITIES.map((c) => buildStationRow(c, pronostico, boletin))
    );

    const stgoForecast =
      pronostico["stgo"]?.forecast_5d ||
      pronostico["santiago"]?.forecast_5d ||
      [];

    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      updated_at: new Date().toISOString(),
      source: "MeteoChile",
      santiago: {
        quinta_normal:
          santiagoStations.find((x) => x.ciudad === "Quinta Normal") || null,
        pudahuel:
          santiagoStations.find((x) => x.ciudad === "Pudahuel") || null,
        forecast_5d: stgoForecast,
      },
      data: rows,
    });
  } catch (err) {
    res.status(500).json({
      error: "No se pudo actualizar WeatherLink",
      detail: err?.message || String(err),
    });
  }
}
