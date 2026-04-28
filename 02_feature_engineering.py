import pandas as pd
from datetime import datetime
import warnings
import os

warnings.simplefilter(action="ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

#  create output folders 

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# load cleaned data from previous step
df = pd.read_csv('outputs/data_cleaned.csv')

# combine all product spend into one total column
df['TotalSpend'] = df[['MntWines', 'MntFruits', 'MntMeatProducts',
                        'MntFishProducts', 'MntSweetProducts', 'MntGoldProds']].sum(axis=1)

# collapse all purchase channels into one total
df['TotalPurchases'] = df[['NumWebPurchases', 'NumCatalogPurchases',
                            'NumStorePurchases']].sum(axis=1)

# sum accepted campaigns — measures customer engagement
df['TotalCampaignsAccepted'] = df[['AcceptedCmp1', 'AcceptedCmp2',
                                    'AcceptedCmp3', 'AcceptedCmp4', 'AcceptedCmp5']].sum(axis=1)

# map education to numeric — Basic=1 up to PhD=4
education_order = {'Basic': 1, '2n Cycle': 2, 'Graduation': 3, 'Master': 4, 'PhD': 4}
df['EducationLevel'] = df['Education'].map(education_order)

# convert join date to days since joining
df['Dt_Customer'] = pd.to_datetime(df['Dt_Customer'], dayfirst=True)
df['CustomerTenure'] = (pd.Timestamp.now() - df['Dt_Customer']).dt.days

# convert birth year to age
current_year = datetime.now().year
df['Age'] = current_year - df['Year_Birth']

# drop unrealistic ages — anything above 90 is likely a data entry error
df = df[df['Age'] <= 90]

# sanity check for new columns
print(df[['Year_Birth', 'Age']].head())
print("Age stats:", df['Age'].describe())
print(df[['TotalSpend', 'TotalPurchases', 'TotalCampaignsAccepted',
          'CustomerTenure', 'EducationLevel', 'Age']].describe())

# RFM features form the base of the segmentation
rfm_features = df[['Recency', 'TotalPurchases', 'TotalSpend']]
print(rfm_features.describe())

# drop identifier, zero-variance and original columns
print("Columns before drop:", df.shape[1])
df = df.drop(columns=[
    "ID", "Year_Birth", "Z_CostContact", "Z_Revenue", "Dt_Customer",
    "Education",
    "MntWines", "MntFruits", "MntMeatProducts", "MntFishProducts",
    "MntSweetProducts", "MntGoldProds",
    "NumWebPurchases", "NumCatalogPurchases", "NumStorePurchases",
    "AcceptedCmp1", "AcceptedCmp2", "AcceptedCmp3", "AcceptedCmp4", "AcceptedCmp5"
])
print("Columns after drop:", df.shape[1])
print("Remaining columns:", df.columns.tolist())

# save engineered data for the next script
df.to_csv('outputs/data_engineered.csv', index=False)
print("Engineered data saved → outputs/data_engineered.csv")