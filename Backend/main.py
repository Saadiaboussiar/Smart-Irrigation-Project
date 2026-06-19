from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from predict import SensorData, predict_irrigation
from model_loader import load_model

# Initialisation FastAPI
app = FastAPI(
    title="Smart Irrigation API",
    description="API de prédiction du besoin en eau des plantes",
    version="1.0.0"
)

# CORS — permet au Frontend de communiquer avec le Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# Charger le modèle au démarrage
print("🔄 Chargement du modèle RF depuis MLflow...")
model = load_model()

# ─────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message"  : "Smart Irrigation API ✅",
        "model"    : "Random Forest",
        "version"  : "1.0.0",
        "endpoint" : "/predict"
    }

@app.post("/predict")
def predict(data: SensorData):
    """
    Prédit si une plante a besoin d'eau

    - **besoin_eau** : 0 = pas besoin, 1 = besoin eau
    - **probabilite** : probabilité d'avoir besoin d'eau
    - **label** : résultat en texte
    """
    try:
        result = predict_irrigation(data, model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))