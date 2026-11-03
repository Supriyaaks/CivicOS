"""
Predictive Intelligence & Machine Learning Engine
-------------------------------------------------
Feature Addressed:
- Feature 3: Predictive Intelligence

Trains and serves a Scikit-learn classification model to forecast
the likelihood of an urban incident cascading into secondary failures.
Includes:
- Robust preprocessing using Scikit-learn Pipelines and ColumnTransformer.
- Handling of unknown categorical values during inference.
- Model persistence using joblib.
- Comprehensive evaluation metrics including ROC-AUC.
"""

import os
import joblib
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, classification_report
)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

# ===========================================================================
# FEATURE DEFINITIONS & DATA LEAKAGE CONTROLS
# ===========================================================================

NUMERICAL_FEATURES = [
    "severity_score",
    "impact_radius_meters",
    "affected_population",
    "rainfall_mm",
    "wind_speed_kmh",
    "temperature_c",
    "humidity_pct",
]

CATEGORICAL_FEATURES = [
    "incident_type",
    "category",
    "zone",
]

TARGET_COLUMN = "cascading_risk_flag"

# Path for model persistence
MODEL_PATH = "data/processed/risk_model.joblib"
METADATA_PATH = "data/processed/model_metadata.joblib"

class PredictiveRiskEngine:
    """
    Professional ML classification engine for urban risk prediction.
    Uses a Pipeline to ensure consistent preprocessing between training and inference.
    """

    def __init__(self):
        self.is_trained: bool = False
        self.pipeline: Optional[Pipeline] = None
        self.metrics: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.feature_importances: List[Dict[str, Any]] = []
        self.training_summary: Dict[str, Any] = {}

    def _build_pipeline(self) -> Pipeline:
        """
        Creates a Scikit-learn pipeline for preprocessing and classification.
        """
        # Numerical: Impute missing with median -> Scale
        num_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        # Categorical: Impute missing -> One-Hot Encode (ignore unknown categories in test/prod)
        cat_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='Unknown')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', num_transformer, NUMERICAL_FEATURES),
                ('cat', cat_transformer, CATEGORICAL_FEATURES)
            ]
        )

        return Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', RandomForestClassifier(
                n_estimators=100,
                max_depth=5,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=42
            ))
        ])

    def train(self, df: pd.DataFrame, test_size: float = 0.25, random_state: int = 42) -> Dict[str, Any]:
        """
        Train the risk prediction pipeline.
        """
        if TARGET_COLUMN not in df.columns:
            raise ValueError(f"Target column '{TARGET_COLUMN}' not found in DataFrame.")

        X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
        y = df[TARGET_COLUMN].astype(int)

        # Stratified split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_state,
            stratify=y
        )

        self.pipeline = self._build_pipeline()
        self.pipeline.fit(X_train, y_train)
        self.is_trained = True

        # --- Evaluation ---
        y_pred = self.pipeline.predict(X_test)
        y_prob = self.pipeline.predict_proba(X_test)[:, 1]

        # Detailed Metrics
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_prob))

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        # Cross-Validation for robustness
        cv_scores = cross_val_score(self.pipeline, X, y, cv=5, scoring='f1')

        # Extract feature importances from RF (after preprocessor)
        rf_model = self.pipeline.named_steps['classifier']
        preprocessor = self.pipeline.named_steps['preprocessor']

        # Get categorical feature names from OneHotEncoder
        cat_encoder = preprocessor.named_transformers_['cat'].named_steps['onehot']
        cat_features = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES)
        all_features = NUMERICAL_FEATURES + list(cat_features)

        importances = rf_model.feature_importances_
        self.feature_names = all_features

        importance_list = [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in zip(all_features, importances)
        ]
        importance_list.sort(key=lambda x: x["importance"], reverse=True)
        self.feature_importances = importance_list

        cm_dict = {
            "true_negative": int(tn), "false_positive": int(fp),
            "false_negative": int(fn), "true_positive": int(tp),
            "true_negatives": int(tn), "false_positives": int(fp),
            "false_negatives": int(fn), "true_positives": int(tp)
        }

        self.metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "confusion_matrix": cm_dict,
            "cv_f1_mean": round(float(np.mean(cv_scores)), 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test)
        }

        self.training_summary = {
            "algorithm": "RandomForestClassifier via Pipeline",
            "total_records": len(df),
            "metrics": self.metrics,
            # Top-level flattened aliases for direct consumer and dashboard access:
            "test_accuracy": round(acc, 4),
            "test_precision": round(prec, 4),
            "test_recall": round(rec, 4),
            "test_f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm_dict,
            "feature_importances": importance_list,
            "top_features": importance_list[:6]
        }

        self.save_model()
        return self.training_summary

    def save_model(self):
        """Persists the trained pipeline and metadata to disk."""
        try:
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            joblib.dump(self.pipeline, MODEL_PATH)
            joblib.dump({
                "metrics": self.metrics,
                "feature_names": self.feature_names,
                "feature_importances": self.feature_importances,
                "summary": self.training_summary
            }, METADATA_PATH)
        except Exception as e:
            print(f"Error saving model: {e}")

    def load_model(self) -> bool:
        """Loads the trained pipeline and metadata from disk."""
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
                self.pipeline = joblib.load(MODEL_PATH)
                metadata = joblib.load(METADATA_PATH)
                self.metrics = metadata.get("metrics", {})
                self.feature_names = metadata.get("feature_names", [])
                self.feature_importances = metadata.get("feature_importances", [])
                self.training_summary = metadata.get("summary", {})
                if not self.feature_importances and "top_features" in self.training_summary:
                    self.feature_importances = self.training_summary.get("top_features", [])
                self.is_trained = True
                return True
        except Exception as e:
            print(f"Error loading model: {e}")
        return False

    def predict(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict cascading failure probability using the trained pipeline.
        """
        if not self.is_trained or self.pipeline is None:
            # Attempt to load from disk if not in memory
            if not self.load_model():
                raise RuntimeError("Model is not trained and no saved model was found.")

        # Create DataFrame from input
        input_df = pd.DataFrame([incident_data])

        # Ensure all required features are present (fill with NaN if missing, pipeline handles it)
        for col in NUMERICAL_FEATURES + CATEGORICAL_FEATURES:
            if col not in input_df.columns:
                input_df[col] = np.nan

        # Select features in correct order
        X_single = input_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]

        # Predict
        prob = float(self.pipeline.predict_proba(X_single)[0, 1])
        prediction = int(prob >= 0.50)

        # Risk tiering
        if prob >= 0.75:
            risk_tier, color = "CRITICAL CASCADE RISK", "#DC2626"
            rec = "Immediate multi-agency emergency intervention required to arrest cascade."
        elif prob >= 0.50:
            risk_tier, color = "HIGH CASCADE RISK", "#EA580C"
            rec = "Deploy proactive zonal barricading and rapid containment squads."
        elif prob >= 0.30:
            risk_tier, color = "MODERATE PROPAGATION RISK", "#0284C7"
            rec = "Standard dispatch protocol with monitoring of nearby infrastructure."
        else:
            risk_tier, color = "LOW PROPAGATION RISK", "#10B981"
            rec = "Isolated incident with minimal probability of secondary failure."

        # Local feature influence (Approximate using feature importances and input)
        # In a real scenario, SHAP would be used here.
        active_factors = []
        # We can't easily do SHAP without the library, so we use global importances
        # as a proxy for "what the model generally cares about" for this specific input.
        if hasattr(self, 'training_summary') and 'top_features' in self.training_summary:
            for item in self.training_summary['top_features']:
                feat = item['feature']
                # Extract actual value from input_data
                # Handle the OHE names if necessary
                val = "N/A"
                for orig_feat in NUMERICAL_FEATURES + CATEGORICAL_FEATURES:
                    if feat.startswith(orig_feat):
                        val = incident_data.get(orig_feat, "Unknown")
                        break

                active_factors.append({
                    "factor": feat,
                    "importance_weight": item["importance"],
                    "input_value": val
                })

        return {
            "cascading_risk_prediction": prediction,
            "cascading_probability": round(prob, 4),
            "risk_percentage": round(prob * 100, 1),
            "risk_tier": risk_tier,
            "tier_color": color,
            "recommended_stance": rec,
            "influencing_features": active_factors,
            "model_metadata": {
                "algorithm": "Random Forest Classifier (via Pipeline)",
                "test_accuracy": self.metrics.get("accuracy"),
                "test_f1": self.metrics.get("f1_score"),
                "roc_auc": self.metrics.get("roc_auc")
            }
        }
