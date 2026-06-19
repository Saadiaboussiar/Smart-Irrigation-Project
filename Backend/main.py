from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from predict import SensorData, predict_irrigation
from model_loader import load_model
from image_predictor import load_image_model, predict_image
from water_calculator import calculate_water_quantity
from feedback import FeedbackRequest
from prediction_store import get_prediction
from feedback_logger import save_feedback

<<<<<<< HEAD
import json
import os
=======
# ─── Modèles globaux ─────────────────────────────────────────────────────────
model       = None
image_model = None

# ─── Lifespan : chargement au démarrage ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, image_model

    print("🔄 Chargement du modèle XGBoost depuis MLflow...")
    model = load_model()
    print("✅ XGBoost chargé !")

    print("🔄 Chargement du modèle EfficientNet depuis MLflow...")
    # ✅ load_image_model() retourne maintenant le modèle chargé (voir image_predictor.py),
    # donc cette affectation a vraiment un effet. Notez cependant que predict_image()
    # utilise sa PROPRE variable globale interne à image_predictor.py — celle-ci
    # (image_model dans main.py) n'est donc gardée que pour référence/debug,
    # ce n'est pas elle qui sert réellement à la prédiction.
    image_model = load_image_model()
    print("✅ EfficientNet chargé !")

    yield  # ← l'app tourne ici

    print("🛑 Arrêt de l'API")

>>>>>>> 6346a2f0d07eeeae8ffdcef86f553d7a0ca72062

# ─── Initialisation FastAPI ──────────────────────────────────────────────────
app = FastAPI(
    title="Smart Irrigation API",
    description="API de prédiction du besoin en eau — capteurs (XGBoost) + image (EfficientNet)",
    version="2.0.0",
    lifespan=lifespan
)

# ⚠️ allow_origins=["*"] + allow_credentials=True est une combinaison invalide
# côté navigateurs (et risquée en prod). Si tu n'as pas besoin des cookies/credentials
# entre domaines, mets allow_credentials=False. Sinon, remplace "*" par la liste
# exacte des origines autorisées (ex: ton domaine frontend).
app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST","GET"],
    allow_headers=["Content-Type"],
)

# ─── Chargement des modèles au démarrage ────────────────────────────────────
print("🔄 Chargement du modèle XGBoost depuis MLflow...")
model = load_model()


=======
    allow_origins=["*"],
    allow_credentials=False,   # ✅ cohérent avec allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

zones_results = {}
>>>>>>> 6346a2f0d07eeeae8ffdcef86f553d7a0ca72062

# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message"  : "Smart Irrigation API ✅",
        "version"  : "2.0.0",
        "endpoints": {
            "POST /predict"       : "Prédiction via données capteurs (7 features)",
            "POST /predict-image" : "Prédiction maladie + irrigation via photo de plante",
            "POST /feedback"      : "Enregistrer feedback utilisateur",
            "POST /zones/update"  : "Mise à jour zone simulation",
            "GET  /zones"         : "Voir toutes les zones simulation",
        }
    }


@app.post("/predict")
def predict(data: SensorData):
    try:
        result = predict_irrigation(data, model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/zones/update")
def update_zone(data: dict):
    zone_id = data["zone_id"]
    zones_results[zone_id] = data
    return {"message": "ok"}


@app.get("/zones")
def get_zones():
    return zones_results


@app.post("/feedback")
def receive_feedback(request: FeedbackRequest):
    prediction = get_prediction(request.prediction_id)
    if prediction is None:
        raise HTTPException(status_code=404, detail="Prediction ID introuvable.")
    save_feedback(
        prediction_id=request.prediction_id,
        prediction_data=prediction,
    )
    return {"message": "Feedback enregistré avec succès."}


<<<<<<< HEAD
=======
@app.post("/predict-image")
async def predict_from_image(file: UploadFile = File(...)):
    """
    Prédit la maladie de la plante + recommandation irrigation.

    Retourne :
    - **disease**    : nom de la maladie détectée
    - **confidence** : confiance du modèle (0 → 1)
    - **irrigation** : niveau recommandé (LOW / NORMAL / HIGH ...)
    - **reason**     : explication de la recommandation
    """
    # ✅ file.content_type peut être None (client qui n'envoie pas de Content-Type) :
    # on vérifie avant d'appeler .startswith() pour éviter un crash 500 non géré.
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image.")

    try:
        image_bytes = await file.read()
        result = predict_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
>>>>>>> 6346a2f0d07eeeae8ffdcef86f553d7a0ca72062
