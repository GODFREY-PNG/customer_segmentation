from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import os

app = FastAPI(title="Customer Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model loading
# Checks models/ first; falls back to root for local development
MODEL_PATH = "models/market_segmentation_model.pkl"
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = "market_segmentation_model.pkl"

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

print(f"Model loaded from: {MODEL_PATH}")

#  Segment metadata
# Derived from centroid profiles — verified against training data output
SEGMENT_INFO = {
    0: {
        "name": "Budget Shoppers",
        "color": "#f59e0b",
        "icon": "budget",
        "description": "Deal-driven customers who purchase regularly but rely heavily on discounts.",
        "strategy": "Reduce deal dependency through loyalty rewards. Convert repeat discount buyers into consistent full-price purchasers to protect margin.",
        "traits": ["Deal-driven", "Regular buyers", "Mid income", "High web visits"]
    },
    1: {
        "name": "Occasional Browsers",
        "color": "#6366f1",
        "icon": "browser",
        "description": "Low-spend customers who browse frequently but rarely convert.",
        "strategy": "Low-cost re-engagement emails and entry-level offers. Realistic goal: move a portion into Budget Shoppers, not Champions.",
        "traits": ["High web visits", "Lowest spend", "Rarely convert", "Lowest income"]
    },
    2: {
        "name": "High Value Champions",
        "color": "#10b981",
        "icon": "champion",
        "description": "Top-tier customers with the highest spend, income, and purchase frequency.",
        "strategy": "Protect with loyalty rewards and early product access. This segment drives disproportionate revenue — retention is the priority.",
        "traits": ["Highest spenders", "Most purchases", "Highest income", "Low deal dependency"]
    }
}

FEATURE_COLUMNS = [
    'NumDealsPurchases', 'NumWebVisitsMonth', 'TotalPurchases',
    'Age', 'Recency', 'CustomerTenure', 'TotalSpend', 'Income'
]


#  Schemas
class CustomerInput(BaseModel):
    income: float
    age: int
    recency: int
    total_spend: float
    total_purchases: int
    num_web_visits_month: int
    num_deals_purchases: int
    customer_tenure: int


class PredictionResponse(BaseModel):
    segment_id: int
    segment_name: str
    color: str
    icon: str
    description: str
    strategy: str
    traits: list
    confidence_note: str


# Routes
@app.get("/")
def root():
    return {
        "message": "Customer Segmentation API is running",
        "model_path": MODEL_PATH
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerInput):
    try:
        input_df = pd.DataFrame([{
            'NumDealsPurchases':  customer.num_deals_purchases,
            'NumWebVisitsMonth':  customer.num_web_visits_month,
            'TotalPurchases':     customer.total_purchases,
            'Age':                customer.age,
            'Recency':            customer.recency,
            'CustomerTenure':     customer.customer_tenure,
            'TotalSpend':         customer.total_spend,
            'Income':             customer.income
        }])

        segment_id = int(model.predict(input_df)[0])
        info = SEGMENT_INFO[segment_id]

        return PredictionResponse(
            segment_id=segment_id,
            segment_name=info["name"],
            color=info["color"],
            icon=info["icon"],
            description=info["description"],
            strategy=info["strategy"],
            traits=info["traits"],
            confidence_note="K-Means model trained on 2,239 marketing campaign records across 8 behavioral features."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
def get_analytics():
    """Pre-computed segment analytics for the dashboard."""
    return {
        "total_customers": 2239,
        "num_segments": 3,
        "model_info": {
            "algorithm": "K-Means Clustering",
            "features_used": 8,
            "silhouette_score": 0.35,
            "pca_variance_explained": 0.57
        },
        "segments": [
            {
                "id": 0,
                "name": "Budget Shoppers",
                "color": "#f59e0b",
                "icon": "budget",
                "count": 1008,
                "percentage": 45.0,
                "avg_income": 53164,
                "avg_spend": 681,
                "avg_purchases": 16.1,
                "avg_web_visits": 6.7,
                "avg_deals": 4.94,
                "avg_age": 61,
                "description": "Regular buyers who rely heavily on deals and discounts.",
                "strategy": "Loyalty rewards to reduce deal dependency and protect margin."
            },
            {
                "id": 1,
                "name": "Occasional Browsers",
                "color": "#6366f1",
                "icon": "browser",
                "count": 461,
                "percentage": 20.6,
                "avg_income": 34562,
                "avg_spend": 98,
                "avg_purchases": 5.9,
                "avg_web_visits": 6.4,
                "avg_deals": 1.85,
                "avg_age": 54,
                "description": "Browse frequently but rarely convert to purchases.",
                "strategy": "Re-engagement emails and entry-level offers to drive first conversions."
            },
            {
                "id": 2,
                "name": "High Value Champions",
                "color": "#10b981",
                "icon": "champion",
                "count": 770,
                "percentage": 34.4,
                "avg_income": 73902,
                "avg_spend": 1223,
                "avg_purchases": 19.1,
                "avg_web_visits": 3.1,
                "avg_deals": 1.38,
                "avg_age": 58,
                "description": "Highest spend, most purchases, highest income — core revenue drivers.",
                "strategy": "Retain with loyalty rewards and early access. Revenue loss risk is highest here."
            }
        ],
        "key_insights": [
            {
                "title": "Champions spend 12x more than Browsers",
                "detail": "High Value Champions average $1,223 per customer vs $98 for Occasional Browsers. Retaining one Champion is worth retaining 12 Browsers.",
                "type": "revenue"
            },
            {
                "title": "Budget Shoppers are margin risk",
                "detail": "Nearly 5 in every 16 purchases from Budget Shoppers are deal-driven. Without a loyalty strategy, margin continues to erode as this segment grows.",
                "type": "warning"
            },
            {
                "title": "Champions rarely browse online",
                "detail": "High Value Champions visit the website only 3x per month versus 6-7x for lower-value segments. They buy through catalog and in-store — digital campaigns alone will not reach them.",
                "type": "behavior"
            },
            {
                "title": "Occasional Browsers are a low-cost growth lever",
                "detail": "This segment has the highest web presence but lowest conversion. A targeted re-engagement campaign converting just 10% into Budget Shoppers adds meaningful volume at near-zero acquisition cost.",
                "type": "opportunity"
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)