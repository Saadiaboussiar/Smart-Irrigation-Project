import mlflow
import pandas as pd
import yaml
import os
from dotenv import load_dotenv
import mlflow.pyfunc

# =========================
# LOAD CONFIG (BEST PRACTICE)
# =========================
with open("params_config.yaml", "r") as f:
    config = yaml.safe_load(f)

EXP_NAME = config["mlflow"]["experiment_name"]

# =========================
# MLflow setup
# =========================
load_dotenv()

mlflow.set_tracking_uri(
    f"https://dagshub.com/{os.getenv('DAGSHUB_USERNAME')}/{os.getenv('DAGSHUB_REPO_NAME')}.mlflow"
)

exp = mlflow.get_experiment_by_name(EXP_NAME)

if exp is None:
    raise ValueError(f"Experiment '{EXP_NAME}' not found")

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