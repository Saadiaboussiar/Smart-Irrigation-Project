export interface ZoneResult {
  besoin_eau: number;
  label: string;
  probabilite: number;
  prediction_id: string;
  irrigation?: {
    quantite_eau_litres: number;
  };
}

export interface Zone {
  zone_id: string;
  crop_type: string;
  result: ZoneResult;
  features: {
    Soil_Moisture: number;
    Crop_Growth_Stage: number;
    sol_chaud_sec: number;
    Mulching_Used: number;
    Wind_Speed_kmh: number;
    Rainfall_mm: number;
    Temperature_C: number;
  };
}

export interface Notification {
  id: string; // prediction_id
  zone_id: string;
  crop_type: string;
  water_liters: number;
  probabilite: number;
  timestamp: string;
  read: boolean;
  feedbackGiven: boolean;
}