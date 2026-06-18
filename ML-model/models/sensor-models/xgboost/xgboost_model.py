# =========================
# IMPORTS
# =========================
import pandas as pd
import numpy as np
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import os
import yaml

from pathlib import Path
from dotenv import load_dotenv

import xgboost as xgb
import mlflow
import dagshub

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_curve,
    auc
)

# =========================
# LOAD CONFIG
# =========================
with open("../params_config.yaml", "r") as f:
    config = yaml.safe_load(f)

EXP_NAME = config["mlflow"]["experiment_name"]
RANDOM_STATE = config["project"]["random_state"]

# =========================
# PATHS
# =========================
BASE_DIR = Path.cwd().parent.parent
DATA_PATH = BASE_DIR / "data" / "sensor_data"

TRAIN_PATH = DATA_PATH / "train_selected.csv"
TEST_PATH  = DATA_PATH / "test_selected.csv"

MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODEL_DIR / "xgboost_model.pkl"

# =========================
# LOAD DATA
# =========================
train_df = pd.read_csv(TRAIN_PATH)
test_df  = pd.read_csv(TEST_PATH)

TARGET = "besoin_eau"

X_train = train_df.drop(columns=[TARGET])
y_train = train_df[TARGET]

X_test = test_df.drop(columns=[TARGET])
y_test = test_df[TARGET]

# =========================
# MLflow + DagsHub SETUP
# =========================
load_dotenv()

username = os.getenv("DAGSHUB_USERNAME")
repo = os.getenv("DAGSHUB_REPO_NAME")
token = os.getenv("DAGSHUB_USER_TOKEN")

os.environ["MLFLOW_TRACKING_USERNAME"] = username
os.environ["MLFLOW_TRACKING_PASSWORD"] = token

mlflow.set_tracking_uri(f"https://dagshub.com/{username}/{repo}.mlflow")
mlflow.set_experiment(EXP_NAME)

dagshub.init(repo_owner=username, repo_name=repo, mlflow=True)

# =========================
# TRAIN MODEL
# =========================
with mlflow.start_run(run_name="xgboost"):

    # IMPORTANT: model type for comparison
    mlflow.log_param("model_type", "xgboost")

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        eval_metric="logloss"
    )

    eval_set = [(X_train, y_train), (X_test, y_test)]
    model.fit(X_train, y_train, eval_set=eval_set, verbose=False)

    # =========================
    # PREDICTIONS
    # =========================
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    # =========================
    # STANDARDIZED METRICS (CRITICAL FOR COMPARISON)
    # =========================
    acc = accuracy_score(y_test, y_pred)
    precision_pos = precision_score(y_test, y_pred)
    recall_pos = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = auc(*roc_curve(y_test, y_proba)[:2])

    TN, FP, FN, TP = confusion_matrix(y_test, y_pred).ravel()

    precision_neg = TN / (TN + FN + 1e-9)
    recall_neg = TN / (TN + FP + 1e-9)

    # =========================
    # LOG METRICS (STANDARDIZED NAMES)
    # =========================
    mlflow.log_metrics({
        "accuracy": acc,
        "precision_pos": precision_pos,
        "recall_pos": recall_pos,
        "precision_neg": precision_neg,
        "recall_neg": recall_neg,
        "f1": f1,
        "roc_auc": roc_auc
    })

    # =========================
    # SAVE MODEL (MLFLOW ONLY)
    # =========================
    mlflow.xgboost.log_model(model, artifact_path="model")

    # =========================
    # CURVES (OPTIONAL VISUALS)
    # =========================
    results = model.evals_result()

    train_loss = results["validation_0"]["logloss"]
    val_loss   = results["validation_1"]["logloss"]

    train_acc = [1 - x for x in results["validation_0"]["error"]]
    val_acc   = [1 - x for x in results["validation_1"]["error"]]

    plt.figure()
    plt.plot(train_loss, label="Train Loss")
    plt.plot(val_loss, label="Val Loss")
    plt.legend()
    plt.title("Loss Curve")
    plt.grid()
    plt.savefig("loss_curve.png")
    mlflow.log_artifact("loss_curve.png")

    plt.figure()
    plt.plot(train_acc, label="Train Accuracy")
    plt.plot(val_acc, label="Val Accuracy")
    plt.legend()
    plt.title("Accuracy Curve")
    plt.grid()
    plt.savefig("accuracy_curve.png")
    mlflow.log_artifact("accuracy_curve.png")

    # =========================
    # CONFUSION MATRIX
    # =========================
    plt.figure()
    sns.heatmap(confusion_matrix(y_test, y_pred),
                annot=True, fmt="d", cmap="Blues")
    plt.title("Confusion Matrix")
    plt.savefig("conf_matrix.png")
    mlflow.log_artifact("conf_matrix.png")