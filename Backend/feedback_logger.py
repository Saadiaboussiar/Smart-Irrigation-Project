import csv
import os

CSV_FOLDER = "feedback_data"
CSV_FILE = os.path.join(CSV_FOLDER, "feedback.csv")


def save_feedback(prediction_id, prediction_data):

    os.makedirs(CSV_FOLDER, exist_ok=True)

    file_exists = os.path.isfile(CSV_FILE)

    with open(CSV_FILE, "a", newline="", encoding="utf-8") as file:

        writer = csv.writer(file)

        # Création de l'entête
        if not file_exists:

            writer.writerow([
                "Soil_Moisture",
                "Crop_Growth_Stage",
                "sol_chaud_sec",
                "Mulching_Used",
                "Wind_Speed_kmh",
                "Rainfall_mm",
                "Temperature_C",
                "besoin_eau"


            ])

        features = prediction_data["features"]

        writer.writerow([



            features["Soil_Moisture"],
            features["Crop_Growth_Stage"],
            features["sol_chaud_sec"],
            features["Mulching_Used"],
            features["Wind_Speed_kmh"],
            features["Rainfall_mm"],
            features["Temperature_C"],

            1 - prediction_data["prediction"]

        ])