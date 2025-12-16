import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from pathlib import Path
from app.config import settings
import asyncio

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_buffer = []
        self.max_buffer_size = 1000
        self.is_trained = False
        self.model_path = Path(settings.ML_MODEL_PATH)
        
        # Try to load existing model
        self.load_model()
        
        # If no model exists, initialize a new one
        if self.model is None:
            self.model = IsolationForest(
                contamination=0.1,  # 10% of data considered anomalies
                random_state=42,
                n_estimators=100
            )
    
    def extract_features(self, data: dict) -> np.ndarray:
        """Extract features from motor reading data"""
        features = [
            # Average voltage across phases
            (data["voltage_a"] + data["voltage_b"] + data["voltage_c"]) / 3,
            # Average current across phases
            (data["current_a"] + data["current_b"] + data["current_c"]) / 3,
            # Average power across phases
            (data["power_a"] + data["power_b"] + data["power_c"]) / 3,
            # Average frequency across phases
            (data["frequency_a"] + data["frequency_b"] + data["frequency_c"]) / 3,
            # Average power factor across phases
            (data["pf_a"] + data["pf_b"] + data["pf_c"]) / 3,
            # Motor metrics
            data["temperature"],
            data["vibration"],
            data["rpm"],
            # Phase imbalance indicators
            abs(data["voltage_a"] - data["voltage_b"]),
            abs(data["voltage_b"] - data["voltage_c"]),
            abs(data["voltage_c"] - data["voltage_a"]),
            abs(data["current_a"] - data["current_b"]),
            abs(data["current_b"] - data["current_c"]),
            abs(data["current_c"] - data["current_a"]),
        ]
        return np.array(features).reshape(1, -1)
    
    async def detect_anomaly(self, data: dict) -> tuple[float, bool]:
        """
        Detect if the current reading is anomalous
        Returns: (anomaly_score, is_anomaly)
        """
        try:
            features = self.extract_features(data)
            
            # Add to buffer for future training
            self.feature_buffer.append(features[0])
            if len(self.feature_buffer) > self.max_buffer_size:
                self.feature_buffer.pop(0)
            
            # If model is not trained and we have enough data, train it
            if not self.is_trained and len(self.feature_buffer) >= 100:
                await self.train_model()
            
            # If model is trained, make prediction
            if self.is_trained:
                # Scale features
                features_scaled = self.scaler.transform(features)
                
                # Predict (-1 for anomaly, 1 for normal)
                prediction = self.model.predict(features_scaled)[0]
                
                # Get anomaly score (lower is more anomalous)
                score = self.model.score_samples(features_scaled)[0]
                
                # Convert score to 0-1 range (higher means more anomalous)
                # Typical scores range from -0.5 to 0.5
                normalized_score = max(0, min(1, (-score + 0.5)))
                
                is_anomaly = prediction == -1
                
                return normalized_score, is_anomaly
            else:
                # Not enough data to make prediction yet
                return 0.0, False
                
        except Exception as e:
            print(f"Error in anomaly detection: {e}")
            return 0.0, False
    
    async def train_model(self):
        """Train the anomaly detection model with buffered data"""
        try:
            if len(self.feature_buffer) < 100:
                print("Not enough data to train model")
                return
            
            print(f"Training anomaly detection model with {len(self.feature_buffer)} samples...")
            
            # Prepare training data
            X = np.array(self.feature_buffer)
            
            # Fit scaler
            self.scaler.fit(X)
            X_scaled = self.scaler.transform(X)
            
            # Train model
            self.model.fit(X_scaled)
            self.is_trained = True
            
            # Save model
            self.save_model()
            
            print("Model training complete")
            
        except Exception as e:
            print(f"Error training model: {e}")
    
    def save_model(self):
        """Save model and scaler to disk"""
        try:
            self.model_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'is_trained': self.is_trained
            }, self.model_path)
            print(f"Model saved to {self.model_path}")
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def load_model(self):
        """Load model and scaler from disk"""
        try:
            if self.model_path.exists():
                data = joblib.load(self.model_path)
                self.model = data['model']
                self.scaler = data['scaler']
                self.is_trained = data['is_trained']
                print(f"Model loaded from {self.model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            self.model = None
