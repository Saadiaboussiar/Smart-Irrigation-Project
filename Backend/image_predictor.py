"""
image_predictor.py
Chargement depuis MLflow Model Registry (DagsHub)
artifact_path = "image-model"  ← défini par le code d'entraînement
"""
import tensorflow as tf
import mlflow
import os
import io
import json
import numpy as np
import mlflow.keras
import dagshub
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv

# ─── Chemins JSON locaux ─────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).resolve().parent
CLASSES_PATH    = BASE_DIR / "classes.json"
IRRIGATION_PATH = BASE_DIR / "irrigation_by_disease.json"
ENV_PATH        = BASE_DIR / ".env"   # ✅ chemin relatif au lieu du chemin Windows codé en dur

IMAGE_SIZE = 224

# ─── Variables globales ──────────────────────────────────────────────────────
image_model        = None
idx_to_class        = {}
irrigation_map       = {}   # ✅ ne contiendra QUE les règles par maladie (plus "rules"/"default")
default_irrigation   = {"irrigation": "NORMAL", "reason": "No disease detected"}


def load_image_model():
    global image_model, idx_to_class, irrigation_map, default_irrigation

    # ✅ chemin relatif (fonctionne sur n'importe quelle machine / déploiement)
    load_dotenv(dotenv_path=ENV_PATH, override=True)

    dagshub_user  = os.getenv("DAGSHUB_USERNAME")
    dagshub_token = os.getenv("DAGSHUB_USER_TOKEN")

    # ✅ on évite de crasher avec un message obscur si les credentials manquent
    if not dagshub_user or not dagshub_token:
        raise RuntimeError(
            "❌ DAGSHUB_USERNAME / DAGSHUB_USER_TOKEN manquants. "
            f"Vérifie ton fichier .env (attendu ici : {ENV_PATH})"
        )

    dagshub.init(
        repo_owner="Saadiaboussiar",
        repo_name="Smart-Irrigation-Project",
        mlflow=True
    )

    os.environ["MLFLOW_TRACKING_USERNAME"] = dagshub_user
    os.environ["MLFLOW_TRACKING_PASSWORD"] = dagshub_token

    model_uri = "models:/SmartIrrigation-ImageModel/2"
    print(f"🔄 Chargement depuis MLflow Registry : {model_uri}")

    

    local_path = mlflow.artifacts.download_artifacts(model_uri)
    model_keras_path = str(BASE_DIR / "model_fixed.keras")

    if not os.path.exists(model_keras_path):
        raise FileNotFoundError("Lance fix_model.py d'abord !")
    
    image_model = tf.keras.models.load_model(model_keras_path)

    print("✅ Modèle EfficientNetB0 chargé depuis MLflow !")

    # ─── Classes JSON ────────────────────────────────────────────────────────
    with open(CLASSES_PATH, encoding="utf-8") as f:
        class_indices = json.load(f)
    idx_to_class = {v: k for k, v in class_indices.items()}
    print(f"✅ {len(idx_to_class)} classes chargées")

    # ─── Règles irrigation JSON ──────────────────────────────────────────────
    # ✅ FIX PRINCIPAL : le JSON a la forme {"rules": {...}, "default": {...}}.
    # Avant, on chargeait tout l'objet dans irrigation_map, donc .get(disease)
    # ne trouvait jamais rien (les seules clés étaient "rules" et "default").
    with open(IRRIGATION_PATH, encoding="utf-8") as f:
        irrigation_data = json.load(f)

    irrigation_map     = irrigation_data.get("rules", {})
    default_irrigation = irrigation_data.get(
        "default",
        {"irrigation": "NORMAL", "reason": "No disease detected"}
    )
    print(f"✅ {len(irrigation_map)} règles irrigation chargées")

    return image_model  # ✅ utile pour main.py qui fait image_model = load_image_model()


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    # ⚠️ À vérifier : si le modèle a été entraîné avec
    # tf.keras.applications.efficientnet.preprocess_input plutôt qu'une simple
    # division par 255, il faut utiliser exactement le même preprocessing ici,
    # sinon les prédictions seront décalées par rapport à l'entraînement.
    return np.expand_dims(arr, axis=0)


def predict_image(image_bytes: bytes) -> dict:
    if image_model is None:
        raise RuntimeError("❌ Modèle non chargé.")

    arr        = preprocess_image(image_bytes)
    probs      = image_model.predict(arr)[0]
    idx        = int(np.argmax(probs))
    confidence = round(float(probs[idx]), 4)

    disease         = idx_to_class.get(idx, f"unknown_class_{idx}")
    irrigation_info = irrigation_map.get(disease, default_irrigation)  # ✅ marche maintenant

    return {
        "disease"    : disease,
        "confidence" : confidence,
        "irrigation" : irrigation_info.get("irrigation", "NORMAL"),
        "reason"     : irrigation_info.get("reason", ""),
    }