import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

def load_dataset(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset {path} not found.")
    return pd.read_csv(path)

def preprocess(df: pd.DataFrame):
    df.fillna(0, inplace=True)
    X = df[['bytes_sent', 'bytes_recv', 'duration', 'source_port', 'dest_port']]
    y = df['label'] if 'label' in df.columns else None
    return X, y

def train_random_forest(X_train, y_train):
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    return clf

def train_isolation_forest(X_train):
    clf = IsolationForest(contamination=0.1, random_state=42)
    clf.fit(X_train)
    return clf

def evaluate_model(model, X_test, y_test):
    preds = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, preds))
    print("Report:\n", classification_report(y_test, preds))

def save_model(model, path, metadata):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)
    print(f"Model saved to {path} with metadata {metadata}")

def main():
    print("Training ML Model pipeline initialized.")
    # Assuming dataset exists at data/network_traffic.csv
    # df = load_dataset('data/network_traffic.csv')
    # X, y = preprocess(df)
    # X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    # model = train_random_forest(X_train, y_train)
    # evaluate_model(model, X_test, y_test)
    # save_model(model, 'models/rf_model.joblib', {'version': '1.0'})

if __name__ == "__main__":
    main()
