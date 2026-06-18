import json
import time
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime

from weather_service import WeatherService
from rice_zone       import RiceZone
from maize_zone      import MaizeZone
from potato_zone     import PotatoZone
from wheat_zone      import WheatZone
from sugarcane_zone  import SugarcaneZone


# =====================================================================
# CONFIG
# =====================================================================

UPDATE_INTERVAL_SECONDS = 900           # 15 minutes
BACKEND_URL = "http://localhost:8000/predict"

# Path to the encoders.json produced by prepare.py
# Adjust if your working directory differs
ENCODERS_PATH = Path(__file__).resolve().parent.parent / \
    "ML-model" / "data" / "sensor_data" / "encoders.json"

# The exact 7 features SensorData (Pydantic) expects — flat, no nesting
FEATURE_KEYS = [
    "Soil_Moisture",
    "Crop_Growth_Stage",
    "sol_chaud_sec",
    "Mulching_Used",
    "Wind_Speed_kmh",
    "Rainfall_mm",
    "Temperature_C",
]


# =====================================================================
# ENCODER LOADER
# =====================================================================

def load_encoders(path: Path) -> dict:
    """
    Load encoders.json saved by prepare.py.
    Structure: { "Crop_Growth_Stage": { "Flowering": 0, "Vegetative": 1, ... }, ... }
    Raises a clear error if the file is missing so the engine fails fast.
    """
    if not path.exists():
        raise FileNotFoundError(
            f"encoders.json not found at {path}\n"
            "Run prepare.py first to generate it."
        )
    with open(path, "r", encoding="utf-8") as f:
        encoders = json.load(f)
    print(f"✅ Encoders loaded from {path}")
    print(f"   Crop_Growth_Stage mapping → {encoders.get('Crop_Growth_Stage', {})}")
    return encoders


def encode_crop_growth_stage(stage: str, mapping: dict) -> float:
    """
    Encode a string growth stage using the exact LabelEncoder mapping
    saved by prepare.py.

    Raises KeyError with a helpful message if the stage is unknown,
    so you know immediately which zone is returning an unexpected value.
    """
    stage_str = str(stage)
    if stage_str not in mapping:
        raise KeyError(
            f"Unknown Crop_Growth_Stage value: '{stage_str}'. "
            f"Valid values are: {list(mapping.keys())}"
        )
    return float(mapping[stage_str])


# =====================================================================
# ENGINE
# =====================================================================

class SimulationEngine:

    def __init__(self):
        self.weather_service = WeatherService()

        # Load encoders.json once at startup — same mapping used in training
        encoders = load_encoders(ENCODERS_PATH)
        self.crop_growth_stage_map: dict = encoders["Crop_Growth_Stage"]

        # 🌾 Rice zones
        self.rice_zones = [
            RiceZone("Rice_Zone_A"),
            RiceZone("Rice_Zone_B"),
            RiceZone("Rice_Zone_C"),
        ]

        # 🌽 Maize zones
        self.maize_zones = [
            MaizeZone("Maize_Zone_A"),
            MaizeZone("Maize_Zone_B"),
            MaizeZone("Maize_Zone_C"),
        ]

        # 🥔 Potato zones
        self.potato_zones = [
            PotatoZone("Potato_Zone_A"),
            PotatoZone("Potato_Zone_B"),
            PotatoZone("Potato_Zone_C"),
        ]

        # 🌾 Wheat zones
        self.wheat_zones = [
            WheatZone("Wheat_Zone_A"),
            WheatZone("Wheat_Zone_B"),
            WheatZone("Wheat_Zone_C"),
        ]

        # 🍬 Sugarcane zones
        self.sugarcane_zones = [
            SugarcaneZone("Sugarcane_Zone_A"),
            SugarcaneZone("Sugarcane_Zone_B"),
            SugarcaneZone("Sugarcane_Zone_C"),
        ]

    # -----------------------------------------------------------------
    # ALL ZONES — flat list for iteration
    # -----------------------------------------------------------------

    def all_zones(self):
        return (
            self.rice_zones
            + self.maize_zones
            + self.potato_zones
            + self.wheat_zones
            + self.sugarcane_zones
        )

    # -----------------------------------------------------------------
    # SEND TO BACKEND
    # -----------------------------------------------------------------

    def send_to_backend(self, features: dict, metadata: dict):
        """
        POST the 7 ML features FLAT to FastAPI /predict.

        The SensorData Pydantic model expects a flat JSON body:
        {
            "Soil_Moisture":     85.3,
            "Crop_Growth_Stage": 2.0,
            "sol_chaud_sec":     8.2,
            "Mulching_Used":     0.0,
            "Wind_Speed_kmh":    12.4,
            "Rainfall_mm":       0.0,
            "Temperature_C":     26.5
        }

        Response from backend:
        {
            "besoin_eau":   1,
            "label":        "Besoin eau 💧",
            "probabilite":  0.87,
            "irrigation":   { ... }   ← only present when besoin_eau == 1
        }
        """
        # ── Encode Crop_Growth_Stage: string → int (same as prepare.py LabelEncoder)
        features = features.copy()   # don't mutate the zone's dict
        features["Crop_Growth_Stage"] = encode_crop_growth_stage(
            features["Crop_Growth_Stage"],
            self.crop_growth_stage_map,
        )

        # ── Payload = features only (flat) — metadata is for logging only
        payload = {key: features[key] for key in FEATURE_KEYS}

        try:
            response = requests.post(BACKEND_URL, json=payload, timeout=5)
            response.raise_for_status()
            result = response.json()

            besoin_eau  = result.get("besoin_eau", 0)
            probabilite = result.get("probabilite", "N/A")
            label       = result.get("label", "")

            decision = "💧 IRRIGATE" if besoin_eau == 1 else "✅ No irrigation"

            print(
                f"  [{decision}]  "
                f"{metadata['zone_id']:<20}  "
                f"crop={metadata['crop_type']:<12}  "
                f"prob={probabilite}"
            )

            # If irrigation is needed, print the water quantity details
            if besoin_eau == 1 and "irrigation" in result:
                irr = result["irrigation"]
                print(f"    └─ 💦 Water info: {irr}")

            return result

        except requests.exceptions.ConnectionError:
            # Backend not running — print the flat payload for local testing
            print(
                f"  [OFFLINE]  {metadata['zone_id']:<20}  "
                f"(backend unreachable — printing payload)"
            )
            df = pd.DataFrame([payload])
            print(df.to_string(index=False))
            return None

        except requests.exceptions.HTTPError as e:
            print(f"  ❌ HTTP error for {metadata['zone_id']}: {e} — "
                  f"response: {response.text}")
            return None

        except Exception as e:
            print(f"  ❌ Unexpected error for {metadata['zone_id']}: {e}")
            return None

    # -----------------------------------------------------------------
    # ONE CYCLE
    # -----------------------------------------------------------------

    def run_step(self):

        print("\n" + "=" * 65)
        print(f"  🕐  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 65)

        # 1. Fetch real Agadir weather — shared by all zones this cycle
        weather = self.weather_service.get_weather()

        print(
            f"\n  🌦  Agadir weather → "
            f"T={weather['Temperature_C']}°C  |  "
            f"Wind={weather['Wind_Speed_kmh']} km/h  |  "
            f"Rain={weather['Rainfall_mm']} mm\n"
        )

        # 2. Update every zone and send its features to backend
        for zone in self.all_zones():

            # Update internal state (soil moisture, growth stage, etc.)
            zone.update(weather)

            # Get exactly the 7 ML features — must match FEATURE_KEYS
            features = zone.get_features(weather)

            # Get metadata (zone_id, crop_type, timestamp) — logging only
            metadata = zone.get_metadata()

            # POST flat features → FastAPI → SensorData → model → response
            self.send_to_backend(features, metadata)

    # -----------------------------------------------------------------
    # MAIN LOOP
    # -----------------------------------------------------------------

    def run_forever(self):

        print("🚀 Smart Irrigation Simulation Engine Started")
        print(f"   Backend  : {BACKEND_URL}")
        print(f"   Interval : every {UPDATE_INTERVAL_SECONDS // 60} minutes")
        print(f"   Zones    : {len(self.all_zones())} total\n")

        while True:
            try:
                self.run_step()
            except Exception as e:
                print(f"❌ Unexpected error in simulation cycle: {e}")

            print(f"\n⏳ Next cycle in {UPDATE_INTERVAL_SECONDS // 60} minutes...\n")
            time.sleep(UPDATE_INTERVAL_SECONDS)


# =====================================================================
# MAIN
# =====================================================================

if __name__ == "__main__":
    engine = SimulationEngine()
    engine.run_forever()