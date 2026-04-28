import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SEGMENTS_META = {
  "Budget Shoppers": {
    accent: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)",
    icon: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
    action: "Use discounts carefully — this group browses a lot but buys little. Flash sales and re-engagement emails work best. Don't over-invest here.",
    actionType: "caution",
    clvMultiplier: 0.3,
    churnRisk: "High",
    churnColor: "#ef4444",
    engagementLevel: 0.72,
    description: "Price-sensitive browsers who visit often but convert rarely.",
  },
  "High Value Champions": {
    accent: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)",
    icon: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    action: "Protect these customers at all costs. Offer loyalty rewards, early access, and exclusive bundles. Losing one costs 12× more than keeping them.",
    actionType: "priority",
    clvMultiplier: 3.8,
    churnRisk: "Low",
    churnColor: "#10b981",
    engagementLevel: 0.91,
    description: "Your highest spenders — frequent buyers who drive most of your revenue.",
  },
  "Mid-Tier Regulars": {
    accent: "#6366f1", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.18)",
    icon: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    action: "Biggest growth opportunity. They earn well but spend moderately. Personalized recommendations and upsell campaigns can move them toward Champions.",
    actionType: "opportunity",
    clvMultiplier: 1.9,
    churnRisk: "Medium",
    churnColor: "#f59e0b",
    engagementLevel: 0.58,
    description: "Well-earning customers who are underengaged — strong upsell potential.",
  },
};

const ACTION_STYLES = {
  priority:    { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  color: "#10b981", label: "Priority" },
  opportunity: { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.2)",  color: "#6366f1", label: "Opportunity" },
  caution:     { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  color: "#f59e0b", label: "Caution" },
};

// ── quality badge helper ─────────────────────────────────────────────────────
function qualityLabel(score) {
  if (score < 25) return { label: "Needs work",    color: "#ef4444", bg: "rgba(239,68,68,0.1)",    tip: "Segments overlap significantly. Consider more features." };
  if (score < 50) return { label: "Good",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   tip: "Groups are reasonably distinct — results are actionable." };
  return              { label: "Strong",           color: "#10b981", bg: "rgba(16,185,129,0.1)",   tip: "Segments are well-separated and highly reliable." };
}

// ── small bar ────────────────────────────────────────────────────────────────
function Bar({ pct, color, height = 6 }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(pct), 100); }, [pct]);
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.3s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

// ── animated counter ─────────────────────────────────────────────────────────
function Count({ to, prefix = "", suffix = "", decimals = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let n = 0; const end = parseFloat(to);
    const step = (end / 900) * 16;
    const t = setInterval(() => { n += step; if (n >= end) { setV(end); clearInterval(t); } else setV(n); }, 16);
    return () => clearInterval(t);
  }, [to]);
  return <>{prefix}{decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()}{suffix}</>;
}

// ── segment card ─────────────────────────────────────────────────────────────
function SegmentCard({ seg, allSegments, index }) {
  const m   = SEGMENTS_META[seg.name] || {};
  const c   = m.accent || "#888";
  const avg = allSegments.reduce((a, s) => a + s.avg_spend, 0) / allSegments.length;
  const mult = (seg.avg_spend / avg).toFixed(1);
  const multLabel = mult > 1 ? `${mult}× avg spend` : `${(avg / seg.avg_spend).toFixed(1)}× below avg`;
  const multColor = mult > 1 ? "#10b981" : "#ef4444";
  const totalRev  = allSegments.reduce((a, s) => a + s.count * s.avg_spend, 0);
  const myRev     = seg.count * seg.avg_spend;
  const revShare  = ((myRev / totalRev) * 100).toFixed(0);
  const as        = ACTION_STYLES[m.actionType] || ACTION_STYLES.caution;
  const clv       = Math.round(seg.avg_spend * (m.clvMultiplier || 1) * 12);

  return (
    <div style={{
      background: m.bg, border: `1px solid ${m.border}`, borderRadius: 18,
      padding: "1.6rem", display: "flex", flexDirection: "column", gap: "1.2rem",
      animation: `fadeUp 0.5s ease ${index * 0.1}s both`,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${c}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: `${c}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {m.icon && m.icon(c)}
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{seg.name}</h3>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.4 }}>{m.description}</p>
          </div>
        </div>
        <span style={{ background: c, color: "#000", fontSize: "0.7rem", fontWeight: 700, padding: "4px 11px", borderRadius: 99, flexShrink: 0 }}>
          {seg.percentage}%
        </span>
      </div>

      {/* key numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {[
          { label: "Customers",       value: seg.count.toLocaleString() },
          { label: "Revenue share",   value: `${revShare}%`, highlight: true },
          { label: "Avg. spend",      value: `$${seg.avg_spend.toLocaleString()}` },
          { label: "Est. lifetime value", value: `$${clv.toLocaleString()}` },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "0.65rem 0.9rem" }}>
            <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: highlight ? c : "#fff" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* comparison tag */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: multColor, background: `${multColor}12`, border: `1px solid ${multColor}28`, padding: "3px 10px", borderRadius: 99 }}>
          {multLabel}
        </span>
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.28)" }}>
          Churn risk: <span style={{ color: m.churnColor, fontWeight: 600 }}>{m.churnRisk}</span>
        </span>
      </div>

      {/* engagement bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Engagement level</span>
          <span style={{ fontSize: "0.68rem", color: c, fontWeight: 600 }}>{Math.round((m.engagementLevel || 0) * 100)}%</span>
        </div>
        <Bar pct={(m.engagementLevel || 0) * 100} color={c} />
      </div>

      {/* revenue share bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue contribution</span>
          <span style={{ fontSize: "0.68rem", color: c, fontWeight: 600 }}>{revShare}%</span>
        </div>
        <Bar pct={parseFloat(revShare)} color={c} />
      </div>

      {/* action box */}
      <div style={{ background: as.bg, border: `1px solid ${as.border}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
        <p style={{ fontSize: "0.65rem", color: as.color, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 4 }}>
          {as.label} →
        </p>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{m.action}</p>
      </div>
    </div>
  );
}

// ── predict tab ──────────────────────────────────────────────────────────────
function PredictTab() {
  const [form, setForm] = useState({
    income: 65000, age: 45, recency: 20, total_spend: 500,
    total_purchases: 12, num_web_visits_month: 5,
    num_deals_purchases: 2, customer_tenure: 800,
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const debounceRef = useRef(null);

  const FIELDS = [
    { key: "income",               label: "Annual Income",            unit: "$",  min: 0,  max: 200000, step: 1000, tip: "Higher income correlates with champion segment" },
    { key: "total_spend",          label: "Total Spend to Date",      unit: "$",  min: 0,  max: 3000,   step: 10,   tip: "Key driver — most important feature" },
    { key: "total_purchases",      label: "Total Purchases",          unit: "",   min: 0,  max: 50,     step: 1,    tip: "How many times they've bought" },
    { key: "recency",              label: "Days Since Last Purchase",  unit: "d",  min: 0,  max: 365,    step: 1,    tip: "Lower = more recently active" },
    { key: "num_web_visits_month", label: "Web Visits per Month",     unit: "",   min: 0,  max: 20,     step: 1,    tip: "Budget shoppers visit most" },
    { key: "num_deals_purchases",  label: "Deal Purchases",           unit: "",   min: 0,  max: 15,     step: 1,    tip: "High = price-sensitive" },
    { key: "customer_tenure",      label: "Days as Customer",         unit: "d",  min: 0,  max: 4000,   step: 10,   tip: "How long they've been with you" },
    { key: "age",                  label: "Age",                      unit: "yr", min: 18, max: 90,     step: 1,    tip: "" },
  ];

  async function predict(f) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleChange(key, value) {
    const next = { ...form, [key]: parseFloat(value) };
    setForm(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => predict(next), 600);
  }

  useEffect(() => { predict(form); }, []);

  const m  = result ? (SEGMENTS_META[result.segment_name] || {}) : {};
  const c  = m.accent || "#6366f1";
  const as = m.actionType ? ACTION_STYLES[m.actionType] : null;

  // simple confidence proxy based on spend + purchases
  const conf = result ? Math.min(95, Math.round(60 + (form.total_spend / 3000) * 20 + (form.total_purchases / 50) * 15)) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
      {/* sliders */}
      <div style={{ background: "#12151b", border: "1px solid #1d2230", borderRadius: 18, padding: "1.75rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "0.35rem" }}>Build a customer profile</h3>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Adjust the sliders — the prediction updates automatically as you move them.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {FIELDS.map(({ key, label, unit, min, max, step, tip }) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>{label}</label>
                  {tip && <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{tip}</p>}
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>
                  {unit === "$" ? `$${form[key].toLocaleString()}` : `${form[key]}${unit}`}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={form[key]}
                onChange={e => handleChange(key, e.target.value)}
                style={{ width: "100%", accentColor: "#6366f1", height: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* result */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loading && !result && (
          <div style={{ background: "#12151b", border: "1px solid #1d2230", borderRadius: 18, padding: "2.5rem", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", animation: "pulse 1.5s infinite" }}>Analysing profile...</p>
          </div>
        )}
        {result && (
          <>
            {/* prediction card */}
            <div style={{ background: m.bg || "rgba(99,102,241,0.06)", border: `1px solid ${m.border || "rgba(99,102,241,0.2)"}`, borderRadius: 18, padding: "1.75rem", animation: "fadeUp 0.35s ease both" }}>
              <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>Predicted segment</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: `${c}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {m.icon && m.icon(c)}
                </div>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: c, lineHeight: 1.1 }}>{result.segment_name}</h2>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{m.description}</p>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", marginBottom: 2 }}>Confidence</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 800, color: c }}>{conf}%</p>
                </div>
              </div>

              {/* why box */}
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "0.9rem 1rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Why this segment?</p>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65 }}>
                  {result.segment_name === "High Value Champions" &&
                    `This customer has a high total spend ($${form.total_spend.toLocaleString()}) and makes frequent purchases — the clearest signals of a champion.`}
                  {result.segment_name === "Budget Shoppers" &&
                    `High web visits (${form.num_web_visits_month}/mo) and low spend ($${form.total_spend.toLocaleString()}) point to price-sensitive browsing behaviour.`}
                  {result.segment_name === "Mid-Tier Regulars" &&
                    `Good income ($${form.income.toLocaleString()}) but moderate spend ($${form.total_spend.toLocaleString()}) — this customer has untapped purchasing potential.`}
                </p>
              </div>

              {/* traits */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {result.traits.map(t => (
                  <span key={t} style={{ background: `${c}14`, color: c, border: `1px solid ${c}30`, fontSize: "0.7rem", fontWeight: 600, padding: "4px 12px", borderRadius: 99 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* recommended action */}
            {as && (
              <div style={{ background: as.bg, border: `1px solid ${as.border}`, borderRadius: 14, padding: "1.25rem 1.5rem", animation: "fadeUp 0.4s ease 0.1s both" }}>
                <p style={{ fontSize: "0.65rem", color: as.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Recommended action</p>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>{m.action}</p>
              </div>
            )}

            {loading && (
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", textAlign: "center", animation: "pulse 1.5s infinite" }}>Updating...</p>
            )}
          </>
        )}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "1rem 1.25rem" }}>
            <p style={{ color: "#ef4444", fontSize: "0.8rem" }}>Could not reach API — {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]       = useState("dashboard");
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const totalRev = data ? data.segments.reduce((a, s) => a + s.count * s.avg_spend, 0) : 0;
  const champion = data ? data.segments.find(s => s.name === "High Value Champions") : null;
  const champRev = champion ? Math.round(((champion.count * champion.avg_spend) / totalRev) * 100) : 0;
  const quality  = data ? qualityLabel(data.model_info.silhouette_score * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", color: "#e4e7ef", fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes shimmer { 0%{opacity:.3} 50%{opacity:.6} 100%{opacity:.3} }
        input[type=range]{ -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.08); border-radius:99px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#6366f1; border:2px solid #fff; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0b0d12} ::-webkit-scrollbar-thumb{background:#1f2535;border-radius:2px}
        @media(max-width:900px){
          .seg-grid{grid-template-columns:1fr!important}
          .ins-grid{grid-template-columns:1fr!important}
          .hero-grid{grid-template-columns:1fr 1fr!important}
          .hdr{flex-direction:column!important;align-items:flex-start!important;gap:.75rem!important}
          .main{padding:1.25rem!important}
          .hero{padding:1.25rem!important}
        }
        @media(max-width:480px){
          .hero-grid{grid-template-columns:1fr 1fr!important}
          .tab-label{display:none}
        }
      `}</style>

      {/* ── top bar ── */}
      <header style={{ borderBottom: "1px solid #181d28", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>SegmentIQ</p>
            <p style={{ fontSize: "0.68rem", background: "linear-gradient(90deg,#6366f1,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Customer Intelligence</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2.5s infinite" }} />
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>API live</span>
        </div>
      </header>

      {/* ── key insight banner ── */}
      {champion && (
        <div style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.08) 100%)", borderBottom: "1px solid rgba(16,185,129,0.15)", padding: "0.85rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
            <span style={{ color: "#10b981", fontWeight: 700 }}>Key insight: </span>
            High Value Champions generate <span style={{ color: "#fff", fontWeight: 700 }}>{champRev}% of total revenue</span> while being only {champion.percentage}% of your customer base.
            {" "}<span style={{ color: "rgba(255,255,255,0.42)" }}>They are your most critical segment to protect.</span>
          </p>
        </div>
      )}

      {/* ── hero metrics ── */}
      {data && (
        <div className="hero" style={{ borderBottom: "1px solid #181d28", padding: "1.5rem 2rem" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px" }}>
            {[
              { label: "Customers analysed", value: data.total_customers, suffix: "",   color: "#fff",    sub: "Across 3 distinct behavioural groups" },
              { label: "Segment quality",     value: data.model_info.silhouette_score * 100, suffix: "%", color: quality?.color, sub: quality?.tip },
              { label: "Revenue explained",   value: data.model_info.pca_variance_explained * 100, suffix: "%", color: "#f59e0b", sub: "Of spending patterns captured by the model" },
              { label: "Est. total revenue",  value: Math.round(totalRev / 1000), prefix: "$", suffix: "k", color: "#10b981", sub: "Combined avg. spend across all segments" },
            ].map(({ label, value, prefix = "", suffix, color, sub }, i) => (
              <div key={label} style={{ padding: "1rem 1.5rem", borderRight: i < 3 ? "1px solid #181d28" : "none" }}>
                <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>
                  <Count to={value} prefix={prefix} suffix={suffix} />
                </p>
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)", lineHeight: 1.4 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── tabs ── */}
      <div style={{ borderBottom: "1px solid #181d28", padding: "0 1.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {[
          { id: "dashboard", label: "Dashboard",          color: "#6366f1" },
          { id: "predict",   label: "Predict a Customer", color: "#10b981" },
          { id: "actions",   label: "What to Do Next",    color: "#f59e0b" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `linear-gradient(135deg, ${t.color}22, ${t.color}0a)` : "none",
            border: tab === t.id ? `1px solid ${t.color}40` : "1px solid transparent",
            cursor: "pointer", borderRadius: 99, margin: "0.6rem 0.25rem",
            padding: "0.55rem 1.35rem", fontFamily: "inherit",
            fontSize: "0.85rem", fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? t.color : "rgba(255,255,255,0.35)",
            transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── main content ── */}
      <main className="main" style={{ padding: "2rem", maxWidth: 1360, margin: "0 auto" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.85rem", animation: "shimmer 1.5s infinite" }}>Loading customer data...</p>
          </div>
        )}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
            <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>Could not reach the API at <code>{API_URL}</code></p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: 4 }}>{error}</p>
          </div>
        )}

        {/* ── dashboard tab ── */}
        {!loading && !error && data && tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            <div>
              <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Customer segments</p>
              <div className="seg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
                {data.segments.map((seg, i) => <SegmentCard key={seg.id} seg={seg} allSegments={data.segments} index={i} />)}
              </div>
            </div>

            {/* revenue story */}
            <div style={{ background: "#12151b", border: "1px solid #1d2230", borderRadius: 18, padding: "1.75rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>Where your revenue actually comes from</h3>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                Most businesses treat all customers equally. This shows you why that's a mistake.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.segments.map(seg => {
                  const m   = SEGMENTS_META[seg.name] || {};
                  const rev = seg.count * seg.avg_spend;
                  const pct = ((rev / totalRev) * 100).toFixed(1);
                  return (
                    <div key={seg.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${m.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {m.icon && m.icon(m.accent)}
                          </div>
                          <div>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>{seg.name}</p>
                            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)" }}>{seg.count.toLocaleString()} customers · {seg.percentage}% of base</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "0.92rem", fontWeight: 700, color: m.accent }}>${(rev / 1000).toFixed(0)}k</p>
                          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)" }}>{pct}% of revenue</p>
                        </div>
                      </div>
                      <Bar pct={parseFloat(pct)} color={m.accent} height={10} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* insights */}
            <div>
              <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Business insights</p>
              <div className="ins-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                {data.key_insights.map((ins, i) => {
                  const colors = { revenue: "#10b981", opportunity: "#6366f1", behavior: "#f59e0b", warning: "#ef4444" };
                  const color  = colors[ins.type] || "#888";
                  return (
                    <div key={i} style={{
                      background: "#12151b", border: "1px solid #1d2230",
                      borderLeft: `3px solid ${color}`, borderRadius: "0 14px 14px 0",
                      padding: "1.1rem 1.35rem", animation: `fadeUp 0.5s ease ${i*0.08}s both`
                    }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>{ins.title}</h4>
                      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{ins.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── predict tab ── */}
        {!loading && !error && tab === "predict" && <PredictTab />}

        {/* ── actions tab ── */}
        {!loading && !error && data && tab === "actions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 780 }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>What should you do next?</h2>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                Based on the segmentation, here are the three most impactful things a marketing team can do right now.
              </p>
            </div>
            {[
              {
                rank: "01", color: "#10b981", urgency: "Highest priority",
                title: "Protect your High Value Champions",
                why: "They generate the majority of your revenue from a third of your customers. Losing even a small number has an outsized financial impact.",
                how: "Launch a loyalty programme — exclusive early access, personal account managers, VIP bundles. These customers respond to feeling valued, not discounts.",
                metric: `~${champRev}% of revenue at risk if churn rises`
              },
              {
                rank: "02", color: "#6366f1", urgency: "Growth opportunity",
                title: "Convert Mid-Tier Regulars into Champions",
                why: "They earn well and already buy regularly — they're the closest segment to Champions. A small nudge can unlock significant revenue.",
                how: "Personalised product recommendations based on past purchases. Upsell campaigns with clear value propositions. Avoid generic discounts — they respond to relevance, not price.",
                metric: "~$539 additional revenue per converted customer"
              },
              {
                rank: "03", color: "#f59e0b", urgency: "Be selective",
                title: "Re-engage Budget Shoppers carefully",
                why: "They're the largest group but generate the least revenue per head. Over-investing here drains budget.",
                how: "Use low-cost channels — email re-engagement, flash sales, app push notifications. Test small campaigns before scaling. Focus on converting the most active browsers first.",
                metric: "45% of base, but lowest return on marketing spend"
              },
            ].map(({ rank, color, urgency, title, why, how, metric }) => (
              <div key={rank} style={{ background: "#12151b", border: "1px solid #1d2230", borderRadius: 18, padding: "1.75rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color, opacity: 0.3, fontFamily: "monospace", lineHeight: 1, flexShrink: 0 }}>{rank}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.65rem", color, background: `${color}14`, border: `1px solid ${color}28`, padding: "3px 10px", borderRadius: 99, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{urgency}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Why it matters</p>
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{why}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>How to do it</p>
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{how}</p>
                    </div>
                    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 8, padding: "0.6rem 0.9rem", marginTop: 4 }}>
                      <p style={{ fontSize: "0.75rem", color, fontWeight: 600 }}>{metric}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid #181d28", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.15)" }}>Built with FastAPI · Scikit-learn · React · 2,240 customer records · K-Means k=3</p>
        <a href="https://godfreyadembesa.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#6366f1", textDecoration: "none", fontWeight: 600, borderBottom: "1px solid rgba(99,102,241,0.3)", paddingBottom: 1 }}>godfreyadembesa.vercel.app →</a>
      </footer>
    </div>
  );
}