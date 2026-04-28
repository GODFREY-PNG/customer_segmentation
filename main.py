from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np
import os

app = FastAPI(title="Customer Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#load the trained model (models/ first, root as fallback)
MODEL_PATH = "models/market_segmentation_model.pkl"
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = "market_segmentation_model.pkl"

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

print(f"Model loaded from: {MODEL_PATH}")

#  segment metadata
SEGMENT_INFO = {
    0: {
        "name": "Budget Shoppers",
        "color": "#f59e0b",
        "icon": "budget",
        "description": "Price-sensitive customers who browse frequently but convert rarely.",
        "strategy": "Target with discounts, flash sales and re-engagement emails to convert browsing into purchases.",
        "traits": ["High web visits", "Low spend", "Rarely convert", "Deal-seekers"]
    },
    1: {
        "name": "High Value Champions",
        "color": "#10b981",
        "icon": "champion",
        "description": "Top-tier customers with the highest spend and purchase frequency.",
        "strategy": "Reward loyalty with early access, premium bundles and exclusive offers. Highest ROI — protect at all costs.",
        "traits": ["Highest spenders", "Most purchases", "Brand loyal", "Low web visits"]
    },
    2: {
        "name": "Mid-Tier Regulars",
        "color": "#6366f1",
        "icon": "midtier",
        "description": "High income earners who are underengaged — strong upsell potential.",
        "strategy": "Personalized product recommendations and targeted upsell campaigns to unlock their spending power.",
        "traits": ["High income", "Moderate spend", "Underengaged", "Upsell potential"]
    }
}

FEATURE_COLUMNS = [
    'NumDealsPurchases', 'NumWebVisitsMonth', 'TotalPurchases',
    'Age', 'Recency', 'CustomerTenure', 'TotalSpend', 'Income'
]


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
            'NumDealsPurchases': customer.num_deals_purchases,
            'NumWebVisitsMonth': customer.num_web_visits_month,
            'TotalPurchases': customer.total_purchases,
            'Age': customer.age,
            'Recency': customer.recency,
            'CustomerTenure': customer.customer_tenure,
            'TotalSpend': customer.total_spend,
            'Income': customer.income
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
            confidence_note="Based on K-Means clustering trained on 2,240 marketing campaign records."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
def get_analytics():
    """Return pre-computed segment analytics for the dashboard."""
    return {
        "total_customers": 2239,
        "num_segments": 3,
        "model_info": {
            "algorithm": "K-Means Clustering",
            "features_used": 8,
            "silhouette_score": 0.27,
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
                "avg_income": 34625,
                "avg_spend": 98,
                "avg_purchases": 5.9,
                "avg_web_visits": 6.4,
                "avg_age": 55,
                "description": "Price-sensitive browsers who rarely convert",
                "strategy": "Discounts, flash sales, re-engagement emails"
            },
            {
                "id": 1,
                "name": "High Value Champions",
                "color": "#10b981",
                "icon": "champion",
                "count": 770,
                "percentage": 34.4,
                "avg_income": 73915,
                "avg_spend": 1224,
                "avg_purchases": 19.1,
                "avg_web_visits": 3.1,
                "avg_age": 59,
                "description": "Top spenders with highest purchase frequency",
                "strategy": "Loyalty rewards, early access, premium bundles"
            },
            {
                "id": 2,
                "name": "Mid-Tier Regulars",
                "color": "#6366f1",
                "icon": "midtier",
                "count": 461,
                "percentage": 20.6,
                "avg_income": 53210,
                "avg_spend": 685,
                "avg_purchases": 16.1,
                "avg_web_visits": 6.7,
                "avg_age": 61,
                "description": "High earners who are underengaged",
                "strategy": "Personalized upsell campaigns and product recommendations"
            }
        ],
        "key_insights": [
            {
                "title": "Champions drive 12x more revenue",
                "detail": "High Value Champions spend an average of $1,224 vs $98 for Budget Shoppers — 12.5x more per customer.",
                "type": "revenue"
            },
            {
                "title": "$19M untapped potential in Mid-Tier",
                "detail": "Mid-Tier Regulars earn well but spend moderately. Closing the gap to Champions' spend level unlocks ~$539 per customer.",
                "type": "opportunity"
            },
            {
                "title": "Champions visit the web less",
                "detail": "Higher-income customers visit the website less (3.1x/month vs 6.4x for Budget). They prefer catalog and in-store purchases.",
                "type": "behavior"
            },
            {
                "title": "45% of customers are undermonetized",
                "detail": "Budget Shoppers make up the largest segment but generate the least revenue. Better targeting could convert a fraction into regulars.",
                "type": "warning"
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)