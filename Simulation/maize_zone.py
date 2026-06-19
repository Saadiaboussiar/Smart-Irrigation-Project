import random
from datetime import datetime


class MaizeZone:
    """
    Simulates a maize (corn) field zone.
    Maize = moderate-high water requirement.
    Very sensitive at Flowering stage.
    """

    HOT_THRESHOLD = 30
    DRY_THRESHOLD = 40

    def __init__(self, zone_name: str):
        self.zone_name         = zone_name
        self.soil_moisture     = random.uniform(50, 70)
        self.mulching_used     = random.choice([0, 1])
        self.simulated_day     = 0
        self.crop_growth_stage = "Sowing"

    # =========================================================
    # GROWTH STAGE
    # =========================================================

    def update_growth_stage(self):
        if self.simulated_day <= 7:
            self.crop_growth_stage = "Sowing"
        elif self.simulated_day <= 20:
            self.crop_growth_stage = "Vegetative"
        elif self.simulated_day <= 35:
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

        # Maize evaporates faster than rice
        evaporation = 0.04 * temp + 0.03 * wind

        if self.mulching_used:
            evaporation *= 0.75

        self.soil_moisture -= evaporation
        self.soil_moisture += rain * 0.5
        self.soil_moisture += random.uniform(-0.8, 0.8)
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
            "crop_type": "Maize",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }