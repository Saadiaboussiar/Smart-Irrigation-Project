import mlflow
import pandas as pd
import yaml
import os
from dotenv import load_dotenv
import mlflow.pyfunc


# =========================
# MLflow setup
# =========================
load_dotenv()

mlflow.set_tracking_uri(
    f"https://dagshub.com/{os.getenv('DAGSHUB_REPO_OWNER')}/{os.getenv('DAGSHUB_REPO_NAME')}.mlflow"
)

MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME")
exp = mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)

if exp is None:
    raise ValueError(f"Experiment '{MLFLOW_EXPERIMENT_NAME}' not found")

# =========================
# GET RUNS
# =========================
runs = mlflow.search_runs(exp.experiment_id)

# =========================
# SORT BEST MODEL
# =========================
runs = runs.sort_values(
    by=[
        "metrics.recall_pos",
        "metrics.f1",
        "metrics.roc_auc"
    ],
    ascending=False
)

best_run = runs.iloc[0]

model_name = best_run["params.model_type"]

print("BEST MODEL FOUND:")
print("Run ID:", best_run.run_id)
print("Model Type:", model_name)
print("Recall:", best_run["metrics.recall_pos"])
print("F1:", best_run["metrics.f1"])
print("AUC:", best_run["metrics.roc_auc"])

# =========================
# LOAD BEST MODEL
# =========================

from mlflow.tracking import MlflowClient
client = MlflowClient()
# Enregistrer le modèle en Production
client.transition_model_version_stage(
name="XGBoost_model",
version=6,
stage="Production"
)
print(" Modèle xgboost en Production sur DagsHub !")
