
import streamlit as st
import requests

# railway public url - replace with your actual deployed url
API_URL = "https://customersegmentation-production-4685.up.railway.app"

st.set_page_config(
    page_title="SegmentIQ — Customer Segmentation",
    page_icon="📊",
    layout="wide"
)

# page styling with mobile breakpoints so it works on all screen sizes
st.markdown("""
<style>
    /* desktop: comfortable padding, capped width */
    .block-container {
        padding-top: 2rem;
        padding-left: 3rem;
        padding-right: 3rem;
        max-width: 1100px;
        margin: auto;
    }

    /* tablet and phone: tighten the side padding */
    @media (max-width: 768px) {
        .block-container {
            padding-left: 1rem;
            padding-right: 1rem;
        }

        /* cards go full width and reduce inner padding on small screens */
        .section-card {
            padding: 1rem 1.1rem !important;
        }

        /* insight strips stay readable on narrow screens */
        .insight-strip {
            padding: 0.75rem 0.9rem !important;
        }
    }

    .section-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem 1.75rem;
        margin-bottom: 1.25rem;
    }

    .insight-strip {
        border-left: 5px solid;
        padding: 1rem 1.25rem;
        border-radius: 0 10px 10px 0;
        background: #fafafa;
        margin-bottom: 1rem;
    }

    .label-tag {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 5px;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .footer-note {
        font-size: 0.72rem;
        color: #9ca3af;
        text-align: center;
        padding-top: 1rem;
    }

    /* make metric numbers slightly smaller on phones so they don't overflow */
    @media (max-width: 480px) {
        [data-testid="metric-container"] {
            font-size: 0.85rem;
        }
    }
</style>
""", unsafe_allow_html=True)


# pull analytics from the api and cache for 5 minutes so page loads fast
@st.cache_data(ttl=300)
def get_analytics():
    try:
        r = requests.get(f"{API_URL}/analytics", timeout=8)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        st.error(f"Could not reach the API. Check your Railway deployment. ({e})")
        return None


# send customer inputs to the model and get back the segment prediction
def call_predict(payload):
    try:
        r = requests.post(f"{API_URL}/predict", json=payload, timeout=8)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        st.error(f"Prediction failed. ({e})")
        return None


# page header
st.markdown("## 📊 SegmentIQ — Customer Segmentation")
st.markdown(
    "Built on K-Means clustering trained on **2,239 customers** "
    "across **8 behavioral signals**: income, total spend, number of purchases, "
    "deal purchases, web visits per month, days since last purchase, customer tenure, and age."
)

st.divider()

# problem statement — first thing stakeholders read
st.markdown("""
<div class="section-card">
<h4>Why this exists</h4>
<p>
Most businesses send the same email, the same discount, and the same message to every customer.
That burns budget on people who will never spend and ignores the customers who actually drive revenue.
</p>
<p>
This tool groups customers by how they actually behave and gives a clear recommendation for each group.
Marketing budget goes to the right people, revenue from top customers is protected, and low-cost actions are identified for everyone else.
</p>
</div>
""", unsafe_allow_html=True)

data = get_analytics()

# navigation tabs — bold so they are easy to scan
tab1, tab2, tab3, tab4 = st.tabs(["**Overview**", "**Customer Groups**", "**Recommendations**", "**Predict a Customer**"])


# OVERVIEW TAB
# headline numbers and the single most important business finding
with tab1:
    if data:
        segments = data["segments"]
        total_rev = sum(s["count"] * s["avg_spend"] for s in segments)

        champion = next((s for s in segments if s["name"] == "High Value Champions"), None)
        budget = next((s for s in segments if s["name"] == "Budget Shoppers"), None)
        browser = next((s for s in segments if s["name"] == "Occasional Browsers"), None)

        champ_rev = champion["count"] * champion["avg_spend"] if champion else 0
        champ_rev_pct = round((champ_rev / total_rev) * 100, 1) if total_rev else 0

        st.markdown("### What we found")

        # one card per segment showing the most important number for each
        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown(f"""
<div class="section-card" style="border-top: 4px solid #10b981;">
<b style="color:#10b981">HIGH VALUE CHAMPIONS</b><br><br>
<span style="font-size:2rem; font-weight:700">{champion['percentage'] if champion else '—'}%</span>
<span style="color:#6b7280"> of customers</span><br>
<span style="font-size:1.4rem; font-weight:700">{champ_rev_pct}%</span>
<span style="color:#6b7280"> of all revenue</span><br><br>
<span style="color:#374151">Your top customers. Small group, biggest financial impact. Losing even a few hurts immediately.</span>
</div>
""", unsafe_allow_html=True)

        with col2:
            st.markdown(f"""
<div class="section-card" style="border-top: 4px solid #f59e0b;">
<b style="color:#f59e0b">BUDGET SHOPPERS</b><br><br>
<span style="font-size:2rem; font-weight:700">{budget['percentage'] if budget else '—'}%</span>
<span style="color:#6b7280"> of customers</span><br>
<span style="font-size:1.4rem; font-weight:700">{budget['avg_deals'] if budget else '—'}</span>
<span style="color:#6b7280"> avg deal purchases</span><br><br>
<span style="color:#374151">Regular buyers who rely heavily on discounts. The purchase habit is there. The margin is leaking.</span>
</div>
""", unsafe_allow_html=True)

        with col3:
            st.markdown(f"""
<div class="section-card" style="border-top: 4px solid #6366f1;">
<b style="color:#6366f1">OCCASIONAL BROWSERS</b><br><br>
<span style="font-size:2rem; font-weight:700">{browser['percentage'] if browser else '—'}%</span>
<span style="color:#6b7280"> of customers</span><br>
<span style="font-size:1.4rem; font-weight:700">${browser['avg_spend'] if browser else '—'}</span>
<span style="color:#6b7280"> avg spend</span><br><br>
<span style="color:#374151">They visit the website regularly but rarely buy. Low spend, low cost to re-engage.</span>
</div>
""", unsafe_allow_html=True)

        # the core finding — this is what decisions should be based on
        st.markdown(f"""
<div class="section-card" style="border-left: 5px solid #10b981; background: #f0fdf4;">
<h4 style="color:#065f46">The revenue concentration problem</h4>
<p style="font-size:1rem; color:#374151">
<b>{champion['percentage'] if champion else '—'}% of your customers generate {champ_rev_pct}% of all revenue.</b>
A marketing strategy that treats every customer the same is spending equal budget on a $1,223 customer and a $98 one.
That is not neutral. It is actively moving money away from the people who matter most.
</p>
</div>
""", unsafe_allow_html=True)

        # model details kept small — not the main story for non-technical readers
        with st.expander("Model details (for technical reviewers)"):
            st.markdown(f"""
- **Algorithm:** {data['model_info']['algorithm']}
- **Training records:** {data['total_customers']:,} customers
- **Features:** income, total spend, number of purchases, deal purchases, web visits per month, days since last purchase, customer tenure, age
- **Silhouette score:** {data['model_info']['silhouette_score']} — measures how well separated the clusters are; closer to 1 is better
- **PCA variance explained:** {data['model_info']['pca_variance_explained']*100:.0f}% — how much of the behavioral pattern the model captures
""")


# CUSTOMER GROUPS TAB
# each group gets a card with plain numbers and a clear action
with tab2:
    if data:
        segments = data["segments"]
        total_rev = sum(s["count"] * s["avg_spend"] for s in segments)

        st.markdown("### The three customer groups")
        st.markdown("Ranked by average spend, highest first.")

        color_map = {
            "High Value Champions": "#10b981",
            "Budget Shoppers":      "#f59e0b",
            "Occasional Browsers":  "#6366f1",
        }

        action_map = {
            "High Value Champions": "RETAIN",
            "Budget Shoppers":      "CONVERT",
            "Occasional Browsers":  "RE-ENGAGE",
        }

        for seg in sorted(segments, key=lambda x: x["avg_spend"], reverse=True):
            rev = seg["count"] * seg["avg_spend"]
            rev_pct = round((rev / total_rev) * 100, 1) if total_rev else 0
            color = color_map.get(seg["name"], "#6b7280")
            action = action_map.get(seg["name"], "REVIEW")

            # segment header card
            st.markdown(f"""
<div class="section-card" style="border-left: 5px solid {color}; margin-bottom: 0.5rem;">
<span class="label-tag" style="background:{color}20; color:{color}; border:1px solid {color}40">{action}</span>
<h4 style="margin-top:0.25rem; margin-bottom:0.25rem">{seg['name']}</h4>
<p style="color:#6b7280; margin:0">{seg['description']}</p>
</div>
""", unsafe_allow_html=True)

            # key numbers below the card header
            c1, c2, c3, c4, c5 = st.columns(5)
            c1.metric("Customers", f"{seg['count']:,}")
            c2.metric("Share of base", f"{seg['percentage']}%")
            c3.metric("Avg spend", f"${seg['avg_spend']:,}")
            c4.metric("Avg income", f"${seg['avg_income']:,}")
            c5.metric("Revenue share", f"{rev_pct}%")

            st.markdown(f"**Recommended action:** {seg['strategy']}")
            st.progress(rev_pct / 100, text=f"{rev_pct}% of total revenue")
            st.markdown("---")


# RECOMMENDATIONS TAB
# what the data says and the three actions to take, in plain English
with tab3:
    if data:
        st.markdown("### What the data is telling us")
        st.caption("Each finding comes directly from the model output.")

        type_colors = {
            "revenue":     "#10b981",
            "warning":     "#dc2626",
            "behavior":    "#b45309",
            "opportunity": "#1d4ed8",
        }

        type_labels = {
            "revenue":     "REVENUE",
            "warning":     "RISK",
            "behavior":    "BEHAVIOR",
            "opportunity": "OPPORTUNITY",
        }

        for ins in data["key_insights"]:
            color = type_colors.get(ins["type"], "#6b7280")
            label = type_labels.get(ins["type"], ins["type"].upper())
            st.markdown(
                f"<div class='insight-strip' style='border-color:{color};'>"
                f"<span style='color:{color}; font-size:0.7rem; font-weight:700'>{label}</span><br>"
                f"<b style='font-size:1rem'>{ins['title']}</b><br>"
                f"<span style='color:#374151'>{ins['detail']}</span>"
                f"</div>",
                unsafe_allow_html=True
            )

        st.markdown("### Three actions, ranked by impact")
        st.caption("Start with the first. The revenue risk there is highest.")

        actions = [
            {
                "rank": "01",
                "tag": "HIGHEST PRIORITY",
                "color": "#10b981",
                "title": "Protect High Value Champions",
                "why": (
                    "This group is a small share of your customer base but generates the majority of revenue. "
                    "Losing even a handful of these customers has an immediate, measurable financial impact. "
                    "They should never feel like a regular customer."
                ),
                "how": (
                    "Loyalty rewards, early product access, and personal outreach. "
                    "These customers do not respond to discounts the way other groups do. "
                    "They respond to being recognised and prioritised."
                ),
                "metric": "Retaining one Champion is worth retaining 12 Occasional Browsers in revenue terms."
            },
            {
                "rank": "02",
                "tag": "GROWTH OPPORTUNITY",
                "color": "#f59e0b",
                "title": "Reduce discount dependency in Budget Shoppers",
                "why": (
                    "Budget Shoppers purchase 16 times on average, which is a strong buying habit. "
                    "But nearly 5 of those purchases are discount-driven. "
                    "Every discounted sale is a margin loss that can be avoided with the right loyalty structure."
                ),
                "how": (
                    "Replace the discount with a points-based loyalty programme. "
                    "The purchase frequency stays the same. The margin improves. "
                    "The goal is not to stop them buying — it is to stop them needing a deal to do it."
                ),
                "metric": "A 20% reduction in deal purchases directly improves profit per customer in this group."
            },
            {
                "rank": "03",
                "tag": "LOW-COST CHANNEL",
                "color": "#6366f1",
                "title": "Re-engage Occasional Browsers",
                "why": (
                    "This group visits the website more than anyone else but spends the least. "
                    "They are aware of the brand. The barrier is not awareness — it is conversion. "
                    "Over-investing in this group has a poor return. Light-touch is the right approach."
                ),
                "how": (
                    "A simple email re-engagement sequence with a time-limited entry offer. "
                    "Test on the most active web visitors first before scaling any spend. "
                    "The target is not to turn them into Champions — it is to move a portion into Budget Shoppers."
                ),
                "metric": "Moving just 10% of this group into regular buyers adds meaningful volume at near-zero acquisition cost."
            },
        ]

        for a in actions:
            with st.container(border=True):
                st.markdown(
                    f"<span class='label-tag' style='background:{a['color']}20; color:{a['color']}; border:1px solid {a['color']}40'>"
                    f"{a['rank']} — {a['tag']}</span>",
                    unsafe_allow_html=True
                )
                st.markdown(f"### {a['title']}")

                left, right = st.columns(2, gap="large")
                with left:
                    st.markdown("**Why this matters**")
                    st.write(a["why"])
                with right:
                    st.markdown("**How to act on it**")
                    st.write(a["how"])

                st.success(a["metric"])


# PREDICT TAB
# lets anyone test the model with a real or hypothetical customer profile
with tab4:
    st.markdown("### Predict which group a customer belongs to")
    st.markdown(
        "Adjust the values to match a customer profile and click **Run Prediction**. "
        "The model will return the group they fall into and what action to take."
    )

    st.markdown("---")

    col_a, col_b = st.columns(2, gap="large")

    with col_a:
        st.markdown("**Financial profile**")
        income = st.slider("Annual Income ($)", 0, 200000, 65000, step=1000)
        total_spend = st.slider("Total Spend to Date ($)", 0, 3000, 500, step=10)
        total_purchases = st.slider("Number of Purchases Made", 0, 50, 12)
        num_deals = st.slider("Purchases Made on a Deal", 0, 15, 2)

    with col_b:
        st.markdown("**Behavioral profile**")
        num_web_visits = st.slider("Website Visits per Month", 0, 20, 5)
        recency = st.slider("Days Since Last Purchase", 0, 365, 20)
        customer_tenure = st.slider("Days Since First Purchase", 0, 4000, 800, step=10)
        age = st.slider("Customer Age", 18, 90, 45)

    st.markdown("---")
    run = st.button("Run Prediction", type="primary", use_container_width=True)

    if run:
        payload = {
            "income": income,
            "age": age,
            "recency": recency,
            "total_spend": total_spend,
            "total_purchases": total_purchases,
            "num_web_visits_month": num_web_visits,
            "num_deals_purchases": num_deals,
            "customer_tenure": customer_tenure,
        }

        with st.spinner("Running model..."):
            result = call_predict(payload)

        if result:
            seg_icons = {
                "High Value Champions": "🟢",
                "Budget Shoppers":      "🟡",
                "Occasional Browsers":  "🔵",
            }
            seg_colors = {
                "High Value Champions": "#10b981",
                "Budget Shoppers":      "#f59e0b",
                "Occasional Browsers":  "#6366f1",
            }
            icon = seg_icons.get(result["segment_name"], "⚪")
            color = seg_colors.get(result["segment_name"], "#6b7280")

            # result header
            st.markdown(f"""
<div class="section-card" style="border-left: 5px solid {color}; background: {color}08;">
<h3 style="margin:0">{icon} {result['segment_name']}</h3>
</div>
""", unsafe_allow_html=True)

            res1, res2 = st.columns(2, gap="large")

            with res1:
                st.markdown("**What this customer looks like**")
                st.write(result["description"])
                st.markdown("**Observed traits**")
                for trait in result["traits"]:
                    st.markdown(f"- {trait}")

            with res2:
                st.markdown("**Recommended action**")
                st.write(result["strategy"])

            st.caption(result["confidence_note"])


# footer — stack and portfolio link, kept small
st.divider()
st.markdown(
    "<div class='footer-note'>"
    "FastAPI &nbsp;·&nbsp; Scikit-learn &nbsp;·&nbsp; Streamlit &nbsp;·&nbsp; K-Means (k=3) &nbsp;·&nbsp; 2,239 records &nbsp;·&nbsp; "
    "<a href='https://godfreyadembesa.vercel.app' target='_blank'>godfreyadembesa.vercel.app</a>"
    "</div>",
    unsafe_allow_html=True
)