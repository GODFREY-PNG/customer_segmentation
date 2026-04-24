# Customer Segmentation for Marketing Campaign Optimisation

## The Business Problem

The marketing team was sending the same campaign to every customer —
high spenders and dormant customers received identical messaging and the
same budget was allocated to each. This meant money was being wasted on
customers who were unlikely to convert, while high-value customers were
not being treated any differently from the rest.

The goal of this project was to segment the customer base into distinct
groups based on actual behaviour — spending patterns, product preferences,
income, and purchase recency — so that campaigns could be tailored to each
group rather than broadcast uniformly to everyone.

---

## What I Built

An end-to-end customer segmentation pipeline that:

1. Cleans and validates raw marketing campaign data
2. Selects the most informative features using variance analysis
3. Determines the optimal number of customer segments using the elbow method and silhouette scores
4. Trains a KMeans clustering model to assign every customer to a segment
5. Profiles each segment so the marketing team can interpret and act on the results
6. Saves the trained model so new customers can be scored as they come in

---

## The Data

**Source:** [Marketing Campaign Dataset — Kaggle](https://www.kaggle.com/datasets/rodsaldanha/arketing-campaign)

**Size:** 2,240 customers × 29 features

**Key features used:**
| Feature | What it represents |
|---|---|
| Income | Annual household income |
| MntWines | Amount spent on wine in the last 2 years |
| MntMeatProducts | Amount spent on meat products |
| MntFishProducts | Amount spent on fish products |
| MntGoldProds | Amount spent on gold products |
| MntFruits | Amount spent on fruit products |
| MntSweetProducts | Amount spent on sweets |
| NumStorePurchases | Number of in-store purchases |
| Recency | Days since last purchase |
| Age | Derived from Year_Birth |

---

## Results — The Three Customer Segments

| Segment | Income | Spending | Behaviour | Marketing Approach |
|---|---|---|---|---|
| **Budget / Dormant** | Low | Minimal across all categories | Rarely purchases, low engagement | Value-driven offers, discount promotions |
| **Mid-tier / Engaged** | Moderate | Consistent, spread across categories | Regular purchases, responds to campaigns | Targeted upsell campaigns, loyalty incentives |
| **Premium** | High | Heavy — especially wines and meat | Frequent store visits, high basket value | Premium loyalty programmes, exclusive offers |

The Premium segment drives a disproportionate share of total revenue despite being the smallest group.
The Mid-tier segment has the highest growth potential — the right campaign could move these customers toward premium behaviour.

### Cluster Profiles
![Cluster Profiles](outputs/06_cluster_profiles.png)

### PCA Visualisation — How Separated Are the Clusters?
![PCA Plot](outputs/07_pca_clusters.png)

### Cluster Selection — Elbow Method
![Elbow Plot](outputs/04_elbow_plot.png)

### Cluster Selection — Silhouette Scores
![Silhouette Plot](outputs/05_silhouette_plot.png)

---

## Why 3 Clusters?

The silhouette score peaks at k=2 (score ≈ 0.47) but two clusters is too
coarse for marketing — splitting customers into just "low" and "high" doesn't
give the team enough to differentiate their campaigns.

At k=3 the silhouette score (≈ 0.28) is still positive and meaningful,
indicating the clusters are reasonably well-separated. The elbow curve also
shows a visible bend at k=3. Three segments gives us statistically valid
groups that are also practically useful for campaign targeting.

---

## Key Technical Decisions

**Why median for missing income?**
Income is right-skewed — a small number of very high earners pull the mean
upward. The median better represents what a typical customer earns, making
it a safer fill for the 24 customers with missing income records.

**Why variance-based feature selection for KMeans?**
KMeans assigns cluster membership based on distance between data points.
Features with near-zero variance look almost identical across all customers —
they cannot help the algorithm find meaningful separations. Selecting the
top 10 highest-variance features focuses the model on what actually differs
between customers.

**Why scale with StandardScaler before KMeans?**
Income is in the tens of thousands while Recency is in single or double
digits. Without scaling, KMeans would essentially be clustering on income
alone because it dominates the distance calculation. StandardScaler brings
all features to the same scale so each one contributes equally.

**Why save the full pipeline rather than just the model?**
Saving the StandardScaler and KMeans together as a pipeline ensures that
any new customer data gets scaled exactly the same way as the training data
before being scored. Saving only the KMeans step would require remembering
to scale separately every time, which is a common source of errors in
production use.

---

## How to Run

```bash
# Clone the repository
git clone https://github.com/GODFREY-PNG/customer-segmentation.git
cd customer-segmentation

# Install dependencies
pip install -r requirements.txt

# Run the analysis
python market_clustering_analysis.py
```

Outputs are saved to the `outputs/` folder automatically.

---

## How to Score New Customers

```python
import pickle
import pandas as pd

# Load the saved pipeline
with open("outputs/market_segmentation_model.pkl", "rb") as f:
    model = pickle.load(f)

# New customer data — must include the same features used in training
new_customers = pd.DataFrame({
    "NumStorePurchases": [8],
    "Age": [42],
    "Recency": [15],
    "MntFruits": [120],
    "MntSweetProducts": [80],
    "MntGoldProds": [90],
    "MntFishProducts": [150],
    "MntMeatProducts": [620],
    "MntWines": [980],
    "Income": [72000]
})

segment = model.predict(new_customers)
print(f"Customer assigned to Cluster: {segment[0]}")
# 0 = Budget/Dormant | 1 = Mid-tier/Engaged | 2 = Premium
```

---

## Dependencies

```
pandas>=1.5.0
matplotlib>=3.5.0
seaborn>=0.12.0
plotly>=5.10.0
scikit-learn>=1.1.0
kaleido>=0.2.1
```

---

## Project Structure

```
customer-segmentation/
│
├── market_clustering_analysis.py   # main analysis script
├── MARKETING CAMPAIGN DATA.csv     # raw dataset (from Kaggle)
├── requirements.txt
├── README.md
│
└── outputs/
    ├── 01_income_distribution.png
    ├── 02_correlation_heatmap.png
    ├── 03_high_variance_features.png
    ├── 04_elbow_plot.png
    ├── 05_silhouette_plot.png
    ├── 06_cluster_profiles.png
    ├── 07_pca_clusters.png
    └── market_segmentation_model.pkl
```

---

## What I Would Do Next

- **A/B test** different campaign messages per segment and track conversion separately
- **Add campaign response rates** per segment to validate whether the segments actually behave differently when contacted
- **Try DBSCAN or Gaussian Mixture Models** as alternative clustering approaches — KMeans assumes spherical clusters which may not perfectly fit customer data
- **Build a simple API endpoint** using FastAPI so the marketing platform can score new customers automatically when they sign up

---

*Godfrey Adembesa · Data Scientist · Nairobi, Kenya*
*godfreyimbindi@gmail.com · [LinkedIn](https://linkedin.com/in/godfrey-imbindi-adembesa) · [GitHub](https://github.com/GODFREY-PNG)*