#!/usr/bin/env python
# coding: utf-8

"""
Customer Segmentation for Marketing Campaign Optimisation

Author: Godfrey Adembesa
Dataset: Marketing Campaign Data (Kaggle)

Business Problem:

The marketing team was spending the same budget sending identical campaigns
to every customer high spenders and dormant customers alike. This meant
money wasted on customers who were never going to convert, while high-value
customers weren't being treated any differently from the rest.

The goal here is to segment the customer base into distinct groups based on
their actual behaviour — how much they spend, what they buy, how recently
they purchased, and what their income looks like. Once we have those groups,
the marketing team can tailor campaigns to each segment rather than
broadcasting the same message to everyone.

Approach:
---------
- Clean and prepare the customer data
- Select features that carry the most variation (and therefore the most signal)
- Use KMeans clustering to find natural customer groupings
- Validate the number of clusters using the elbow method and silhouette scores
- Visualise the clusters using PCA for a 2D representation
- Save the trained model so it can score new customers as they come in

Expected Outcome:
-----------------
Three distinct customer segments:
  - Budget / Dormant: low income, minimal spending, rarely engaged
  - Mid-tier / Wine Focused: moderate-high income, strong wine preference
  - Premium: highest income, heaviest spenders across all categories
"""

import os
import pickle
import warnings
from datetime import datetime

import matplotlib.pyplot as plt
import pandas as pd
import plotly.express as px
import plotly.io as pio
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.validation import check_is_fitted

# suppress sklearn and pandas deprecation noise — these don't affect our results
warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# open plotly charts in the browser when running as a script
pio.renderers.default = "browser"

# all outputs go to one folder so the project stays organised
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

DATA_PATH = "MARKETING CAMPAIGN DATA.csv"


# DATA LOADING


def load_data(filepath: str) -> pd.DataFrame:
    """
    Load the raw marketing campaign data from CSV.

    We do nothing to the data here — loading and cleaning are kept separate
    so that if loading fails, we know immediately that it's a file issue,
    not a data quality issue.
    """
    df = pd.read_csv(filepath)
    print(f"Loaded {len(df):,} customer records with {df.shape[1]} columns.")
    return df



# DATA CLEANING

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and prepare the raw customer data for analysis.

    Each cleaning step is documented with the business reason behind it —
    data cleaning decisions should always be explainable, not arbitrary.
    """
    df = df.copy()  # never modify the original dataframe in place i made a copy 

    print("\n--- Data Quality Check ---")
    print(df.isnull().sum()[df.isnull().sum() > 0])

    # --- Missing Income ---
    # 24 customers have no income on record. This could be a data entry gap
    # or customers who declined to provide the information. Either way, we
    # can't drop them — they still have valid purchase history. We fill with
    # the median rather than the mean because income is right-skewed (a small
    # number of very high earners would pull the mean up and overstate the
    # typical income for these customers).
    n_missing_income = df["Income"].isnull().sum()
    median_income = df["Income"].median()
    df["Income"] = df["Income"].fillna(median_income)
    print(f"\nIncome: filled {n_missing_income} missing values with median (${median_income:,.0f})")

    # --- Age Feature ---
    # The dataset stores birth year rather than age directly. We derive age
    # from the current year. This gives us a more interpretable feature for
    # segmentation — "Age 55" means more to a marketer than "Born 1969".
    current_year = datetime.now().year
    df["Age"] = current_year - df["Year_Birth"]

    # sanity check — flag any customers with implausible ages
    implausible = df[df["Age"] > 100]
    if len(implausible) > 0:
        print(f"Warning: {len(implausible)} customers have Age > 100. Worth reviewing.")

    # --- Drop Redundant and Constant Columns ---
    # Z_CostContact and Z_Revenue are internal accounting constants — they hold
    # the same value for every customer (3 and 11 respectively) and contribute
    # zero variance, so they cannot help any model distinguish between customers.
    # ID is just a row identifier with no predictive value.
    # Year_Birth is replaced by the Age feature we just created.
    cols_to_drop = ["Z_CostContact", "Z_Revenue", "ID", "Year_Birth"]
    df = df.drop(columns=cols_to_drop)
    print(f"\nDropped columns: {cols_to_drop}")
    print(f"Working dataset: {df.shape[0]:,} rows x {df.shape[1]} columns")

    return df



# EXPLORATORY ANALYSIS


def run_eda(df: pd.DataFrame) -> pd.Index:
    """
    Explore the cleaned data and identify which features carry the most
    information for clustering.

    For unsupervised learning like KMeans, feature selection is based on
    variance — features that barely change across customers can't help the
    algorithm distinguish between them, so we focus on the ones that vary most.

    Returns the top 10 high-variance feature names for use in clustering.
    """

    # --- Income Distribution ---
    # Visualising income after cleaning to confirm the median fill didn't
    # distort the distribution. A spike at exactly the median would indicate
    # a problem — the distribution should still look roughly continuous.
    plt.figure(figsize=(8, 5))
    df["Income"].hist(bins=30, color="#4C72B0", edgecolor="white")
    plt.title("Income Distribution (after cleaning)", fontsize=13)
    plt.xlabel("Annual Income ($)")
    plt.ylabel("Number of Customers")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "01_income_distribution.png"), dpi=150)
    plt.close()
    print("Saved: income distribution chart")

    # --- Correlation Heatmap ---
    # Understanding which features move together helps us interpret cluster
    # results later. If MntWines and Income are highly correlated, a cluster
    # with high income will predictably also have high wine spending — that
    # makes the segment story coherent and explainable to stakeholders.
    correlation = df.select_dtypes("number").corr()
    plt.figure(figsize=(12, 9))
    sns.heatmap(
        correlation,
        cmap="coolwarm",
        center=0,
        annot=False,
        linewidths=0.5
    )
    plt.title("Feature Correlation Heatmap", fontsize=13)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "02_correlation_heatmap.png"), dpi=150)
    plt.close()
    print("Saved: correlation heatmap")

    # --- High-Variance Feature Selection ---
    # KMeans works by measuring distances between data points. Features with
    # very low variance are essentially flat — they don't help the algorithm
    # separate customers into meaningful groups. We take the top 10 features
    # by variance to focus the model on what actually differs across customers.
    numeric_cols = df.select_dtypes(include=["number"]).columns
    variance_series = df[numeric_cols].var().sort_values()
    top_10_features = variance_series.tail(10)

    fig = px.bar(
        x=top_10_features.values,
        y=top_10_features.index,
        orientation="h",
        title="Top 10 High-Variance Features (Selected for Clustering)",
        labels={"x": "Variance", "y": "Feature"},
        color=top_10_features.values,
        color_continuous_scale="Blues"
    )
    fig.update_xaxes(type="log")  # log scale because Income dwarfs smaller features
    fig.update_layout(showlegend=False, coloraxis_showscale=False)
    fig.write_image(os.path.join(OUTPUT_DIR, "03_high_variance_features.png"), scale=3)
    fig.show()
    print("Saved: high variance features chart")

    # --- Income Outlier Check ---
    # Checking for extreme income values that could pull cluster centroids in
    # misleading directions. A handful of very high earners can distort what
    # a "high income cluster" looks like for the majority of customers.
    fig = px.box(
        df,
        x="Income",
        title="Income Distribution - Outlier Check",
        labels={"Income": "Annual Income ($)"}
    )
    fig.show()

    return top_10_features.index



# CLUSTER SELECTION

def find_optimal_clusters(X: pd.DataFrame, k_range: range) -> int:
    """
    Run KMeans across a range of k values and use both the elbow method and
    silhouette scores to decide on the optimal number of clusters.

    Why two methods?
    - Inertia (elbow method) tells us when adding more clusters stops meaningfully
      reducing within-cluster variance. The elbow is where the curve bends.
    - Silhouette score tells us how well-separated the clusters actually are.
      Scores closer to 1.0 are better; negative scores mean clusters overlap badly.

    We use both together because neither method is definitive on its own.
    """
    inertia_values = []
    silhouette_values = []

    print("\nEvaluating cluster counts...")
    for k in k_range:
        pipeline = make_pipeline(
            StandardScaler(),
            KMeans(n_clusters=k, random_state=42, n_init=10)
        )
        pipeline.fit(X)
        labels = pipeline.named_steps["kmeans"].labels_
        inertia_values.append(pipeline.named_steps["kmeans"].inertia_)
        silhouette_values.append(silhouette_score(X, labels))
        print(f"  k={k}: inertia={inertia_values[-1]:,.0f}, silhouette={silhouette_values[-1]:.3f}")

    # --- Elbow Plot ---
    fig = px.line(
        x=list(k_range),
        y=inertia_values,
        markers=True,
        title="Inertia vs Number of Clusters (Elbow Method)",
        labels={"x": "Number of Clusters (k)", "y": "Inertia"}
    )
    fig.write_image(os.path.join(OUTPUT_DIR, "04_elbow_plot.png"), scale=3)
    fig.show()

    # --- Silhouette Plot ---
    fig = px.line(
        x=list(k_range),
        y=silhouette_values,
        markers=True,
        title="Silhouette Score vs Number of Clusters",
        labels={"x": "Number of Clusters (k)", "y": "Silhouette Score"}
    )
    # add a reference line at 0 — any score below this means clusters overlap
    fig.add_hline(
        y=0,
        line_dash="dash",
        line_color="red",
        annotation_text="Score = 0 (overlap threshold)"
    )
    fig.write_image(os.path.join(OUTPUT_DIR, "05_silhouette_plot.png"), scale=3)
    fig.show()
    print("Saved: elbow and silhouette plots")

    # The silhouette score peaks at k=2 (0.47) and drops sharply afterward.
    # However, k=2 is too coarse for marketing — splitting customers into just
    # "low" and "high" doesn't give the team enough to work with. At k=3 the
    # silhouette score (0.28) is still positive and meaningful, and the elbow
    # curve shows a visible bend. k=3 gives us segments that are both
    # statistically reasonable and practically useful for campaign targeting.
    chosen_k = 3
    print(f"\nChosen number of clusters: {chosen_k}")
    print("Rationale: k=3 balances statistical validity with marketing utility.")
    return chosen_k



# CLUSTERING AND PROFILING

def build_and_profile_clusters(X: pd.DataFrame, n_clusters: int):
    """
    Train the final KMeans model, assign cluster labels, and build
    a profile of each segment so the results are interpretable.

    A clustering model that can't be explained to the marketing team is
    useless — the profiling step is what turns abstract labels into
    actionable business insights.
    """

    # StandardScaler is inside the pipeline so it's applied consistently
    # whether we're fitting or scoring new customers later. This prevents
    # the common mistake of scaling training data differently from new data.
    final_model = make_pipeline(
        StandardScaler(),
        KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    )
    final_model.fit(X)

    # confirm the model fitted correctly before we proceed
    check_is_fitted(final_model)

    labels = final_model.named_steps["kmeans"].labels_
    print(f"\nCluster label distribution:\n{pd.Series(labels).value_counts().sort_index()}")

    # --- Cluster Profiles ---
    # Looking at the mean of each feature within each cluster tells us what
    # the "typical" customer in each segment looks like. This is the output
    # that goes to the marketing team.
    cluster_profiles = X.copy()
    cluster_profiles["Cluster"] = labels
    cluster_means = cluster_profiles.groupby("Cluster").mean().round(1)

    print("\n--- Cluster Profiles (Mean Values) ---")
    print(cluster_means.T.to_string())

    # Map cluster numbers to human-readable names based on what we observe
    # in the profiles. These labels should  be validated with the
    # business team — the data tells us groups exist, not what to call them.
    cluster_labels = {
        0: "Mid-tier / Wine Focused",
        1: "Budget / Dormant",
        2: "Premium"
    }
    print("\nSegment names assigned based on income and spending patterns:")
    for k, name in cluster_labels.items():
        print(f"  Cluster {k}: {name}")

    # --- Segment Bar Chart ---
    fig = px.bar(
        cluster_means,
        barmode="group",
        title="Customer Segment Profiles - Mean Feature Values by Cluster",
        labels={"index": "Cluster", "value": "Mean Value"},
        color_discrete_sequence=px.colors.qualitative.Set2
    )
    fig.update_yaxes(
        type="log",
        title="Mean Value (log scale - Income dominates otherwise)"
    )
    fig.update_xaxes(title="Customer Segment")
    fig.write_image(os.path.join(OUTPUT_DIR, "06_cluster_profiles.png"), scale=3)
    fig.show()
    print("Saved: cluster profile chart")

    return final_model, labels, cluster_means



# PCA VISUALISATION


def visualise_clusters_pca(X: pd.DataFrame, labels, cluster_names: dict):
    """
    Use PCA to project the high-dimensional customer data into 2D so we
    can visually inspect how well-separated the clusters are.

    PCA doesn't change the clustering — the model already ran in the original
    feature space. This is purely for human inspection. If clusters overlap
    heavily in the PCA plot, it's a sign the segments may not be distinct
    enough in practice.

    We scale the data here separately before PCA because PCA is sensitive
    to feature magnitudes — Income in the tens of thousands would otherwise
    dominate all principal components and make the visualisation meaningless.
    """
    # scale before PCA — without this, Income dominates all components
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X_scaled)

    explained = pca.explained_variance_ratio_
    print(f"\nPCA: PC1 explains {explained[0]:.1%}, PC2 explains {explained[1]:.1%}")
    print(f"Together they capture {sum(explained):.1%} of total variance.")

    pca_df = pd.DataFrame({
        "PC1": X_pca[:, 0],
        "PC2": X_pca[:, 1],
        "Segment": [cluster_names.get(l, str(l)) for l in labels]
    })

    fig = px.scatter(
        pca_df,
        x="PC1",
        y="PC2",
        color="Segment",
        title="Customer Segments - PCA 2D Projection",
        labels={
            "PC1": f"PC1 ({explained[0]:.1%} variance)",
            "PC2": f"PC2 ({explained[1]:.1%} variance)"
        },
        color_discrete_sequence=px.colors.qualitative.Set2,
        opacity=0.75
    )
    fig.update_traces(marker=dict(size=5))
    fig.write_image(os.path.join(OUTPUT_DIR, "07_pca_clusters.png"), scale=3)
    fig.show()
    print("Saved: PCA scatter plot")



# MODEL PERSISTENCE


def save_model(model, filepath: str):
    """
    Persist the trained pipeline to disk using pickle.

    Saving the full pipeline (scaler + KMeans together) is important —
    if we only saved the KMeans model, we'd have to remember to scale new
    data separately every time we score a new customer. The pipeline
    handles that automatically, reducing the chance of a preprocessing error
    in production.
    """
    with open(filepath, "wb") as f:
        pickle.dump(model, f)
    print(f"\nModel saved to: {filepath}")
    print("To score a new customer: load the pipeline and call .predict(new_data)")



# MAIN ORCHESTRATOR


def main():
    print("=" * 60)
    print("Customer Segmentation - Marketing Campaign Optimisation")
    print("=" * 60)

    # Step 1: Load raw data
    df_raw = load_data(DATA_PATH)

    # Step 2: Clean and prepare
    df_clean = clean_data(df_raw)

    # Step 3: Explore data and select features for clustering
    selected_features = run_eda(df_clean)
    X = df_clean[selected_features]
    print(f"\nFeatures selected for clustering ({len(selected_features)}):")
    print(list(selected_features))

    # Step 4: Find the optimal number of clusters
    k_range = range(2, 13)
    optimal_k = find_optimal_clusters(X, k_range)

    # Step 5: Train final model and profile segments
    cluster_names = {
        0: "Mid-tier / Wine Focused",
        1: "Budget / Dormant",
        2: "Premium"
    }
    final_model, labels, cluster_means = build_and_profile_clusters(X, optimal_k)

    # Step 6: Visualise clusters in 2D using PCA
    visualise_clusters_pca(X, labels, cluster_names)

    # Step 7: Save the trained model for scoring new customers
    model_path = os.path.join(OUTPUT_DIR, "market_segmentation_model.pkl")
    save_model(final_model, model_path)

    # --- Business Summary ---
    print("\n" + "=" * 60)
    print("SEGMENT SUMMARY FOR MARKETING TEAM")
    print("=" * 60)
    print("""
  Cluster 0 - Mid-tier / Wine Focused
  Moderate-to-high income customers with a strong preference for wine.
  They shop in-store regularly but spend less on other categories.
  Target with wine-focused promotions and cross-sell opportunities
  in adjacent categories like meat and fish.

  Cluster 1 - Budget / Dormant
  Lowest income, minimal spending across all product categories.
  These customers engage infrequently. They may respond to
  value-driven offers and entry-level promotions.

  Cluster 2 - Premium
  Highest income, heaviest spenders across all categories -
  especially meat and fish products. These customers drive
  disproportionate revenue and deserve premium loyalty treatment.

  Recommended next step: A/B test different campaign messages for each
  segment and track conversion rates separately per group.
    """)


if __name__ == "__main__":
    main()