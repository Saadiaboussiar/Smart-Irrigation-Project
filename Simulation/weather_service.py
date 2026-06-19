import requests


class WeatherService:
    """
    Fetch real-time weather data for Agadir (Morocco)
    using Open-Meteo API. No API key required.
    """

    LATITUDE  = 30.4278
    LONGITUDE = -9.5981

    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def get_weather(self) -> dict:
        """
        Returns exactly:
        {
            "Temperature_C"  : float,
            "Wind_Speed_kmh" : float,
            "Rainfall_mm"    : float
        }
        """
        url = (
            f"{self.base_url}"
            f"?latitude={self.LATITUDE}"
            f"&longitude={self.LONGITUDE}"
            "&current=temperature_2m,wind_speed_10m,rain"
            "&timezone=Africa/Casablanca"
        )

        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()["current"]

            return {
                "Temperature_C":  float(data.get("temperature_2m", 0)),
                "Wind_Speed_kmh": float(data.get("wind_speed_10m", 0)),
                "Rainfall_mm":    float(data.get("rain", 0)),
            }

        except Exception as e:
            print(f"⚠️  Weather API error: {e} — using Agadir seasonal fallback")
            return {
                "Temperature_C":  25.0,
                "Wind_Speed_kmh": 10.0,
                "Rainfall_mm":    0.0,
            }