import pandas as pd
import plotly.express as px
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)


# Functions 

def remove_outliers(df: pd.DataFrame, column: str, upper_limit: float) -> pd.DataFrame:
    """
    Remove rows where a numeric column exceeds a defined upper limit.

    Why this exists:
        Extreme values distort StandardScaler normalization — they compress
        the majority of the data into a narrow band, making most customers
        look identical to the model. Capping at a defensible threshold
        keeps the distribution representative of the actual customer base.

    Args:
        df          : The input DataFrame.
        column      : Name of the column to filter.
        upper_limit : Any row with a value above this threshold is removed.

    Returns:
        Filtered DataFrame with outlier rows dropped.

    Example:
        df = remove_outliers(df, column="Income", upper_limit=200_000)
    """
    original_count = len(df)
    df_filtered = df[df[column] < upper_limit].copy()
    removed = original_count - len(df_filtered)
    print(f"Outlier removal — {column} > {upper_limit:,}: {removed} rows dropped | {len(df_filtered)} retained")
    return df_filtered


def impute_with_median(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """
    Fill missing values in a numeric column with the column median.

    Why this exists:
        When a distribution is right-skewed (as income typically is),
        the mean is pulled upward by extreme values and overestimates
        what a typical customer earns. The median — the middle value
        when all records are sorted — is unaffected by those extremes
        and gives a more honest fill value for missing records.

    Args:
        df     : The input DataFrame.
        column : Name of the column to impute.

    Returns:
        DataFrame with missing values in the specified column filled.

    Example:
        df = impute_with_median(df, column="Income")
    """
    median_value = df[column].median()
    df[column] = df[column].fillna(median_value)
    print(f"Imputation — {column}: median {median_value:,.2f} applied | Remaining nulls: {df[column].isnull().sum()}")
    return df


#  Load 
df = pd.read_csv('data/MARKETING CAMPAIGN DATA.csv')
print(f"Loaded: {df.shape[0]} rows, {df.shape[1]} columns")
df.info()

#  Categorical audit 
print("\nEducation values:\n", df['Education'].value_counts())
print("\nMarital Status values:\n", df['Marital_Status'].value_counts())

# 'Alone', 'Absurd', 'YOLO' carry no distinct behavioral signal
df['Marital_Status'] = df['Marital_Status'].replace(
    {'Alone': 'Single', 'Absurd': 'Single', 'YOLO': 'Single'}
)

# Missing values
print("\nMissing values:\n", df.isnull().sum())
missing_income_pct = df['Income'].isnull().sum() / len(df) * 100
print(f"Income missing: {missing_income_pct:.2f}%")

# Income distribution 
fig_hist = px.histogram(df, x="Income", nbins=50, title="Income Distribution")
fig_hist.write_html("outputs/01_income_distribution.html")
fig_hist.write_image("outputs/01_income_distribution.png")
print("Saved → outputs/01_income_distribution.png")

df = impute_with_median(df, column="Income")

# Outlier inspection 
fig_box = px.box(data_frame=df, x="Income", title="Income Boxplot — Pre-cap")
fig_box.update_layout(xaxis_title="Income (USD)")
fig_box.write_html("outputs/01_income_boxplot.html")
fig_box.write_image("outputs/01_income_boxplot.png")
print("Saved → outputs/01_income_boxplot.png")

df = remove_outliers(df, column="Income", upper_limit=200_000)

# Save
df.to_csv('outputs/data_cleaned.csv', index=False)
print("Cleaned data saved → outputs/data_cleaned.csv")