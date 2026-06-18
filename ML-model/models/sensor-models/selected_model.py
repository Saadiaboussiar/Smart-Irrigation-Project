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

print("Model Type:", model_name)
print("BEST MODEL FOUND:")
print("Run ID:", best_run.run_id)
print("Recall:", best_run["metrics.recall_pos"])
print("F1:", best_run["metrics.f1"])
print("AUC:", best_run["metrics.roc_auc"])

# =========================
# LOAD BEST MODEL
# =========================
model_uri = f"runs:/{best_run.run_id}/model"
best_model = mlflow.pyfunc.load_model(model_uri)

# =========================
# REGISTER AS PRODUCTION
# =========================
mlflow.register_model(
    model_uri,
    name="SmartIrrigationModel"
)
