import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SEGMENT_COLORS = {
  "Budget Shoppers":      { accent: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
  "High Value Champions": { accent: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
  "Mid-Tier Regulars":    { accent: "#6366f1", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.25)"  },
};

const INSIGHT_ICONS = { revenue: "◆", opportunity: "▲", behavior: "●", warning: "⚠" };
const INSIGHT_COLORS = { revenue: "#10b981", opportunity: "#6366f1", behavior: "#f59e0b", warning: "#ef4444" };

// ── tiny bar component ──────────────────────────────────────────────────────
function Bar({ value, max, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 2, height: 5, overflow: "hidden" }}>
      <div style={{
        width: `${(value / max) * 100}%`, height: "100%",
        background: color, borderRadius: 2,
        transition: "width 1s cubic-bezier(.4,0,.2,1)"
      }} />
    </div>
  );
}

// ── number counter animation ────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    const duration = 1200;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}{suffix}</span>;
}

// ── segment card ────────────────────────────────────────────────────────────
function SegmentCard({ seg, maxSpend, maxIncome, maxPurchases, index }) {
  const c = SEGMENT_COLORS[seg.name] || { accent: "#888", bg: "rgba(136,136,136,0.08)", border: "rgba(136,136,136,0.25)" };
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 16, padding: "1.75rem",
      animation: `fadeUp 0.5s ease ${index * 0.1}s both`,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 120, height: 120, borderRadius: "0 16px 0 120px",
        background: `${c.accent}10`
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{seg.icon}</div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{seg.name}</h3>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{seg.description}</p>
        </div>
        <div style={{
          background: c.accent, color: "#000",
          fontSize: "0.7rem", fontWeight: 700,
          padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap"
        }}>
          {seg.percentage}% of base
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Customers", value: seg.count.toLocaleString() },
          { label: "Avg. Age",  value: `${seg.avg_age}y` },
          { label: "Avg. Income", value: `$${(seg.avg_income/1000).toFixed(0)}k` },
          { label: "Purchases/mo", value: seg.avg_purchases },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: c.accent }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Avg. spend</span>
            <span style={{ fontSize: "0.72rem", color: c.accent, fontWeight: 600 }}>${seg.avg_spend.toLocaleString()}</span>
          </div>
          <Bar value={seg.avg_spend} max={maxSpend} color={c.accent} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Web visits/mo</span>
            <span style={{ fontSize: "0.72rem", color: c.accent, fontWeight: 600 }}>{seg.avg_web_visits}x</span>
          </div>
          <Bar value={seg.avg_web_visits} max={10} color={c.accent} />
        </div>
      </div>

      <div style={{
        marginTop: "1.25rem", paddingTop: "1rem",
        borderTop: `1px solid ${c.border}`,
        fontSize: "0.75rem", color: "rgba(255,255,255,0.5)",
        lineHeight: 1.5
      }}>
        <span style={{ color: c.accent, fontWeight: 600 }}>Strategy → </span>{seg.strategy}
      </div>
    </div>
  );
}

// ── predict form ────────────────────────────────────────────────────────────
function PredictForm() {
  const [form, setForm] = useState({
    income: 65000, age: 45, recency: 20, total_spend: 500,
    total_purchases: 12, num_web_visits_month: 5,
    num_deals_purchases: 2, customer_tenure: 800
  });
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const FIELDS = [
    { key: "income",               label: "Annual Income ($)",      min: 0,    max: 200000, step: 1000 },
    { key: "age",                  label: "Age",                    min: 18,   max: 90,     step: 1    },
    { key: "recency",              label: "Days Since Last Purchase",min: 0,   max: 365,    step: 1    },
    { key: "total_spend",          label: "Total Spend ($)",        min: 0,    max: 3000,   step: 10   },
    { key: "total_purchases",      label: "Total Purchases",        min: 0,    max: 50,     step: 1    },
    { key: "num_web_visits_month", label: "Web Visits / Month",     min: 0,    max: 20,     step: 1    },
    { key: "num_deals_purchases",  label: "Deal Purchases",         min: 0,    max: 15,     step: 1    },
    { key: "customer_tenure",      label: "Customer Tenure (days)", min: 0,    max: 4000,   step: 10   },
  ];

  async function handlePredict() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const c = result ? (SEGMENT_COLORS[result.segment_name] || { accent: "#888", bg: "rgba(136,136,136,0.08)", border: "rgba(136,136,136,0.2)" }) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
      {/* inputs */}
      <div style={{ background: "#13161b", border: "1px solid #1f2530", borderRadius: 16, padding: "2rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem", color: "#fff" }}>Customer Profile</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {FIELDS.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", fontFamily: "monospace" }}>
                  {key === "income" || key === "total_spend" ? `$${form[key].toLocaleString()}` : form[key]}
                </span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                style={{ width: "100%", accentColor: "#6366f1" }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={handlePredict}
          disabled={loading}
          style={{
            marginTop: "1.75rem", width: "100%",
            background: loading ? "#1a1e25" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "0.9rem", fontSize: "0.9rem", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s", opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Analysing..." : "Predict Segment →"}
        </button>
        {error && <p style={{ marginTop: "1rem", color: "#ef4444", fontSize: "0.8rem" }}>Error: {error}</p>}
      </div>

      {/* result */}
      <div>
        {!result && (
          <div style={{
            background: "#13161b", border: "1px dashed #1f2530",
            borderRadius: 16, padding: "3rem 2rem",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "1rem", minHeight: 300
          }}>
            <div style={{ fontSize: 48, opacity: 0.2 }}>◎</div>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", textAlign: "center" }}>
              Adjust the sliders and click Predict<br />to classify a customer
            </p>
          </div>
        )}
        {result && c && (
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 16, padding: "2rem",
            animation: "fadeUp 0.4s ease both"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: 36 }}>{result.icon}</span>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Predicted Segment</p>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: c.accent }}>{result.segment_name}</h2>
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              {result.description}
            </p>

            <div style={{
              background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "1rem",
              marginBottom: "1.5rem"
            }}>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Recommended Strategy
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{result.strategy}</p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {result.traits.map(t => (
                <span key={t} style={{
                  background: `${c.accent}18`, color: c.accent,
                  border: `1px solid ${c.accent}40`,
                  fontSize: "0.72rem", fontWeight: 500,
                  padding: "4px 12px", borderRadius: 20
                }}>{t}</span>
              ))}
            </div>

            <p style={{ marginTop: "1.25rem", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>
              {result.confidence_note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main app ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("analytics");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/analytics`)
      .then(r => r.json())
      .then(d => { setAnalytics(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const maxSpend     = analytics ? Math.max(...analytics.segments.map(s => s.avg_spend))     : 1;
  const maxIncome    = analytics ? Math.max(...analytics.segments.map(s => s.avg_income))    : 1;
  const maxPurchases = analytics ? Math.max(...analytics.segments.map(s => s.avg_purchases)) : 1;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#e8eaf0", fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { height: 4px; border-radius: 2px; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0c10; }
        ::-webkit-scrollbar-thumb { background: #1f2530; border-radius: 3px; }
      `}</style>

      {/* ── top bar ── */}
      <header style={{
        borderBottom: "1px solid #1a1f2a",
        padding: "1.25rem 2.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>◈</div>
          <div>
            <h1 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", lineHeight: 1 }}>SegmentIQ</h1>
            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 2, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Customer Intelligence Platform
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
            API LIVE · K-Means · k=3 · n=2,240
          </span>
        </div>
      </header>

      {/* ── hero strip ── */}
      {analytics && (
        <div style={{
          background: "linear-gradient(180deg, #0f1218 0%, #0a0c10 100%)",
          borderBottom: "1px solid #1a1f2a",
          padding: "2rem 2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
        }}>
          {[
            { label: "Total Customers",    value: analytics.total_customers, prefix: "",  suffix: "",  decimals: 0 },
            { label: "Segments Found",     value: analytics.num_segments,    prefix: "",  suffix: "",  decimals: 0 },
            { label: "Silhouette Score",   value: analytics.model_info.silhouette_score * 100, prefix: "", suffix: "%", decimals: 0 },
            { label: "PCA Variance",       value: analytics.model_info.pca_variance_explained * 100, prefix: "", suffix: "%", decimals: 0 },
          ].map(({ label, value, prefix, suffix, decimals }, i) => (
            <div key={label} style={{
              padding: "1.25rem 2rem",
              borderRight: i < 3 ? "1px solid #1a1f2a" : "none",
              animation: `fadeUp 0.5s ease ${i * 0.08}s both`
            }}>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                {label}
              </p>
              <p style={{ fontSize: "2rem", fontWeight: 600, color: "#fff", lineHeight: 1 }}>
                <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── tabs ── */}
      <div style={{ padding: "0 2.5rem", borderBottom: "1px solid #1a1f2a", display: "flex", gap: 0 }}>
        {[
          { id: "analytics", label: "Analytics Dashboard" },
          { id: "predict",   label: "Predict Segment" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1rem 1.5rem",
            fontSize: "0.85rem", fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "#fff" : "rgba(255,255,255,0.35)",
            borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
            transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── content ── */}
      <main style={{ padding: "2.5rem", maxWidth: 1400, margin: "0 auto" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: "2rem", animation: "pulse 1.5s infinite" }}>◎</div>
            <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>Connecting to API...</p>
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12, padding: "1.5rem", color: "#ef4444", fontSize: "0.85rem"
          }}>
            Could not reach the API at <code>{API_URL}</code>. Make sure the server is running.<br />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{error}</span>
          </div>
        )}

        {!loading && !error && analytics && tab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

            {/* segment cards */}
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>
                Customer Segments
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
                {analytics.segments.map((seg, i) => (
                  <SegmentCard key={seg.id} seg={seg} index={i}
                    maxSpend={maxSpend} maxIncome={maxIncome} maxPurchases={maxPurchases} />
                ))}
              </div>
            </div>

            {/* spend comparison visual */}
            <div style={{ background: "#13161b", border: "1px solid #1a1f2a", borderRadius: 16, padding: "2rem" }}>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.75rem" }}>
                Revenue Contribution by Segment
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {analytics.segments.map(seg => {
                  const c = SEGMENT_COLORS[seg.name] || { accent: "#888" };
                  const revenue = seg.count * seg.avg_spend;
                  const totalRevenue = analytics.segments.reduce((a, s) => a + s.count * s.avg_spend, 0);
                  const pct = ((revenue / totalRevenue) * 100).toFixed(1);
                  return (
                    <div key={seg.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: 16 }}>{seg.icon}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#fff" }}>{seg.name}</span>
                          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>{seg.count.toLocaleString()} customers</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: c.accent }}>${(revenue/1000).toFixed(0)}k</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: `linear-gradient(90deg, ${c.accent}, ${c.accent}88)`,
                          borderRadius: 4, transition: "width 1.2s cubic-bezier(.4,0,.2,1)"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* key insights */}
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>
                Key Business Insights
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {analytics.key_insights.map((insight, i) => {
                  const color = INSIGHT_COLORS[insight.type] || "#888";
                  const icon  = INSIGHT_ICONS[insight.type]  || "●";
                  return (
                    <div key={i} style={{
                      background: "#13161b", border: "1px solid #1a1f2a",
                      borderLeft: `3px solid ${color}`,
                      borderRadius: "0 12px 12px 0",
                      padding: "1.25rem 1.5rem",
                      animation: `fadeUp 0.5s ease ${i * 0.1}s both`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        <span style={{ color, fontSize: "0.7rem" }}>{icon}</span>
                        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff" }}>{insight.title}</h3>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{insight.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* model info */}
            <div style={{
              background: "#13161b", border: "1px solid #1a1f2a",
              borderRadius: 16, padding: "1.5rem 2rem",
              display: "flex", gap: "3rem", alignItems: "center", flexWrap: "wrap"
            }}>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Model</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{analytics.model_info.algorithm}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Features Used</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{analytics.model_info.features_used} RFM features</p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Silhouette Score</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#10b981" }}>{analytics.model_info.silhouette_score}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>PCA Variance Explained</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#6366f1" }}>{(analytics.model_info.pca_variance_explained * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Training Records</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{analytics.total_customers.toLocaleString()}</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" style={{
                  background: "rgba(99,102,241,0.15)", color: "#6366f1",
                  border: "1px solid rgba(99,102,241,0.3)",
                  padding: "0.6rem 1.25rem", borderRadius: 8,
                  fontSize: "0.8rem", fontWeight: 600,
                  textDecoration: "none", display: "inline-block"
                }}>View API Docs →</a>
              </div>
            </div>

          </div>
        )}

        {!loading && !error && tab === "predict" && <PredictForm />}

      </main>

      <footer style={{
        borderTop: "1px solid #1a1f2a",
        padding: "1.5rem 2.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>
          Built with FastAPI · Scikit-learn · React · 2,240 customer records
        </p>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
          K-Means Clustering · k=3
        </p>
      </footer>
    </div>
  );
}