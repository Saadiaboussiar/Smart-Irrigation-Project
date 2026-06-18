from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from predict import SensorData, predict_irrigation
from model_loader import load_model
from image_predictor import load_image_model, predict_image
from water_calculator import calculate_water_quantity
from feedback import FeedbackRequest
from prediction_store import prediction_store
from feedback_logger import save_feedback

# ─── Initialisation FastAPI ──────────────────────────────────────────────────
app = FastAPI(
    title="Smart Irrigation API",
    description="API de prédiction du besoin en eau — capteurs (RF) + image (EfficientNet)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Chargement des modèles au démarrage ────────────────────────────────────
print("🔄 Chargement du modèle RF depuis MLflow...")
model = load_model()

print("🔄 Chargement du modèle EfficientNet depuis MLflow...")
load_image_model()

# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message"  : "Smart Irrigation API ✅",
        "version"  : "2.0.0",
        "endpoints": {
            "POST /predict"      : "Prédiction via données capteurs (7 features)",
            "POST /predict/image": "Prédiction via image de plante (JPEG/PNG)",
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


@app.post("/predict/image")
async def predict_image_endpoint(file: UploadFile = File(...)):
    """
    Prédit si une plante a besoin d'eau à partir d'une image.

    - Envoyer une image JPEG ou PNG en multipart/form-data (clé : `file`)
    - **besoin_eau** : 0 = healthy, 1 = needs-water
    - **label** : résultat en texte
    - **probabilite** : confiance du modèle
    - **irrigation** : quantité FAO Blaney-Criddle (seulement si besoin_eau = 1,
                       avec valeurs météo par défaut — Maroc/zones arides)
    """
    # Vérification du type MIME
    if file.content_type not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Envoyer une image JPEG ou PNG."
        )

    try:
        image_bytes = await file.read()
        result = predict_image(image_bytes)

        # Si la plante a besoin d'eau → calcul FAO avec valeurs par défaut
        # (pas de capteurs disponibles dans ce mode)
        if result["besoin_eau"] == 1:
            water_info = calculate_water_quantity(
                temperature_c     = 28.0,   # température moyenne Maroc été
                rainfall_mm       = 0.0,    # pas de pluie par défaut
                crop_growth_stage = 3.0,    # mi-saison (pic besoin eau)
                soil_moisture     = 30.0,   # sol sec
                sol_chaud_sec     = 1.0,    # sol chaud et sec
                mulching_used     = 0.0,
                wind_speed_kmh    = 15.0,
            )
            result["irrigation"] = water_info

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/feedback")
def receive_feedback(request: FeedbackRequest):

    if request.prediction_id not in prediction_store:

        raise HTTPException(
            status_code=404,
            detail="Prediction ID introuvable."
        )

    prediction = prediction_store[request.prediction_id]

    save_feedback(

        prediction_id=request.prediction_id,

        prediction_data=prediction,

        feedback=request.feedback,

        comment=request.comment

    )

    return {
        "message": "Feedback enregistré avec succès."
    }