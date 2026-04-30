import pandas as pd
import plotly.express as px
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

os.makedirs("outputs", exist_ok=True)

SEGMENT_NAMES = {
    0: "Budget Shoppers",
    1: "Occasional Browsers",
    2: "High Value Champions"
}

SEGMENT_COLORS = {
    "Budget Shoppers":      "#f59e0b",
    "Occasional Browsers":  "#6366f1",
    "High Value Champions": "#10b981"
}


#  Functions

def profile_segments(
    X: pd.DataFrame,
    labels,
    segment_names: dict
) -> pd.DataFrame:
    """
    Compute average feature values per cluster and map numeric labels to names.

    Why this exists:
        K-Means outputs numeric cluster IDs (0, 1, 2) which carry no business
        meaning on their own. This function computes the centroid profile of
        each cluster — the average value of every feature per group — and
        maps each cluster ID to a human-readable name based on those profiles.
        The resulting table is the primary evidence used to name segments
        and write business recommendations.

    Args:
        X             : Feature DataFrame used for clustering (without labels).
        labels        : Array of cluster assignments (e.g. model.labels_).
        segment_names : Dict mapping cluster ID (int) to segment name (str).
                        Example: {0: "Budget Shoppers", 2: "High Value Champions"}

    Returns:
        DataFrame of mean feature values per segment, indexed by segment name.

    Example:
        profiles = profile_segments(X, labels, SEGMENT_NAMES)
    """
    profiles = X.groupby(labels).mean().round(2)
    profiles.index = profiles.index.map(segment_names)
    print("Segment profiles computed:")
    print(profiles)
    return profiles


def plot_pca_clusters(
    X: pd.DataFrame,
    labels,
    segment_names: dict,
    segment_colors: dict,
    output_path: str
) -> None:
    """
    Reduce the feature matrix to 2D using PCA and plot the cluster separation.

    Why this exists:
        K-Means clusters customers across 8 dimensions simultaneously —
        impossible to visualize directly. PCA compresses those 8 features
        into 2 components that capture the most variance, allowing us to
        draw the clusters on a scatter plot and visually confirm they are
        distinct. If clusters overlap heavily in the plot, it signals the
        model may not have found meaningful separation.

        Note: PCA here is for visualization only. The actual clustering
        was done on all 8 features — this plot is a sanity check,
        not the model output.

    Args:
        X               : Feature DataFrame (unscaled — scaling applied inside).
        labels          : Array of numeric cluster assignments.
        segment_names   : Dict mapping cluster ID to segment name.
        segment_colors  : Dict mapping segment name to hex color code.
        output_path     : File path prefix for saving .html and .png outputs.

    Returns:
        None — saves two plot files and prints variance explained.

    Example:
        plot_pca_clusters(X, labels, SEGMENT_NAMES, SEGMENT_COLORS, "outputs/05_pca_clusters")
    """
    X_scaled = StandardScaler().fit_transform(X)
    pca = PCA(n_components=2, random_state=42)
    X_pca = pd.DataFrame(pca.fit_transform(X_scaled), columns=["PC1", "PC2"])

    print(f"\nPCA variance explained:")
    print(f"  PC1: {pca.explained_variance_ratio_[0]:.0%}")
    print(f"  PC2: {pca.explained_variance_ratio_[1]:.0%}")
    print(f"  Total: {pca.explained_variance_ratio_.sum():.0%} of the full picture captured in 2D")

    color_labels = pd.Series(labels).map(segment_names)

    fig = px.scatter(
        data_frame=X_pca,
        x="PC1",
        y="PC2",
        color=color_labels,
        title="Customer Segments — 2D View (PCA)",
        labels={"color": "Segment"},
        color_discrete_map=segment_colors
    )
    fig.update_layout(
        xaxis_title="Principal Component 1",
        yaxis_title="Principal Component 2"
    )
    fig.write_html(f"{output_path}.html")
    fig.write_image(f"{output_path}.png")
    print(f"Saved → {output_path}.png")


#  Load
df = pd.read_csv('outputs/data_with_labels.csv')
labels = df['Segment'].values
X = df.drop(columns=['Segment'])
print(f"Loaded: {df.shape[0]} customers across {df['Segment'].nunique()} segments")

# Segment profiling
segment_profiles = profile_segments(X, labels, SEGMENT_NAMES)

# Segment bar chart 
fig = px.bar(
    segment_profiles,
    barmode="group",
    title="Average Customer Features by Segment"
)
fig.update_layout(xaxis_title="Segment", yaxis_title="Average Value (log scale)")
fig.update_yaxes(type="log")
fig.write_html("outputs/05_segment_profiles.html")
fig.write_image("outputs/05_segment_profiles.png")
print("Saved → outputs/05_segment_profiles.png")

#  PCA visualization 
plot_pca_clusters(
    X=X,
    labels=labels,
    segment_names=SEGMENT_NAMES,
    segment_colors=SEGMENT_COLORS,
    output_path="outputs/05_pca_clusters"
)

print("\nAll analysis outputs saved to outputs/")