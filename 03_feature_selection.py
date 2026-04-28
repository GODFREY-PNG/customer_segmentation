import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ── create output folders if they don't exist ──────────────────────────────
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# load engineered data from previous step
df = pd.read_csv('outputs/data_engineered.csv')

# check variance across all numeric columns to guide feature selection
numeric_cols = df.select_dtypes(include=['number']).columns
print("Total numeric columns:", len(numeric_cols))
print()
print("All variances sorted:")
print(df[numeric_cols].var().sort_values())

# clear variance gap after EducationLevel — top 8 features carry the signal
top_features = df[numeric_cols].var().sort_values().tail(8)
print(top_features)

# extract top 8 feature names — only these go into the model
high_var_feature = top_features.index.tolist()
print("Selected features:", high_var_feature)

# bar chart — confirm the 8 selected features have the highest variance
fig = px.bar(
    x=top_features,
    y=top_features.index,
    orientation="h",
    title="Customer Segmentation: High Variance Features"
)
fig.update_layout(xaxis_title="Variance", yaxis_title="Features")
fig.update_xaxes(type='log')
fig.write_html("outputs/03_high_variance_features.html")
fig.write_image("outputs/03_high_variance_features.png")
print("Saved → outputs/03_high_variance_features.png")

# correlation check on the 8 model features
correlation = df[high_var_feature].corr()

# heatmap to spot strongly correlated feature pairs
plt.figure(figsize=(12, 8))
sns.heatmap(correlation, annot=True, fmt=".1f", cmap="coolwarm")
plt.title('Customer Features Correlation Heatmap')
plt.tight_layout()
plt.savefig("outputs/03_correlation_heatmap.png", dpi=150)
plt.close()
print("Saved → outputs/03_correlation_heatmap.png")

# TotalSpend, TotalPurchases and Income correlate strongly but each covers a
# different RFM dimension — keeping all three

# save selected features list for the next script
pd.Series(high_var_feature).to_csv('outputs/selected_features.csv', index=False, header=False)
df[high_var_feature].to_csv('outputs/data_model_ready.csv', index=False)
print("Selected features saved → outputs/selected_features.csv")
print("Model-ready data saved  → outputs/data_model_ready.csv")