from .synthetic_data_generator import generate_network_events
from .train_model import train_random_forest, preprocess, save_model

def run_initial_training():
    df = generate_network_events(5000)
    X, y = preprocess(df)
    model = train_random_forest(X, y)
    save_model(model, "models/rf_model.joblib", {"version": "1.0", "description": "Initial synthetic model"})

if __name__ == "__main__":
    run_initial_training()
