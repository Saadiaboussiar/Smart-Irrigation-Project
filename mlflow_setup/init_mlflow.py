import dagshub
import mlflow
import os
from dotenv import load_dotenv

load_dotenv()

def init_mlflow():
    os.environ["DAGSHUB_USER_TOKEN"] = os.getenv("DAGSHUB_USER_TOKEN")
    
    dagshub.init(
        repo_owner=os.getenv("DAGSHUB_REPO_OWNER"),
        repo_name=os.getenv("DAGSHUB_REPO_NAME"),
        mlflow=True
    )
    
    mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME"))
    print("✅ MLflow connected to DagsHub!") 