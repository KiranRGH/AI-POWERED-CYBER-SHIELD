import pandas as pd
import numpy as np

def generate_network_events(n=1000):
    np.random.seed(42)
    data = {
        'bytes_sent': np.random.randint(100, 10000, n),
        'bytes_recv': np.random.randint(100, 10000, n),
        'duration': np.random.uniform(0.1, 10.0, n),
        'source_port': np.random.randint(1024, 65535, n),
        'dest_port': np.random.choice([80, 443, 22, 21, 3306], n),
        'label': np.random.choice([0, 1, 2], n, p=[0.9, 0.05, 0.05])
    }
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df = generate_network_events()
    df.to_csv("synthetic_network_traffic.csv", index=False)
    print("Synthetic data generated.")
