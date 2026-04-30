import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Color system — one accent per segment
const SEGMENT_STYLE = {
  "High Value Champions": { accent: "#16a34a", label: "Retain"       },
  "Budget Shoppers":      { accent: "#b45309", label: "Convert"      },
  "Occasional Browsers":  { accent: "#1d4ed8", label: "Re-engage"    },
};

// Thin horizontal progress bar
function Bar({ pct, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 3, background: "#e5e7eb", borderRadius: 99 }}>
      <div style={{ width: `${width}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.1s ease" }} />
    </div>
  );
}

// One segment row on the dashboard 
function SegmentRow({ seg, totalRevenue, rank }) {
  const style   = SEGMENT_STYLE[seg.name] || { accent: "#6b7280", label: "—" };
  const revenue = seg.count * seg.avg_spend;
  const revPct  = ((revenue / totalRevenue) * 100).toFixed(1);
  const spendVsAvg = (seg.avg_spend / (totalRevenue / (seg.count || 1))).toFixed(1);

  return (
    <div style={{ borderBottom: "1px solid #f3f4f6", padding: "1.25rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: style.accent, background: `${style.accent}14`, border: `1px solid ${style.accent}30`, padding: "2px 9px", borderRadius: 4, letterSpacing: "0.05em" }}>
            {style.label}
          </span>
          <div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111827" }}>{seg.name}</p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 1 }}>
              {seg.count.toLocaleString()} customers · {seg.percentage}% of base
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>${seg.avg_spend.toLocaleString()}</p>
          <p style={{ fontSize: "0.72rem", color: "#9ca3af" }}>avg spend</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: 10 }}>
        {[
          { label: "Revenue share", value: `${revPct}%` },
          { label: "Avg income",    value: `$${(seg.avg_income / 1000).toFixed(0)}k` },
          { label: "Avg purchases", value: seg.avg_purchases },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: 6, padding: "0.5rem 0.75rem" }}>
            <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", marginTop: 2 }}>{value}</p>
          </div>
        ))}
      </div>

      <Bar pct={parseFloat(revPct)} color={style.accent} />
      <p style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 5 }}>{revPct}% of total revenue</p>
    </div>
  );
}

//  Predict tab
function PredictTab() {
  const [form, setForm] = useState({
    income: 65000, age: 45, recency: 20, total_spend: 500,
    total_purchases: 12, num_web_visits_month: 5,
    num_deals_purchases: 2, customer_tenure: 800,
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const FIELDS = [
    { key: "income",               label: "Annual Income",           unit: "$",  min: 0,  max: 200000, step: 1000 },
    { key: "total_spend",          label: "Total Spend",             unit: "$",  min: 0,  max: 3000,   step: 10   },
    { key: "total_purchases",      label: "Total Purchases",         unit: "",   min: 0,  max: 50,     step: 1    },
    { key: "recency",              label: "Days Since Last Purchase", unit: "d",  min: 0,  max: 365,    step: 1    },
    { key: "num_web_visits_month", label: "Web Visits / Month",      unit: "",   min: 0,  max: 20,     step: 1    },
    { key: "num_deals_purchases",  label: "Deal Purchases",          unit: "",   min: 0,  max: 15,     step: 1    },
    { key: "customer_tenure",      label: "Days as Customer",        unit: "d",  min: 0,  max: 4000,   step: 10   },
    { key: "age",                  label: "Age",                     unit: "yr", min: 18, max: 90,     step: 1    },
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
    clearTimeout(window._pt);
    window._pt = setTimeout(() => predict(next), 500);
  }

  useEffect(() => { predict(form); }, []);

  const style = result ? (SEGMENT_STYLE[result.segment_name] || { accent: "#6b7280" }) : {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
      {/* sliders */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginBottom: 4 }}>Customer profile</h3>
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.25rem" }}>Adjust the sliders — result updates automatically.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {FIELDS.map(({ key, label, unit, min, max, step }) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</label>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>
                  {unit === "$" ? `$${form[key].toLocaleString()}` : `${form[key]}${unit}`}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={form[key]}
                onChange={e => handleChange(key, e.target.value)}
                style={{ width: "100%", accentColor: "#374151", height: 3, cursor: "pointer" }} />
            </div>
          ))}
        </div>
      </div>

      {/* result */}
      <div>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "1rem 1.25rem" }}>
            <p style={{ color: "#dc2626", fontSize: "0.8rem" }}>Could not reach API — {error}</p>
          </div>
        )}
        {result && (
          <div style={{ background: "#fff", border: `1px solid ${style.accent}30`, borderTop: `3px solid ${style.accent}`, borderRadius: 10, padding: "1.5rem" }}>
            <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Predicted segment</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: style.accent, background: `${style.accent}14`, padding: "2px 9px", borderRadius: 4 }}>{style.label}</span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827" }}>{result.segment_name}</h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.65, marginBottom: "1.25rem" }}>{result.description}</p>

            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recommended action</p>
              <p style={{ fontSize: "0.82rem", color: "#374151", lineHeight: 1.65 }}>{result.strategy}</p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {result.traits.map(t => (
                <span key={t} style={{ fontSize: "0.72rem", color: "#6b7280", background: "#f3f4f6", padding: "3px 10px", borderRadius: 4 }}>{t}</span>
              ))}
            </div>
            {loading && <p style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 10 }}>Updating...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

//  Main app
export default function App() {
  const [tab, setTab]         = useState("segments");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const totalRevenue = data ? data.segments.reduce((a, s) => a + s.count * s.avg_spend, 0) : 0;
  const champion     = data ? data.segments.find(s => s.name === "High Value Champions") : null;
  const champRevPct  = champion ? Math.round((champion.count * champion.avg_spend / totalRevenue) * 100) : 0;

  const TABS = [
    { id: "segments",    label: "Segments"       },
    { id: "insights",    label: "Insights"       },
    { id: "actions",     label: "Actions"        },
    { id: "predict",     label: "Predict"        },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: #e5e7eb; border-radius: 99px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #374151; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        @media(max-width: 768px) { .grid-2 { grid-template-columns: 1fr !important; } .hero-row { grid-template-columns: 1fr 1fr !important; } }
      `}</style>

      {/* header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>Customer Segmentation</p>
          <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 1 }}>K-Means · 2,239 customers · 3 segments</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a" }} />
          <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>API connected</span>
        </div>
      </header>

      {/* key stat banner — only shown when data loaded */}
      {champion && (
        <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "0.75rem 2rem" }}>
          <p style={{ fontSize: "0.8rem", color: "#15803d" }}>
            <strong>High Value Champions</strong> make up {champion.percentage}% of customers but generate <strong>{champRevPct}% of total revenue.</strong>
            {" "}Retaining this group is the single highest-ROI action available.
          </p>
        </div>
      )}

      {/* hero metrics */}
      {data && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "1.25rem 2rem" }}>
          <div className="hero-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
            {[
              { label: "Customers",        value: data.total_customers.toLocaleString(), sub: "records analysed"                },
              { label: "Segments found",   value: data.num_segments,                     sub: "distinct groups"                 },
              { label: "Silhouette score", value: data.model_info.silhouette_score,      sub: "cluster quality (0–1 scale)"    },
              { label: "Variance captured",value: `${Math.round(data.model_info.pca_variance_explained * 100)}%`, sub: "by top 2 PCA components" },
            ].map(({ label, value, sub }, i) => (
              <div key={label} style={{ padding: "0.75rem 1.5rem", borderRight: i < 3 ? "1px solid #f3f4f6" : "none" }}>
                <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1.2, margin: "4px 0" }}>{value}</p>
                <p style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 2rem", display: "flex", gap: "0.1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #111827" : "2px solid transparent",
            padding: "0.85rem 1rem", fontSize: "0.82rem", fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "#111827" : "#9ca3af", cursor: "pointer", fontFamily: "inherit",
            transition: "color 0.15s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        {loading && <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Loading...</p>}
        {error   && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "1rem 1.25rem" }}>
            <p style={{ color: "#dc2626", fontSize: "0.82rem" }}>Cannot reach API at {API_URL} — {error}</p>
          </div>
        )}

        {/*  SEGMENTS tab */}
        {!loading && !error && data && tab === "segments" && (
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            {/* segment list */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem" }}>
              <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginBottom: 2 }}>Segment breakdown</h2>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>Ranked by average spend</p>
              {[...data.segments]
                .sort((a, b) => b.avg_spend - a.avg_spend)
                .map((seg, i) => <SegmentRow key={seg.id} seg={seg} totalRevenue={totalRevenue} rank={i + 1} />)}
            </div>

            {/* revenue breakdown */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem" }}>
              <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginBottom: 2 }}>Revenue distribution</h2>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.25rem" }}>Who is actually driving revenue</p>
              {[...data.segments]
                .sort((a, b) => b.avg_spend - a.avg_spend)
                .map(seg => {
                  const style  = SEGMENT_STYLE[seg.name] || { accent: "#6b7280" };
                  const rev    = seg.count * seg.avg_spend;
                  const revPct = ((rev / totalRevenue) * 100).toFixed(1);
                  return (
                    <div key={seg.id} style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#374151" }}>{seg.name}</p>
                        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827" }}>{revPct}%</p>
                      </div>
                      <Bar pct={parseFloat(revPct)} color={style.accent} />
                      <p style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 4 }}>
                        ${(rev / 1000).toFixed(0)}k total · {seg.count.toLocaleString()} customers
                      </p>
                    </div>
                  );
                })}

              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "1rem", marginTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>The concentration problem</p>
                <p style={{ fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.65 }}>
                  High Value Champions are {champion?.percentage}% of customers but drive {champRevPct}% of revenue.
                  A marketing strategy that treats all customers equally is actively wasting budget.
                </p>
              </div>
            </div>
          </div>
        )}

        {/*  INSIGHTS tab */}
        {!loading && !error && data && tab === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 720 }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>What the data tells us</h2>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 3 }}>Findings pulled directly from the model output — no estimates.</p>
            </div>
            {data.key_insights.map((ins, i) => {
              const leftColor = { revenue: "#16a34a", opportunity: "#1d4ed8", behavior: "#b45309", warning: "#dc2626" }[ins.type] || "#6b7280";
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderLeft: `3px solid ${leftColor}`, borderRadius: "0 8px 8px 0", padding: "1.1rem 1.35rem" }}>
                  <p style={{ fontSize: "0.65rem", color: leftColor, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>{ins.type}</p>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginBottom: 6 }}>{ins.title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.65 }}>{ins.detail}</p>
                </div>
              );
            })}
          </div>
        )}

        {/*  ACTIONS tab  */}
        {!loading && !error && data && tab === "actions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 720 }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>What to do next</h2>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 3 }}>Three actions ranked by business impact.</p>
            </div>
            {[
              {
                rank: "01", color: "#16a34a", tag: "Highest priority",
                title: "Retain High Value Champions",
                why: `They are ${champion?.percentage}% of your customer base but drive ${champRevPct}% of revenue. Losing even a small number has an immediate financial impact.`,
                how: "Loyalty rewards, early product access, and personal outreach. These customers respond to feeling recognised — not discounts.",
                metric: `${champRevPct}% of revenue depends on this segment`
              },
              {
                rank: "02", color: "#1d4ed8", tag: "Growth opportunity",
                title: "Upsell Budget Shoppers",
                why: "They purchase 16 times on average but nearly 5 of those are deal-driven. The purchase intent is there — the margin is leaking through discounts.",
                how: "Introduce a loyalty programme that replaces discount dependency with points-based rewards. Reduces margin erosion while maintaining purchase frequency.",
                metric: "A 20% reduction in deal purchases directly improves profit per customer"
              },
              {
                rank: "03", color: "#b45309", tag: "Low-cost channel",
                title: "Re-engage Occasional Browsers",
                why: "Highest web visits but lowest spend at $98. They know the brand — they just haven't converted. Over-investing here has a poor return.",
                how: "Low-cost email re-engagement and time-limited entry offers. Test on the most active browsers first before scaling spend.",
                metric: "Moving 10% into Budget Shoppers adds volume at near-zero acquisition cost"
              },
            ].map(({ rank, color, tag, title, why, how, metric }) => (
              <div key={rank} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem", display: "flex", gap: "1.25rem" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e5e7eb", fontFamily: "monospace", flexShrink: 0, lineHeight: 1 }}>{rank}</p>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color, background: `${color}10`, border: `1px solid ${color}25`, padding: "2px 9px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{tag}</span>
                  </div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111827", marginBottom: 10 }}>{title}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Why it matters</p>
                      <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.65 }}>{why}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>How to do it</p>
                      <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.65 }}>{how}</p>
                    </div>
                    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 6, padding: "0.6rem 0.9rem" }}>
                      <p style={{ fontSize: "0.78rem", color, fontWeight: 600 }}>{metric}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/*  PREDICT tab  */}
        {!loading && !error && tab === "predict" && <PredictTab />}
      </main>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.68rem", color: "#9ca3af" }}>FastAPI · Scikit-learn · React · K-Means k=3 · 2,239 records</p>
        <a href="https://godfreyadembesa.vercel.app" target="_blank" rel="noreferrer"
          style={{ fontSize: "0.72rem", color: "#374151", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid #d1d5db", paddingBottom: 1 }}>
          godfreyadembesa.vercel.app →
        </a>
      </footer>
    </div>
  );
}