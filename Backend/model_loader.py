import mlflow
import mlflow.sklearn
import os
from dotenv import load_dotenv
from pathlib import Path

def load_model():

    load_dotenv(
        dotenv_path=Path('E:\Smart-Irrigation-Project/mlflow_setup/.env'),
        override=True
    )

    dagshub_owner = os.getenv("DAGSHUB_REPO_OWNER")   # Saadiaboussiar
    dagshub_repo  = os.getenv("DAGSHUB_REPO_NAME")    # Smart-Irrigation-Project
    dagshub_user  = os.getenv("DAGSHUB_USERNAME")     # yass031
    dagshub_token = os.getenv("DAGSHUB_USER_TOKEN")   # ton token

    # Prints de vérification
    print(f"👤 Auth user  : {dagshub_user}")
    print(f"🔑 Token      : {dagshub_token[:6]}...")
    print(f"📦 Repo owner : {dagshub_owner}")

    os.environ["MLFLOW_TRACKING_USERNAME"] = dagshub_user
    os.environ["MLFLOW_TRACKING_PASSWORD"] = dagshub_token

    tracking_uri = f"https://dagshub.com/{dagshub_owner}/{dagshub_repo}.mlflow"
    mlflow.set_tracking_uri(tracking_uri)
    print(f"🔗 URI : {tracking_uri}")
    

    model = mlflow.xgboost.load_model("models:/XGBoost_model/7")

    return model