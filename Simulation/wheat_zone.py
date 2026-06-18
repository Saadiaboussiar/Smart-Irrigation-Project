import random
from datetime import datetime


class WheatZone:
    """
    Simulates a wheat field zone.
    Wheat = low-to-medium water requirement, drought tolerant.
    Must NOT be irrigated at Harvest (needs to dry for threshing).
    """

    HOT_THRESHOLD = 28
    DRY_THRESHOLD = 35      # wheat tolerates drier soil

    def __init__(self, zone_name: str):
        self.zone_name         = zone_name
        self.soil_moisture     = random.uniform(50, 75)
        self.mulching_used     = 0                       # large-scale cereal — no mulching
        self.simulated_day     = 0
        self.crop_growth_stage = "Sowing"

    # =========================================================
    # GROWTH STAGE
    # =========================================================

    def update_growth_stage(self):
        if self.simulated_day <= 5:
            self.crop_growth_stage = "Sowing"
        elif self.simulated_day <= 16:
            self.crop_growth_stage = "Vegetative"
        elif self.simulated_day <= 28:
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

        evaporation = 0.03 * temp + 0.02 * wind

        if self.mulching_used:
            evaporation *= 0.70

        self.soil_moisture -= evaporation
        self.soil_moisture += rain * 0.65
        self.soil_moisture += random.uniform(-0.5, 0.5)
        self.soil_moisture  = max(0, min(100, self.soil_moisture))

        self.simulated_day += 1
        self.update_growth_stage()

    # =========================================================
    # FEATURE OUTPUT
    # =========================================================

    def get_features(self, weather: dict) -> dict:
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

    def get_metadata(self) -> dict:
        return {
            "zone_id":   self.zone_name,
            "crop_type": "Wheat",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }