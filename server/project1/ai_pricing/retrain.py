import pandas as pd
import pickle
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv("kozhikode properties.csv")

# Drop rows with missing values
df = df.dropna(subset=["locality", "apartment_type", "bhk", "floor", "rent"])

# Encode locality
le_locality = LabelEncoder()
df["locality_code"] = le_locality.fit_transform(df["locality"])

# Encode apartment type
le_apt = LabelEncoder()
df["apartment_code"] = le_apt.fit_transform(df["apartment_type"])

locality_map  = dict(zip(le_locality.classes_, le_locality.transform(le_locality.classes_)))
apartment_map = dict(zip(le_apt.classes_,      le_apt.transform(le_apt.classes_)))

X = df[["bhk", "locality_code", "apartment_code", "floor"]]
y = df["rent"]

model = GradientBoostingRegressor()
model.fit(X, y)

with open("rentlyx_model_.pkl", "wb") as f:
    pickle.dump({
        "model":         model,
        "locality_map":  locality_map,
        "apartment_map": apartment_map
    }, f)

print(" Model retrained and saved!")