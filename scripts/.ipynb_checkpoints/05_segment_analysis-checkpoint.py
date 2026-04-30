import pandas as pd
import plotly.express as px
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# create output folders 
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# load labeled data from previous step
df = pd.read_csv('outputs/data_with_labels.csv')
labels = df['Segment'].values
X = df.drop(columns=['Segment'])

# mean feature values per cluster — reveals what each segment looks like
segment_profiles = X.groupby(labels).mean()
print(segment_profiles)

# label segments based on centroid profiles
segment_names = {
    0: "Budget Shoppers",
    1: "High Value Champions",
    2: "Mid-Tier Regulars"
}
print("Segment profiles:")
print(segment_profiles.rename(index=segment_names))

# grouped bar chart — average feature value per segment (log scale)
fig = px.bar(
    segment_profiles,
    barmode="group",
    title="Average Customer Features by Segment"
)
fig.update_layout(xaxis_title="Segment", yaxis_title="Average Value (log scale)")
fig.update_yaxes(type="log")
fig.write_html("outputs/05_segment_profiles.html")
fig.write_image("outputs/05_segment_profiles.png")
print("Saved -> outputs/05_segment_profiles.png")

# PCA: compress 8 features to 2D for visualization
X_scaled_for_pca = StandardScaler().fit_transform(X)
pca = PCA(n_components=2, random_state=42)
X_t = pca.fit_transform(X_scaled_for_pca)
X_pca = pd.DataFrame(X_t, columns=["PC1", "PC2"])

print("PC1 explains:", pca.explained_variance_ratio_[0].round(2))
print("PC2 explains:", pca.explained_variance_ratio_[1].round(2))
print("Total variance explained:", pca.explained_variance_ratio_.sum().round(2))

# map numeric labels to names for the legend
segment_label_map = {str(k): v for k, v in segment_names.items()}
color_labels = pd.Series(labels).astype(str).map(segment_label_map)

fig = px.scatter(
    data_frame=X_pca,
    x="PC1",
    y="PC2",
    color=color_labels,
    title="Customer Segments Visualized in 2D (PCA)",
    labels={"color": "Segment"},
    color_discrete_map={
        "Budget Shoppers":      "#f59e0b",
        "High Value Champions": "#10b981",
        "Mid-Tier Regulars":    "#6366f1"
    }
)
fig.update_layout(xaxis_title="Principal Component 1", yaxis_title="Principal Component 2")
fig.write_html("outputs/05_pca_clusters.html")
fig.write_image("outputs/05_pca_clusters.png")
print("Saved -> outputs/05_pca_clusters.png")

print("\nAll analysis outputs saved to outputs/ folder.")