# =========================
# INSTALL (if needed)
# =========================
#!pip install mlflow dagshub python-dotenv

# =========================
# IMPORTS
# =========================
import pandas as pd
import numpy as np
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report,
    confusion_matrix, roc_curve, auc
)

import xgboost as xgb

import mlflow
import dagshub
import os
from dotenv import load_dotenv


# =========================
# PATHS
# =========================
BASE_DIR = Path.cwd().parent.parent.parent
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
# MLflow + DagsHub
# =========================
load_dotenv()

dagshub_username = os.getenv("DAGSHUB_USERNAME")
dagshub_repo_name = os.getenv("DAGSHUB_REPO_NAME")
dagshub_repo_owner = os.getenv("DAGSHUB_REPO_OWNER")

os.environ["MLFLOW_TRACKING_USERNAME"] = dagshub_username
os.environ["MLFLOW_TRACKING_PASSWORD"] = os.getenv("DAGSHUB_USER_TOKEN")

mlflow.set_tracking_uri(
    f"https://dagshub.com/{dagshub_repo_owner}/{dagshub_repo_name}.mlflow"
)

MLFLOW_EXPERIMENT_NAME=os.getenv("MLFLOW_EXPERIMENT_NAME")

mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)


# =========================
# TRAIN MODEL
# =========================
with mlflow.start_run(run_name="XGBoost"):

    mlflow.log_param("model_type", "xgboost")

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric=["logloss", "error"]
    )

    eval_set = [(X_train, y_train), (X_test, y_test)]

    model.fit(X_train, y_train, eval_set=eval_set, verbose=False)

    # =========================
    # PREDICTIONS
    # =========================
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    # =========================
    # METRICS
    # =========================
    acc = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    TN, FP, FN, TP = confusion_matrix(y_test, y_pred).ravel()

    precision_neg = TN / (TN + FN + 1e-9)
    recall_neg    = TN / (TN + FP + 1e-9)

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    roc_auc = auc(fpr, tpr)

    # =========================
    # MLflow LOGGING
    # =========================
    mlflow.log_metric("accuracy", acc)
    mlflow.log_metric("precision_pos", precision)
    mlflow.log_metric("recall_pos", recall)
    mlflow.log_metric("precision_neg", precision_neg)
    mlflow.log_metric("recall_neg", recall_neg)
    mlflow.log_metric("f1", f1)
    mlflow.log_metric("roc_auc", roc_auc)

    # =========================
    # LOG MODEL
    # =========================
    mlflow.xgboost.log_model(model, artifact_path="model",registered_model_name="XGBoost_model")

    # =========================
    # LOSS & ACCURACY CURVES
    # =========================
    results = model.evals_result()

    train_loss = results["validation_0"]["logloss"]
    val_loss   = results["validation_1"]["logloss"]

    train_acc = [1 - x for x in results["validation_0"]["error"]]
    val_acc   = [1 - x for x in results["validation_1"]["error"]]

    # LOSS
    plt.figure()
    plt.plot(train_loss, label="Train Loss")
    plt.plot(val_loss, label="Val Loss")
    plt.legend()
    plt.title("Loss Curve")
    plt.grid()
    plt.savefig("loss_curve.png")
    mlflow.log_artifact("loss_curve.png")
    plt.show()

    # ACCURACY
    plt.figure()
    plt.plot(train_acc, label="Train Accuracy")
    plt.plot(val_acc, label="Val Accuracy")
    plt.legend()
    plt.title("Accuracy Curve")
    plt.grid()
    plt.savefig("accuracy_curve.png")
    mlflow.log_artifact("accuracy_curve.png")
    plt.show()


    # =========================
    # CONFUSION MATRIX
    # =========================
    plt.figure()
    sns.heatmap(confusion_matrix(y_test, y_pred),
                annot=True, fmt="d", cmap="Blues")
    plt.title("Confusion Matrix")
    plt.savefig("conf_matrix.png")
    mlflow.log_artifact("conf_matrix.png")
    plt.show()

    # =========================
    # ROC CURVE
    # =========================
    plt.figure()
    plt.plot(fpr, tpr, label=f"AUC={roc_auc:.3f}")
    plt.plot([0,1],[0,1],"--")
    plt.legend()
    plt.title("ROC Curve")
    plt.grid()
    plt.savefig("roc_curve.png")
    mlflow.log_artifact("roc_curve.png")
    plt.show()
