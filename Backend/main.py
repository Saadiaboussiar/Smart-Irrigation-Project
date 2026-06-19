from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from predict import SensorData, predict_irrigation
from model_loader import load_model
from image_predictor import load_image_model, predict_image

from water_calculator import calculate_water_quantity
from feedback import FeedbackRequest
from prediction_store import get_prediction
from feedback_logger import save_feedback

# ─── Initialisation FastAPI ──────────────────────────────────────────────────
app = FastAPI(
    title="Smart Irrigation API",
    description="API de prédiction du besoin en eau — capteurs (RF) + image (EfficientNet)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# ─── Chargement des modèles au démarrage ────────────────────────────────────
print("🔄 Chargement du modèle XGBoost depuis MLflow...")
model = load_model()

# après load_model()
print("🔄 Chargement du modèle EfficientNet...")
image_model = load_image_model()



# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message"  : "Smart Irrigation API ✅",
        "version"  : "2.0.0",
        "endpoints": {
            "POST /predict"       : "Prédiction via données capteurs (7 features)",
            "POST /predict-image" : "Prédiction via photo de plante (EfficientNet)",
            "POST /feedback"      : "Enregistrer feedback utilisateur",
            "POST /zones/update"  : "Mise à jour zone simulation",
            "GET  /zones"         : "Voir toutes les zones simulation",
        }
    }


@app.post("/predict")
def predict(data: SensorData):
    """
    Prédit si une plante a besoin d'eau à partir des capteurs.

    - **besoin_eau** : 0 = pas besoin, 1 = besoin eau
    - **probabilite** : probabilité d'avoir besoin d'eau
    - **label** : résultat en texte
    - **irrigation** : quantité en L/plante/jour (seulement si besoin_eau = 1)
    """
    try:
        result = predict_irrigation(data, model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

zones_results = {}

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
        raise HTTPException(
            status_code=404,
            detail="Prediction ID introuvable."
        )

    save_feedback(
        prediction_id=request.prediction_id,
        prediction_data=prediction,
    )

    return {
        "message": "Feedback enregistré avec succès."
    }


@app.post("/predict-image")
async def predict_from_image(file: UploadFile = File(...)):
    """
    Prédit si une plante a besoin d'eau à partir d'une photo.
    - **besoin_eau** : 0 = saine, 1 = besoin eau
    - **label** : résultat en texte
    - **probabilite** : confiance du modèle
    """
    try:
        image_bytes = await file.read()
        result = predict_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))