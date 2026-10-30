import os
import joblib
import pandas as pd
import numpy as np
from app.database import models

class ThreatDetector:
    def __init__(self, model_path="model.joblib"):
        self.model_path = model_path
        self.model = None
        
    def load_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
        else:
            print(f"Warning: Model not found at {self.model_path}. Using rules engine fallback.")

    def extract_features(self, network_event: models.NetworkEvent) -> pd.DataFrame:
        return pd.DataFrame([{
            'bytes_sent': network_event.bytes_sent,
            'bytes_recv': network_event.bytes_recv,
            'duration': network_event.duration,
            'source_port': network_event.source_port,
            'dest_port': network_event.dest_port
        }])

    def predict(self, features: pd.DataFrame):
        if self.model:
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            confidence = float(max(probabilities))
            
            threat_type = "BENIGN" if prediction == 0 else "ANOMALY"
            if prediction == 1: threat_type = "DDOS"
            elif prediction == 2: threat_type = "PORT_SCAN"
            
            return threat_type, confidence
        
        # Fallback heuristic
        if features['bytes_sent'].iloc[0] > 1000000:
            return "DATA_EXFILTRATION", 0.85
        return "BENIGN", 0.99

    def classify_severity(self, confidence: float, threat_type: str) -> str:
        if threat_type == "BENIGN": return "LOW"
        if threat_type in ["DDOS", "DATA_EXFILTRATION"] and confidence > 0.8: return "CRITICAL"
        if confidence > 0.7: return "HIGH"
        return "MEDIUM"

    def get_detection_reason(self, features: pd.DataFrame, threat_type: str) -> str:
        if threat_type == "DDOS": return "High volume of packets in short duration."
        if threat_type == "PORT_SCAN": return "Sequential port connections detected."
        if threat_type == "DATA_EXFILTRATION": return "Unusually large outbound data transfer."
        return "Traffic matches known benign patterns."

    def run_detection_pipeline(self, network_event: models.NetworkEvent):
        features = self.extract_features(network_event)
        threat_type, confidence = self.predict(features)
        
        if threat_type != "BENIGN":
            severity = self.classify_severity(confidence, threat_type)
            reason = self.get_detection_reason(features, threat_type)
            
            return {
                "threat_type": threat_type,
                "confidence_score": confidence,
                "severity": severity,
                "risk_score": confidence * 100,
                "detection_reason": reason,
                "model_version": "v1.0"
            }
        return None
