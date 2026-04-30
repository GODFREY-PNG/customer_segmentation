# Customer Segmentation — Marketing Campaign Analysis

A machine learning project that groups 2,239 customers into three behaviorally distinct segments using K-Means clustering, then serves those predictions through a FastAPI backend and a React dashboard.


## The Problem

A retail business ran several marketing campaigns and collected data on what customers bought, how often they visited, and how they responded to promotions. The data existed  but nobody had used it to answer a simple question:

**Are all these customers actually the same, or are there distinct groups that need different treatment?**

Sending the same campaign to a loyal high-spender and a price-sensitive browser wastes budget on one end and misses opportunity on the other. This project answers that question with data.

---

## What the Model Found

| Segment | Customers | Avg Spend | Avg Income | Avg Purchases |
|---|---|---|---|---|
| High Value Champions | 770 (34%) | $1,223 | $73,902 | 19 |
| Budget Shoppers | 1,008 (45%) | $681 | $53,164 | 16 |
| Occasional Browsers | 461 (21%) | $98 | $34,562 | 6 |

**Key finding:** High Value Champions are 34% of the customer base but generate the majority of revenue. Budget Shoppers purchase frequently but are deal-dependent, which compresses margin. Occasional Browsers browse heavily but rarely convert.



## How It Works

### 1. Data Cleaning
Fixes three data quality issues before any modelling begins:
- Nonsense marital status entries (`YOLO`, `Absurd`) mapped to `Single`
- Missing income values in income  (~1%) filled with the median — chosen over the mean because income is right-skewed
- Ages above 90 removed as data entry errors

### 2. Feature Engineering
Raw columns are too granular for stable clustering. Six composite features are built to give the model clean behavioral signals:

| Feature | What it captures |
|---|---|
| `TotalSpend` | Total spend across all product categories |
| `TotalPurchases` | Total purchases across all channels |
| `TotalCampaignsAccepted` | Marketing engagement score |
| `CustomerTenure` | Days since first joining |
| `EducationLevel` | Education as an ordinal number (1–4) |
| `Age` | Derived from birth year dynamically |

### 3. Feature Selection
Variance is measured across all numeric columns. The top 8 features by variance are selected — low-variance columns are dropped because they look the same for nearly every customer and add noise without improving cluster separation.

**Selected features:** `NumDealsPurchases`, `NumWebVisitsMonth`, `TotalPurchases`, `Age`, `Recency`, `CustomerTenure`, `TotalSpend`, `Income`

### 4. Model Training
K-Means is tested from K=2 to K=12. Two metrics are used together to pick K:

- **Inertia (elbow method)** — measures how tight each cluster is. We look for the point where adding more clusters stops making a meaningful difference.
- **Silhouette score** — measures how well-separated the clusters are. Range: −1 to +1. Higher is better.

K=2 peaks on silhouette but produces groups too broad to act on. **K=3** balances a score of ~0.35 with three segments that are genuinely different in ways a marketing team can use.

All preprocessing and modelling is wrapped in a single `sklearn Pipeline` — scaling happens automatically at both training and prediction time.

### 5. Segment Analysis
Cluster centroids are profiled to name and interpret each segment. PCA compresses the 8 features to 2 dimensions for visual confirmation that the clusters are distinct.



## Project Structure

```
CUSTOMER_SEGMENTATION/
├── data/
│   └── MARKETING CAMPAIGN DATA.csv
├── scripts/
│   ├── 01_data_cleaning.py
│   ├── 02_feature_engineering.py
│   ├── 03_feature_selection.py
│   ├── 04_model_training.py
│   └── 05_segment_analysis.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── models/
│   └── market_segmentation_model.pkl
├── outputs/
│   ├── data_cleaned.csv
│   ├── data_engineered.csv
│   ├── data_model_ready.csv
│   ├── data_with_labels.csv
│   └── *.png / *.html
├── main.py
├── run_pipeline.py
└── requirements.txt
```

---

## Running the Project

**1. Clone and install**
```bash
git clone https://github.com/GODFREY-PNG/customer_segmentation.git
cd customer_segmentation
python -m venv venv
source venv/bin/activate        
pip install -r requirements.txt
```

**2. Run the full pipeline**
```bash
python run_pipeline.py
```
This runs all five scripts in order and saves data, plots, and the trained model to their respective folders.

**3. Start the API**
```bash
uvicorn main:app --reload
```
API runs at `http://127.0.0.1:8000`. Interactive docs at `http://127.0.0.1:8000/docs`.

**4. Start the dashboard**
```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

**`POST /predict`** — classify a single customer and return their segment, description, and recommended strategy.

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

**`GET /analytics`** — returns full segment statistics and business insights for the dashboard.



## Stack

Python · Pandas · Scikit-learn · FastAPI · Uvicorn · Plotly · Seaborn · React · Vite



## Limitations & What I Would Do Next

The silhouette score of ~0.35 is reasonable for real-world customer data but leaves room for improvement. Three areas I would explore with more time:

- **Alternative algorithms** — DBSCAN or Gaussian Mixture Models to handle the moderate cluster overlap better
- **Live retraining** — a `/retrain` endpoint so the model updates automatically as new campaign data comes in
- **Containerisation** — Docker setup to make deployment cleaner and environment-independent