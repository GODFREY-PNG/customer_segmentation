import pandas as pd
import plotly.express as px
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ── create output folders if they don't exist ──────────────────────────────
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# read the dataset into a dataframe
df = pd.read_csv('data/MARKETING CAMPAIGN DATA.csv')

# check column types and spot missing values
print(df.info())

# scan categorical columns for unexpected entries
print("Education values:")
print(df['Education'].value_counts())
print()
print("Marital Status values:")
print(df['Marital_Status'].value_counts())

# odd values like 'YOLO' and 'Absurd' don't fit — mapping them to 'Single'
df['Marital_Status'] = df['Marital_Status'].replace(
    {'Alone': 'Single', 'Absurd': 'Single', 'YOLO': 'Single'}
)

# check for missing values across all columns
print(df.isnull().sum())

# income missing percentage
missing_income = df['Income'].isnull().sum()
print(f"Income missing: {missing_income / len(df) * 100:.2f}%")

# plot income distribution to decide the best imputation strategy
fig_hist = px.histogram(df, x="Income", nbins=50, title="Income Distribution")
fig_hist.write_html("outputs/01_income_distribution.html")
fig_hist.write_image("outputs/01_income_distribution.png")
print("Saved → outputs/01_income_distribution.png")

# ~1% missing — using median since income is right-skewed
median_income = df["Income"].median()
df["Income"] = df["Income"].fillna(median_income)
print(f"Median used: {median_income}")
print("Missing after fill:", df['Income'].isnull().sum())

# boxplot to spot income outliers
fig_box = px.box(data_frame=df, x="Income", title="Income Boxplot")
fig_box.update_layout(xaxis_title="Income[$]")
fig_box.write_html("outputs/01_income_boxplot.html")
fig_box.write_image("outputs/01_income_boxplot.png")
print("Saved → outputs/01_income_boxplot.png")

# drop income values above 200k — too extreme to be realistic
df = df[df['Income'] < 200_000]

# save cleaned data for the next script
df.to_csv('outputs/data_cleaned.csv', index=False)
print("Cleaned data saved → outputs/data_cleaned.csv")