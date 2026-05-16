import dagshub
import mlflow
import os
from dotenv import load_dotenv

load_dotenv()

def init_mlflow():
    # ✅ Authentification correcte
    os.environ["MLFLOW_TRACKING_USERNAME"] = os.getenv("DAGSHUB_USERNAME")      # yass031
    os.environ["MLFLOW_TRACKING_PASSWORD"] = os.getenv("DAGSHUB_USER_TOKEN")    # ton token

    dagshub.init(
        repo_owner=os.getenv("DAGSHUB_REPO_OWNER"),  # Saadiaboussiar
        repo_name=os.getenv("DAGSHUB_REPO_NAME"),    # Smart-Irrigation-Project
        mlflow=True
    )

    mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME"))
    print("✅ MLflow connected to DagsHub!")

init_mlflow()