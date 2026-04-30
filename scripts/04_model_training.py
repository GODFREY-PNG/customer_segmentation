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

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

#  Load 
X = pd.read_csv('outputs/data_model_ready.csv')
print(f"Feature matrix: {X.shape[0]} customers, {X.shape[1]} features")

print("\nFeature scales before standardization:")
print(X.agg(["mean", "std"]).round(2))

missing = X.isnull().sum()
missing = missing[missing > 0]
print("\nMissing values:", "None — clean to proceed" if missing.empty else missing)

#  K selection — elbow + silhouette 
n_clusters = range(2, 13)
inertia_scores = []
silhouette_scores = []

for k in n_clusters:
    kmeans_pipeline = make_pipeline(
        StandardScaler(),
        KMeans(n_clusters=k, random_state=42)
    )
    kmeans_pipeline.fit(X)
    inertia_scores.append(kmeans_pipeline.named_steps["kmeans"].inertia_)
    silhouette_scores.append(
        silhouette_score(X, kmeans_pipeline.named_steps["kmeans"].labels_)
    )

print("\nInertia scores:", [round(i, 0) for i in inertia_scores])
print("Silhouette scores:", [round(s, 3) for s in silhouette_scores])

#  Elbow plot 
fig = px.line(
    x=list(n_clusters),
    y=inertia_scores,
    title="Elbow Method — Inertia vs Number of Clusters",
    markers=True
)
fig.update_layout(xaxis_title="Number of Clusters (K)", yaxis_title="Inertia")
fig.write_html("outputs/04_elbow_plot.html")
fig.write_image("outputs/04_elbow_plot.png")
print("Saved → outputs/04_elbow_plot.png")

# Silhouette plot
fig = px.line(
    x=list(n_clusters),
    y=silhouette_scores,
    title="Silhouette Score vs Number of Clusters",
    markers=True
)
fig.update_layout(xaxis_title="Number of Clusters (K)", yaxis_title="Silhouette Score")
fig.write_html("outputs/04_silhouette_scores.html")
fig.write_image("outputs/04_silhouette_scores.png")
print("Saved → outputs/04_silhouette_scores.png")

# K=2 peaks on silhouette but produces segments too broad for distinct marketing strategies
# K=3 balances a score of ~0.35 with three commercially actionable customer tiers
final_model = make_pipeline(
    StandardScaler(),
    KMeans(n_clusters=3, random_state=42)
)
final_model.fit(X)
check_is_fitted(final_model)
print("\nModel trained and verified.")

#  Segment distribution 
labels = final_model.named_steps["kmeans"].labels_
print("\nCustomers per segment:")
print(pd.Series(labels).value_counts().sort_index())

# Save model 
with open("models/market_segmentation_model.pkl", "wb") as f:
    pickle.dump(final_model, f)
print("Model saved → models/market_segmentation_model.pkl")

# Root copy allows the FastAPI backend to locate the model without path changes
with open("market_segmentation_model.pkl", "wb") as f:
    pickle.dump(final_model, f)
print("Model copy saved → market_segmentation_model.pkl (for API)")

X['Segment'] = labels
X.to_csv('outputs/data_with_labels.csv', index=False)
print("Labeled data saved → outputs/data_with_labels.csv")