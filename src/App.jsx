import React, { useEffect, useMemo, useState } from "react";

const C = {
  bg: "#FFFFFF",
  panel: "#F8FAFC",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  blue: "#2563EB",
  orange: "#EA580C",
  green: "#16A34A",
  greenBg: "#DCFCE7",
  red: "#DC2626",
  redBg: "#FEE2E2",
};

const mono = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

const DEFAULT_DATA = [];

const SANTIAGO_5 = [
  { dia: "Hoy", tmin: 7, tmax: 18, categoria: "DESPEJADO", condicion: "Despejado" },
  { dia: "Martes", tmin: 6, tmax: 17, categoria: "PARCIAL", condicion: "Parcial" },
  { dia: "Miércoles", tmin: 5, tmax: 16, categoria: "NUBLADO", condicion: "Nublado" },
  { dia: "Jueves", tmin: 4, tmax: 15, categoria: "PARCIAL", condicion: "Parcial" },
  { dia: "Viernes", tmin: 5, tmax: 17, categoria: "DESPEJADO", condicion: "Despejado" },
];

function fmtT(v) {
  return v === null || v === undefined ? "—" : `${Math.round(v)}°`;
}

function stationName(d) {
  return d.label || d.ciudad || "—";
}

function Icon({ cat, size = 24 }) {
  const common = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size * 0.9,
  };

  switch (cat) {
    case "DESPEJADO":
      return <div style={common}>☀️</div>;
    case "PARCIAL":
    case "ESCASA NUBOSIDAD":
      return <div style={common}>⛅</div>;
    case "NUBLADO":
    case "CUBIERTO":
      return <div style={common}>☁️</div>;
    case "LLUVIA":
    case "LLUVIA DÉBIL":
    case "LLUVIA FUERTE":
    case "LLUVIA INTERMITENTE":
      return <div style={common}>🌧️</div>;
    case "LLOVIZNA":
      return <div style={common}>🌦️</div>;
    case "NIEVE":
    case "AGUANIEVE":
      return <div style={common}>❄️</div>;
    case "TORMENTA ELÉCTRICA":
    case "TORMENTA ELÉCTRICA CON LLUVIA":
      return <div style={common}>⛈️</div>;
    case "NIEBLA":
    case "NEBLINA":
      return <div style={common}>🌫️</div>;
    default:
      return <div style={common}>☁️</div>;
  }
}

export default function App() {
  const [rows, setRows] = useState(DEFAULT_DATA);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [santiagoData, setSantiagoData] = useState({
    quinta_normal: null,
    pudahuel: null,
    forecast_5d: SANTIAGO_5,
  });

  async function handleAutoUpdate() {
    try {
      setLoading(true);
      const res = await fetch("/api/update-weather");
      const payload = await res.json();
      if (payload.data) setRows(payload.data);
      if (payload.updated_at) setUpdatedAt(payload.updated_at);
      if (payload.santiago) setSantiagoData(payload.santiago);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleAutoUpdate();
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of rows) {
      if (!g[r.zona]) g[r.zona] = [];
      g[r.zona].push(r);
    }
    return g;
  }, [rows]);

  const santiagoRows = [santiagoData.quinta_normal, santiagoData.pudahuel].filter(Boolean);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F1F5F9",
      padding: 24,
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: C.text,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* HEADER */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>WeatherLink Chile</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>MeteoChile · EMA · Pronóstico automático</div>
            </div>
            <button
              onClick={handleAutoUpdate}
              disabled={loading}
              style={{
                border: "none",
                background: loading ? "#94A3B8" : C.blue,
                color: "white",
                borderRadius: 12,
                padding: "12px 18px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          {updatedAt && (
            <div style={{ marginTop: 14, fontSize: 12, color: C.muted }}>
              Última actualización: {new Date(updatedAt).toLocaleString("es-CL")}
            </div>
          )}
        </div>

        {/* SANTIAGO */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 18, letterSpacing: "-.02em" }}>Santiago</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 20 }}>
            {santiagoRows.map((d) => {
              const sup = d.def_sup !== null && d.def_sup >= 0;
              return (
                <div key={d.ciudad} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon cat={d.categoria} size={30} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{stationName(d)}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Estación meteorológica</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...mono, fontSize: 26, fontWeight: 800 }}>{fmtT(d.tact)}</div>
                      <div style={{ ...mono, fontSize: 12, marginTop: 3 }}>
                        <span style={{ color: "#60A5FA" }}>{fmtT(d.tmin)}</span>
                        <span style={{ color: C.border, margin: "0 5px" }}>/</span>
                        <span style={{ color: C.orange }}>{fmtT(d.tmax)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>PP hoy</div>
                      <div style={{ ...mono, fontSize: 13, marginTop: 4, color: d.pp_dia && d.pp_dia > 0 ? C.blue : C.text }}>
                        {d.pp_dia === null ? "—" : `${d.pp_dia} mm`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>PP año</div>
                      <div style={{ ...mono, fontSize: 13, marginTop: 4 }}>
                        {d.pp_acum === null ? "—" : `${d.pp_acum} mm`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Vs normal</div>
                      <div style={{ marginTop: 4 }}>
                        {d.def_sup === null ? (
                          <span style={{ fontSize: 12, color: C.muted }}>—</span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            ...mono, color: sup ? C.green : C.red, background: sup ? C.greenBg : C.redBg,
                          }}>
                            {sup ? "▲" : "▼"} {Math.abs(d.def_sup)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PRONÓSTICO 5 DÍAS */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {(santiagoData.forecast_5d?.length ? santiagoData.forecast_5d : SANTIAGO_5).slice(0, 5).map((d, i) => (
              <div key={i} style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "14px 10px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8, minWidth: 92,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {d.dia}
                </div>
                <Icon cat={d.categoria} size={32} />
                <div style={{ fontSize: 10, color: C.muted, textAlign: "center", lineHeight: 1.2, minHeight: 24 }}>
                  {d.condicion || "—"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...mono, color: "#60A5FA", fontSize: 14, fontWeight: 700 }}>{fmtT(d.tmin)}</span>
                  <span style={{ color: C.border, fontSize: 11 }}>/</span>
                  <span style={{ ...mono, color: C.orange, fontSize: 14, fontWeight: 700 }}>{fmtT(d.tmax)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REGIONES */}
        {Object.entries(grouped).map(([zona, list]) => (
          <div key={zona} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{zona}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {list.map((d) => (
                <div key={d.ciudad} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon cat={d.categoria} size={28} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.ciudad}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{d.condicion || "—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...mono, fontSize: 22, fontWeight: 800 }}>{fmtT(d.tact)}</div>
                      <div style={{ ...mono, fontSize: 12, marginTop: 3 }}>
                        <span style={{ color: "#60A5FA" }}>{fmtT(d.tmin)}</span>
                        <span style={{ color: C.border, margin: "0 5px" }}>/</span>
                        <span style={{ color: C.orange }}>{fmtT(d.tmax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
