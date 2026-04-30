import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

os.makedirs("outputs", exist_ok=True)

# Load 
df = pd.read_csv('outputs/data_engineered.csv')
print(f"Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# ── Variance
numeric_cols = df.select_dtypes(include=['number']).columns
print(f"\nTotal numeric columns: {len(numeric_cols)}")
print("\nAll variances sorted:")
print(df[numeric_cols].var().sort_values())

# Keeping top 8 — clear variance gap below EducationLevel confirmed visually
variance_scores = df[numeric_cols].var().sort_values()
top_variance_features = variance_scores.tail(8)
print("\nTop 8 features by variance:")
print(top_variance_features)

high_var_features = top_variance_features.index.tolist()
print("\nSelected features:", high_var_features)

# ── Variance bar chart ────────────────────────────────────────────────────────
fig = px.bar(
    x=top_variance_features.values,
    y=top_variance_features.index,
    orientation="h",
    title="Feature Selection: Top 8 Features by Variance"
)
fig.update_layout(xaxis_title="Variance (log scale)", yaxis_title="Feature")
fig.update_xaxes(type='log')
fig.write_html("outputs/03_high_variance_features.html")
fig.write_image("outputs/03_high_variance_features.png")
print("Saved → outputs/03_high_variance_features.png")

# Correlation check
correlation = df[high_var_features].corr()

plt.figure(figsize=(12, 8))
sns.heatmap(correlation, annot=True, fmt=".1f", cmap="coolwarm")
plt.title('Feature Correlation Matrix — Model Input Features')
plt.tight_layout()
plt.savefig("outputs/03_correlation_heatmap.png", dpi=150)
plt.close()
print("Saved → outputs/03_correlation_heatmap.png")

# TotalSpend, TotalPurchases and Income are correlated but cover distinct RFM dimensions
# — all three retained; overlap flagged in segment interpretation
print("\nCorrelation — key RFM features:")
print(correlation[['TotalSpend', 'TotalPurchases', 'Income']].round(2))

#  Save 
pd.Series(high_var_features).to_csv('outputs/selected_features.csv', index=False, header=False)
df[high_var_features].to_csv('outputs/data_model_ready.csv', index=False)
print("Selected features saved → outputs/selected_features.csv")
print("Model-ready data saved  → outputs/data_model_ready.csv")