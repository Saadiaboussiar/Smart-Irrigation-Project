# =========================
# INSTALL (if needed)
# =========================
# pip install mlflow dagshub python-dotenv scikit-learn pandas numpy matplotlib seaborn

# =========================
# IMPORTS
# =========================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path

from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report,
    confusion_matrix, roc_curve, auc
)

import mlflow
import mlflow.sklearn
import dagshub
import os
from dotenv import load_dotenv


# =========================
# PATHS
# =========================
BASE_DIR   = Path(__file__).resolve().parent.parent.parent.parent
DATA_PATH  = BASE_DIR / "data" / "sensor_data"
TRAIN_PATH = DATA_PATH / "train_selected.csv"
TEST_PATH  = DATA_PATH / "test_selected.csv"
MODEL_DIR  = Path(__file__).resolve().parent
MODEL_DIR.mkdir(parents=True, exist_ok=True)


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
# NORMALISATION (important pour SVM)
# =========================
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)


# =========================
# MLflow + DagsHub
# =========================
ENV_PATH = BASE_DIR.parent / "mlflow_setup" / ".env"
load_dotenv(ENV_PATH)

dagshub_username   = os.getenv("DAGSHUB_USERNAME")
dagshub_repo_name  = os.getenv("DAGSHUB_REPO_NAME")
dagshub_repo_owner = os.getenv("DAGSHUB_REPO_OWNER")

os.environ["MLFLOW_TRACKING_USERNAME"] = dagshub_username
os.environ["MLFLOW_TRACKING_PASSWORD"] = os.getenv("DAGSHUB_USER_TOKEN")

mlflow.set_tracking_uri(
    f"https://dagshub.com/{dagshub_repo_owner}/{dagshub_repo_name}.mlflow"
)

mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME"))


# =========================
# TRAIN MODEL
# =========================
with mlflow.start_run(run_name="SVM"):

    C      = 1.0
    kernel = "rbf"
    gamma  = "scale"

    mlflow.log_param("model_type", "SVM")
    mlflow.log_param("C", C)
    mlflow.log_param("kernel", kernel)
    mlflow.log_param("gamma", gamma)

    model = SVC(
        C=C,
        kernel=kernel,
        gamma=gamma,
        probability=True,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)

    # =========================
    # PREDICTIONS
    # =========================
    y_pred  = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    # =========================
    # METRICS
    # =========================
    acc       = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall    = recall_score(y_test, y_pred)
    f1        = f1_score(y_test, y_pred)

    cm = confusion_matrix(y_test, y_pred)
    TN, FP, FN, TP = cm.ravel()

    precision_neg = TN / (TN + FN + 1e-9)
    recall_neg    = TN / (TN + FP + 1e-9)

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    roc_auc = auc(fpr, tpr)

    print(f"✅ Accuracy  : {acc:.4f}")
    print(f"✅ Precision : {precision:.4f}")
    print(f"✅ Recall    : {recall:.4f}")
    print(f"✅ F1-Score  : {f1:.4f}")
    print(f"✅ ROC-AUC   : {roc_auc:.4f}")
    print("\n", classification_report(y_test, y_pred))

    # =========================
    # MLflow LOGGING
    # =========================
    mlflow.log_metric("accuracy",      acc)
    mlflow.log_metric("precision_pos", precision)
    mlflow.log_metric("recall_pos",    recall)
    mlflow.log_metric("precision_neg", precision_neg)
    mlflow.log_metric("recall_neg",    recall_neg)
    mlflow.log_metric("f1",            f1)
    mlflow.log_metric("roc_auc",       roc_auc)

    # =========================
    # LOG MODEL
    # =========================
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        registered_model_name="SVM_model"
    )

    # =========================
    # CONFUSION MATRIX
    # =========================
    plt.figure()
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Pas besoin", "Besoin"],
                yticklabels=["Pas besoin", "Besoin"])
    plt.title("Confusion Matrix - SVM")
    plt.ylabel("Réel")
    plt.xlabel("Prédit")
    plt.tight_layout()
    plt.savefig("conf_matrix_svm.png")
    mlflow.log_artifact("conf_matrix_svm.png")
    plt.show()

    # =========================
    # ROC CURVE
    # =========================
    plt.figure()
    plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}", color="blue")
    plt.plot([0, 1], [0, 1], "--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve - SVM")
    plt.legend()
    plt.grid()
    plt.tight_layout()
    plt.savefig("roc_curve_svm.png")
    mlflow.log_artifact("roc_curve_svm.png")
    plt.show()

    print("✅ Run SVM enregistré sur DagsHub MLflow !")