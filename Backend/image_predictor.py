"""
Prédiction du besoin en eau via image de plante (EfficientNetB0)
Chargement du modèle depuis MLflow DagsHub via run_id
(modèle loggé dans Experiments, pas dans Registered Models)
"""

import os
import io
import numpy as np
import mlflow.keras
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv

# ─── Labels correspondant aux classes d'entraînement ────────────────────────
# Ordre alphabétique avec flow_from_directory → {"healthy": 0, "needs-water": 1}
CLASS_LABELS = {0: "healthy", 1: "needs-water"}

IMAGE_SIZE = 224

# Variable globale
image_model = None


def load_image_model():
    """
    Charge le modèle EfficientNetB0 depuis MLflow DagsHub via run_id.
    Le run_id est lu depuis le fichier .env (EFFICIENTNET_RUN_ID).
    """
    global image_model

    load_dotenv(
        dotenv_path=Path('C:/Users/user/Desktop/Smart-Irrigation-Project/mlflow_setup/.env'),
        override=True
    )

    dagshub_owner = os.getenv("DAGSHUB_REPO_OWNER")
    dagshub_repo  = os.getenv("DAGSHUB_REPO_NAME")
    dagshub_user  = os.getenv("DAGSHUB_USERNAME")
    dagshub_token = os.getenv("DAGSHUB_USER_TOKEN")
    run_id        = os.getenv("EFFICIENTNET_RUN_ID")   # ← à ajouter dans .env

    if not run_id:
        raise ValueError(
            "❌ EFFICIENTNET_RUN_ID manquant dans le .env\n"
            "   Récupère le run_id depuis DagsHub → Experiments → EfficientNet-SmartIrrigation"
        )

    os.environ["MLFLOW_TRACKING_USERNAME"] = dagshub_user
    os.environ["MLFLOW_TRACKING_PASSWORD"] = dagshub_token

    tracking_uri = f"https://dagshub.com/{dagshub_owner}/{dagshub_repo}.mlflow"
    mlflow.set_tracking_uri(tracking_uri)

    # Chargement via runs:/<run_id>/model
    model_uri = f"runs:/{run_id}/model"
    print(f"🔄 Chargement EfficientNet depuis : {model_uri}")

    image_model = mlflow.keras.load_model(model_uri)
    print("✅ Modèle EfficientNet chargé !")

    return image_model


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Prépare l'image pour l'inférence :
    - Ouvre depuis bytes
    - Convertit en RGB
    - Redimensionne à 224×224
    - Normalise entre 0 et 1
    - Ajoute la dimension batch → shape (1, 224, 224, 3)
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def predict_image(image_bytes: bytes) -> dict:
    """
    Prédit si la plante est saine ou a besoin d'eau.

    Retourne :
    {
        "besoin_eau"  : 0 | 1,
        "label"       : "Pas besoin ✅" | "Besoin eau 💧",
        "probabilite" : float (entre 0 et 1, 4 décimales)
    }
    """
    global image_model
    if image_model is None:
        raise RuntimeError("Le modèle image n'est pas chargé.")

    arr   = preprocess_image(image_bytes)
    probs = image_model.predict(arr)[0]      # shape (2,) → [p_healthy, p_needs-water]
    idx   = int(np.argmax(probs))

    return {
        "besoin_eau"  : idx,
        "label"       : "Besoin eau 💧" if idx == 1 else "Pas besoin ✅",
        "probabilite" : round(float(probs[idx]), 4),
    }