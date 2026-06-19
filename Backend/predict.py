import pandas as pd
from pydantic import BaseModel
from water_calculator import calculate_water_quantity
import uuid
from prediction_store import save_prediction
from datetime import datetime


# Schema des données d'entrée — les 7 features du params_config.yaml
class SensorData(BaseModel):
    Soil_Moisture     : float
    Crop_Growth_Stage : float
    sol_chaud_sec     : float
    Mulching_Used     : float
    Wind_Speed_kmh    : float
    Rainfall_mm       : float
    Temperature_C     : float


def predict_irrigation(data: SensorData, model):
    """
    Prédit si la plante a besoin d'eau
    Si besoin_eau = 1 → calcule la quantité en L/plante/jour
    """

    # ── Étape 1 : Prédiction du modèle RF
    input_df = pd.DataFrame([{
        "Soil_Moisture"     : data.Soil_Moisture,
        "Crop_Growth_Stage" : data.Crop_Growth_Stage,
        "sol_chaud_sec"     : data.sol_chaud_sec,
        "Mulching_Used"     : data.Mulching_Used,
        "Wind_Speed_kmh"    : data.Wind_Speed_kmh,
        "Rainfall_mm"       : data.Rainfall_mm,
        "Temperature_C"     : data.Temperature_C,
    }])

    prediction  = model.predict(input_df)[0]
    probability = model.predict_proba(input_df)[0][1]

    # ── Étape 2 : Si besoin eau → calculer la quantité
    water_info = None

    if prediction == 1:
        water_info = calculate_water_quantity(
            temperature_c      = data.Temperature_C,
            rainfall_mm        = data.Rainfall_mm,
            crop_growth_stage  = data.Crop_Growth_Stage,
            soil_moisture      = data.Soil_Moisture,
            sol_chaud_sec      = data.sol_chaud_sec,
            mulching_used      = data.Mulching_Used,
            wind_speed_kmh     = data.Wind_Speed_kmh
        )

    # ── Étape 3 : Construire la réponse
    response = {
        "besoin_eau"   : int(prediction),
        "label"        : "Besoin eau 💧" if prediction == 1 else "Pas besoin ✅",
        "probabilite"  : round(float(probability), 4),
    }

    # Ajouter le calcul d'eau seulement si besoin = 1
    if water_info:
        response["irrigation"] = water_info


    # Générer un identifiant unique pour cette prédiction
    prediction_id = str(uuid.uuid4())

    # Sauvegarder la prédiction dans le stockage temporaire
    save_prediction(prediction_id, {
        "features": {
            "Soil_Moisture": data.Soil_Moisture,
            "Crop_Growth_Stage": data.Crop_Growth_Stage,
            "sol_chaud_sec": data.sol_chaud_sec,
            "Mulching_Used": data.Mulching_Used,
            "Wind_Speed_kmh": data.Wind_Speed_kmh,
            "Rainfall_mm": data.Rainfall_mm,
            "Temperature_C": data.Temperature_C,
        },
        "prediction": int(prediction),
    })

    # Ajouter l'identifiant dans la réponse envoyée au frontend
    response["prediction_id"] = prediction_id

    return response