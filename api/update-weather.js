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
  { ciudad: "Puerto Montt", zona: "Sur", ema: "410005", indices: ["pmontt"] },
  { ciudad: "Coyhaique", zona: "Sur", ema: "450004", indices: ["coyhaique"] },
  { ciudad: "Punta Arenas", zona: "Sur", ema: "520012", indices: ["parenas"] },
  { ciudad: "Juan Fernández", zona: "Insular", ema: "330031", indices: ["jfernandez"] },
  { ciudad: "Rapa Nui", zona: "Insular", ema: "270001", indices: ["rapanui"] },
  { ciudad: "Rey Jorge", zona: "Insular", ema: "950001", indices: ["antartica"] },
];

function n(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

function normalizarCategoria(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
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
  const r = await fetch(url);
  return await r.text();
}

function parsePronostico(jsText) {
  const blocks = jsText.match(/Pronostico\.push\(\{[\s\S]*?\}\)/g) || [];
  const tramo = tramoHorarioChile();
  const out = {};

  for (const block of blocks) {
    const indice = block.match(/indice\s*:\s*["']([^"']+)["']/)?.[1];
    if (!indice) continue;

    const tempStr =
      block.match(/temperatura\s*:\s*\[\s*["']([^"']+)["']/)?.[1] || "";

    const [minStr, maxStr] = tempStr.split("/");
    const tmin = minStr ? n(minStr) : null;
    const tmax = maxStr ? n(maxStr) : null;

    const textos = [
      ...block.matchAll(/["']([^"']*)["']/g),
    ].map((m) => m[1]);

    const condicion =
      textos[tramo + 1] ||
      textos.find((x) => x?.trim()) ||
      null;

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
  const text = html.replace(/<[^>]+>/g, " ");
  const m =
    text.match(/Temperatura del Aire en °C\s*([\-]?\d+(?:[.,]\d+)?)/i) ||
    text.match(/Temperatura.*?([\-]?\d+(?:[.,]\d+)?)/i);
  return m ? n(m[1]) : null;
}

function parseDirectemarTemperature(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const m = text.match(/Temperatura.*?([\-]?\d+(?:[.,]\d+)?)/i);
  return m ? n(m[1]) : null;
}

async function buildWeatherJson() {
  const [pronosticoText] = await Promise.all([
    fetchText(PRONOSTICO_URL),
  ]);

  const pronostico = parsePronostico(pronosticoText);

  const rows = await Promise.all(
    CITIES.map(async (c) => {
      let tact = null;

      try {
        if (c.directemar) {
          tact = parseDirectemarTemperature(
            await fetchText(DIRECTEMAR_VALPO)
          );
        } else {
          tact = parseEmaTemperature(
            await fetchText(EMA_BASE + c.ema)
          );
        }
      } catch {}

      let p = {};
      for (const idx of c.indices) {
        if (pronostico[idx]) {
          p = pronostico[idx];
          break;
        }
      }

      return {
        ciudad: c.ciudad,
        zona: c.zona,
        tact,
        tmin: p.tmin ?? null,
        tmax: p.tmax ?? null,
        condicion: p.condicion ?? null,
        categoria: p.categoria ?? null,
        pp_dia: null,
        pp_acum: null,
        def_sup: null,
      };
    })
  );

  return rows;
}

export default async function handler(req, res) {
  try {
    const data = await buildWeatherJson();
    res.status(200).json({
      updated_at: new Date().toISOString(),
      source: "MeteoChile + DIRECTEMAR",
      data,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
}
