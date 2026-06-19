import random
from datetime import datetime


class RiceZone:
    """
    Simulates a rice field zone.
    Rice = very high water requirement (paddy conditions).
    """

    # Thresholds for sol_chaud_sec binary flag
    HOT_THRESHOLD = 32      # °C — rice stress temperature
    DRY_THRESHOLD = 60      # % — below this = dry for rice

    def __init__(self, zone_name: str):
        self.zone_name        = zone_name
        self.soil_moisture    = random.uniform(75, 90)   # rice needs high moisture
        self.mulching_used    = 0                         # paddy fields don't use mulching
        self.simulated_day    = 0
        self.crop_growth_stage = "Sowing"

    # =========================================================
    # GROWTH STAGE
    # =========================================================

    def update_growth_stage(self):
        if self.simulated_day <= 5:
            self.crop_growth_stage = "Sowing"
        elif self.simulated_day <= 15:
            self.crop_growth_stage = "Vegetative"
        elif self.simulated_day <= 25:
            self.crop_growth_stage = "Flowering"
        else:
            self.crop_growth_stage = "Harvest"

    # =========================================================
    # PHYSICS UPDATE
    # =========================================================

    def update(self, weather: dict):
        temp = weather["Temperature_C"]
        wind = weather["Wind_Speed_kmh"]
        rain = weather["Rainfall_mm"]

        # Rice = water-intensive, slower evaporation
        evaporation = 0.03 * temp + 0.02 * wind

        if self.mulching_used:
            evaporation *= 0.70

        self.soil_moisture -= evaporation
        self.soil_moisture += rain * 0.8
        self.soil_moisture += random.uniform(-0.5, 0.5)
        self.soil_moisture  = max(0, min(100, self.soil_moisture))

        self.simulated_day += 1
        self.update_growth_stage()

    # =========================================================
    # FEATURE OUTPUT  →  exactly 7 ML features
    # =========================================================

    def get_features(self, weather: dict) -> dict:
        """
        Returns the 7 features the ML model expects.
        sol_chaud_sec is binary: 1 if hot AND dry, else 0.
        """
        sol_chaud_sec = int(
            weather["Temperature_C"] > self.HOT_THRESHOLD
            and self.soil_moisture < self.DRY_THRESHOLD
        )

        return {
            "Soil_Moisture":      round(self.soil_moisture, 2),
            "Crop_Growth_Stage":  self.crop_growth_stage,
            "sol_chaud_sec":      sol_chaud_sec,
            "Mulching_Used":      self.mulching_used,
            "Wind_Speed_kmh":     round(weather["Wind_Speed_kmh"], 2),
            "Rainfall_mm":        round(weather["Rainfall_mm"], 2),
            "Temperature_C":      round(weather["Temperature_C"], 2),
        }

    # =========================================================
    # METADATA  (for logs / frontend display — NOT sent to model)
    # =========================================================

    def get_metadata(self) -> dict:
        return {
            "zone_id":   self.zone_name,
            "crop_type": "Rice",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }