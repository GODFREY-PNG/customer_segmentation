import pandas as pd
from datetime import datetime
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

os.makedirs("outputs", exist_ok=True)


# Functions

def build_aggregate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Combine raw transactional columns into composite behavioral features.

    Why this exists:
        The raw dataset has 6 separate spend columns, 3 purchase channel
        columns, and 5 campaign response columns. Feeding all of these
        individually into K-Means adds noise and makes clusters harder
        to interpret. Aggregating them into single summary features
        compresses the signal cleanly and maps directly to the RFM
        framework (Recency, Frequency, Monetary) the business uses
        to measure customer value.

    Features created:
        TotalSpend              : Total spend across all product categories (Monetary)
        TotalPurchases          : Total purchases across all channels (Frequency)
        TotalCampaignsAccepted  : Number of campaigns the customer responded to (Engagement)
        EducationLevel          : Education encoded as an ordinal number (1=Basic, 4=PhD)
        CustomerTenure          : Days since the customer first joined (Loyalty)
        Age                     : Customer age derived from birth year (Demographic)

    Args:
        df : Cleaned DataFrame from 01_data_cleaning.py

    Returns:
        DataFrame with six new columns appended.

    Example:
        df = build_aggregate_features(df)
    """
    df['TotalSpend'] = df[[
        'MntWines', 'MntFruits', 'MntMeatProducts',
        'MntFishProducts', 'MntSweetProducts', 'MntGoldProds'
    ]].sum(axis=1)

    df['TotalPurchases'] = df[[
        'NumWebPurchases', 'NumCatalogPurchases', 'NumStorePurchases'
    ]].sum(axis=1)

    df['TotalCampaignsAccepted'] = df[[
        'AcceptedCmp1', 'AcceptedCmp2', 'AcceptedCmp3',
        'AcceptedCmp4', 'AcceptedCmp5'
    ]].sum(axis=1)

    # Ordinal scale: Basic=1 → PhD=4; Master and PhD share tier 4 (no behavioral distinction)
    education_order = {'Basic': 1, '2n Cycle': 2, 'Graduation': 3, 'Master': 4, 'PhD': 4}
    df['EducationLevel'] = df['Education'].map(education_order)

    df['Dt_Customer'] = pd.to_datetime(df['Dt_Customer'], dayfirst=True)
    df['CustomerTenure'] = (pd.Timestamp.now() - df['Dt_Customer']).dt.days

    # Current year pulled dynamically — prevents staleness on notebook reruns
    current_year = datetime.now().year
    df['Age'] = current_year - df['Year_Birth']

    print("Aggregate features built: TotalSpend, TotalPurchases, TotalCampaignsAccepted, "
          "EducationLevel, CustomerTenure, Age")
    return df


def drop_source_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove columns that have been replaced by engineered features or carry no signal.

    Why this exists:
        After aggregation, the original granular columns are redundant.
        Keeping them would double-count behavioral dimensions in the
        distance calculations and inflate the feature space unnecessarily.
        Zero-variance columns (Z_CostContact, Z_Revenue) are constant
        across all records and contribute nothing to cluster separation.

    Columns removed:
        - ID                    : Row identifier, not a behavioral feature
        - Year_Birth            : Replaced by Age
        - Dt_Customer           : Replaced by CustomerTenure
        - Education             : Replaced by EducationLevel
        - Z_CostContact         : Zero variance across all records
        - Z_Revenue             : Zero variance across all records
        - Mnt* columns          : Replaced by TotalSpend
        - NumWeb/Catalog/Store  : Replaced by TotalPurchases
        - AcceptedCmp* columns  : Replaced by TotalCampaignsAccepted

    Args:
        df : DataFrame after aggregate features have been built.

    Returns:
        DataFrame with source and zero-variance columns removed.

    Example:
        df = drop_source_columns(df)
    """
    columns_to_drop = [
        "ID", "Year_Birth", "Z_CostContact", "Z_Revenue", "Dt_Customer", "Education",
        "MntWines", "MntFruits", "MntMeatProducts", "MntFishProducts",
        "MntSweetProducts", "MntGoldProds",
        "NumWebPurchases", "NumCatalogPurchases", "NumStorePurchases",
        "AcceptedCmp1", "AcceptedCmp2", "AcceptedCmp3", "AcceptedCmp4", "AcceptedCmp5"
    ]
    before = df.shape[1]
    df = df.drop(columns=columns_to_drop)
    print(f"Columns dropped: {before - df.shape[1]} | Remaining: {df.shape[1]}")
    print("Columns kept:", df.columns.tolist())
    return df


# Load
df = pd.read_csv('outputs/data_cleaned.csv')
print(f"Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

#  Feature engineering 
df = build_aggregate_features(df)

# Ages above 90 are data entry errors — birth years predate reliable digital records
df = df[df['Age'] <= 90]
print(f"Records after age filter: {len(df)}")

#  Sanity checks 
print("\nEngineered features summary:")
print(df[[
    'TotalSpend', 'TotalPurchases', 'TotalCampaignsAccepted',
    'CustomerTenure', 'EducationLevel', 'Age'
]].describe())

print("\nRFM base features:")
print(df[['Recency', 'TotalPurchases', 'TotalSpend']].describe())

#  Drop source columns 
df = drop_source_columns(df)

#  Save 
df.to_csv('outputs/data_engineered.csv', index=False)
print("Engineered data saved → outputs/data_engineered.csv")