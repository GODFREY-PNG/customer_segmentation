import pandas as pd
import pickle
import plotly.express as px
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.validation import check_is_fitted
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ── create output folders if they don't exist ──────────────────────────────
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# load model-ready data from previous step
X = pd.read_csv('outputs/data_model_ready.csv')

# check feature scales before standardization
print(X.aggregate(["mean", "std"]))

# check for any remaining missing values before modeling
print("Missing values in X:")
print(X.isnull().sum()[X.isnull().sum() > 0])
print("Total NaNs:", X.isnull().sum().sum())

# test K from 2 to 12 — inertia and silhouette together give a stronger decision
n_clusters = range(2, 13)
inertia_errors = []
silhouette_scores = []

for k in n_clusters:
    model = make_pipeline(StandardScaler(), KMeans(n_clusters=k, random_state=42))
    model.fit(X)
    inertia_errors.append(model.named_steps["kmeans"].inertia_)
    silhouette_scores.append(silhouette_score(X, model.named_steps["kmeans"].labels_))

print("Inertia:", inertia_errors)
print("Silhouette Scores:", silhouette_scores)

# elbow plot — find where inertia stops dropping sharply to pick optimal K
fig = px.line(
    x=list(n_clusters),
    y=inertia_errors,
    title="K-Means Model: Inertia vs Number of Clusters"
)
fig.update_layout(xaxis_title="Number of Clusters (K)", yaxis_title="Inertia")
fig.write_html("outputs/04_elbow_plot.html")
fig.write_image("outputs/04_elbow_plot.png")
print("Saved → outputs/04_elbow_plot.png")

# silhouette score — confirms cluster separation, used alongside the elbow plot
fig = px.line(
    x=list(n_clusters),
    y=silhouette_scores,
    title="K-Means Model: Silhouette Score vs Number of Clusters"
)
fig.update_layout(xaxis_title="Number of Clusters (K)", yaxis_title="Silhouette Score")
fig.write_html("outputs/04_silhouette_scores.html")
fig.write_image("outputs/04_silhouette_scores.png")
print("Saved → outputs/04_silhouette_scores.png")

# K=2 peaks on silhouette but too broad for business use
# K=3 balances a strong score (~0.35) with meaningful segment differentiation
final_model = make_pipeline(
    StandardScaler(),
    KMeans(n_clusters=3, random_state=42)
)
final_model.fit(X)
print("Model trained successfully")

# confirm the model is fitted before using it
check_is_fitted(final_model)

# cluster labels — assigns each customer to segment 0, 1 or 2
labels = final_model.named_steps["kmeans"].labels_
print("Customers per segment:")
print(pd.Series(labels).value_counts().sort_index())

# ── save model to models/ folder ───────────────────────────────────────────
with open("models/market_segmentation_model.pkl", "wb") as f:
    pickle.dump(final_model, f)
print("Model saved → models/market_segmentation_model.pkl")

# also keep a copy at root so main.py can find it without changes
with open("market_segmentation_model.pkl", "wb") as f:
    pickle.dump(final_model, f)
print("Model copy saved → market_segmentation_model.pkl (for API)")

# save labels alongside data for the analysis script
X['Segment'] = labels
X.to_csv('outputs/data_with_labels.csv', index=False)
print("Labeled data saved → outputs/data_with_labels.csv")