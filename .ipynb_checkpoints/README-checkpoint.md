# Customer Segmentation — Marketing Campaign Analysis

Most marketing teams send the same message to every customer and hope something sticks. This project explores a different approach — using real campaign data to find natural customer groups, understand what makes each group different, and serve those predictions through an API that any application can call.

---

## The Problem

A retail company ran several marketing campaigns across 2,240 customers and collected data on what each customer bought, how much they spent, how often they visited, and how they responded to promotions. The data existed but nobody had used it to answer a simple question: **are all these customers actually the same, or are there distinct groups that need different treatment?**

Treating a high-spending loyal customer the same way you treat a price-sensitive browser is a waste of budget on one end and a missed opportunity on the other.

---

## The Data

The dataset comes from a real marketing campaign and includes 2,240 customer records with 29 columns covering:

- **Demographics** — year of birth, education level, marital status, income
- **Purchase behaviour** — spend across wines, fruits, meat, fish, sweets and gold products
- **Channel behaviour** — purchases made in-store, through the web, and through catalogue
- **Engagement** — number of web visits per month, deals purchased, campaigns accepted
- **Recency** — days since the last purchase

The data had a few issues worth mentioning. About 1% of income values were missing, which I filled with the median since income skews right. A small number of customers had unrealistic ages (above 90) or odd marital status entries like `YOLO` and `Absurd` — those were cleaned before any modelling began.

---

## How I Used It

The goal was to let the data decide the groups rather than define them upfront, so I went with unsupervised learning.

**Feature engineering first.** Instead of feeding raw columns into the model, I built features that actually meant something — total spend across all product categories, total purchases across all channels, customer age from birth year, and how long each person had been a customer. This reduced noise and gave the model cleaner signals to work with.

**Feature selection.** With 20+ potential features, I checked variance across all numeric columns and selected the 8 that carried the most signal: `NumDealsPurchases`, `NumWebVisitsMonth`, `TotalPurchases`, `Age`, `Recency`, `CustomerTenure`, `TotalSpend`, and `Income`. I also ran a correlation check — some features overlapped, but each one covered a different business dimension so I kept them all.

**Choosing K.** I tested K-Means from K=2 to K=12, using both inertia (elbow method) and silhouette scores together. K=2 gave the best silhouette score but produced groups too broad to be useful. K=3 balanced a reasonable score (~0.27) with three segments that were genuinely different from each other in ways a marketing team could actually act on.

**The pipeline.** I wrapped `StandardScaler` and `KMeans` into a single sklearn pipeline so scaling happens automatically — the model always sees normalised input whether you're training or predicting. No chance of forgetting to scale at inference time.

---

## What the Model Found

| Segment | Size | Avg. Income | Avg. Spend | Avg. Purchases |
|---|---|---|---|---|
| Budget Shoppers | 1,008 (45%) | $34,625 | $98 | 5.9 |
| High Value Champions | 770 (34%) | $73,915 | $1,224 | 19.1 |
| Mid-Tier Regulars | 461 (21%) | $53,210 | $685 | 16.1 |

A few things stood out. Champions spend 12x more than Budget Shoppers but visit the website less — they prefer catalogue and in-store. Mid-Tier customers earn well but spend moderately, which suggests an upsell opportunity rather than a lost cause. Budget Shoppers browse frequently but rarely convert, which points toward discount-led re-engagement rather than premium offers.

I used PCA to compress the 8 features down to 2 dimensions and plot the clusters — the separation was clear enough to confirm the model found real structure and not just noise.

---

## The API

The trained model is served through a FastAPI application with two endpoints.

**`POST /predict`** — send a customer's features, get back their segment, a description, and a recommended strategy.

**`GET /analytics`** — returns full segment statistics and key insights across the entire customer base.

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "income": 75000,
    "age": 45,
    "recency": 10,
    "total_spend": 1200,
    "total_purchases": 20,
    "num_web_visits_month": 3,
    "num_deals_purchases": 1,
    "customer_tenure": 1200
  }'
```

Interactive docs available at `http://127.0.0.1:8000/docs` once the server is running.

---

## Project Structure

```
CUSTOMER_SEGMENTATION/
├── 01_data_cleaning.py         # missing values, outliers, marital status fixes
├── 02_feature_engineering.py   # spend totals, age, tenure, campaign engagement
├── 03_feature_selection.py     # variance analysis, correlation heatmap, top 8 features
├── 04_model_training.py        # elbow + silhouette selection, pipeline, model saved to models/
├── 05_segment_analysis.py      # profiles, PCA scatter, business recommendations
├── main.py                     # FastAPI app
├── run_pipeline.py             # runs all 5 scripts in order
├── models/
│   └── market_segmentation_model.pkl
├── outputs/
│   ├── data_cleaned.csv
│   ├── data_engineered.csv
│   ├── data_model_ready.csv
│   ├── data_with_labels.csv
│   └── *.png / *.html          # all charts saved here
└── requirements.txt
```

---

## Running It

```bash
# clone and install
git clone https://github.com/GODFREY-PNG/customer_segmentation.git
cd customer_segmentation
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# run the full pipeline
python run_pipeline.py

# start the API
uvicorn main:app --reload
```

---

## Stack

Python · Pandas · Scikit-learn · FastAPI · Uvicorn · Plotly · Seaborn · Matplotlib

---

## What I'd Do Differently with More Time

The silhouette score of 0.27 is decent for real-world customer data but not exceptional. A few things I'd explore: DBSCAN or Gaussian Mixture Models to handle the cluster overlap better, adding a `/retrain` endpoint so the model can update as new campaign data comes in, and connecting to a live database instead of CSVs. Containerising with Docker would also make deployment cleaner.