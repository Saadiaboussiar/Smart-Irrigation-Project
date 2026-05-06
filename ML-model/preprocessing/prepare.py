"""
prepare.py — Étape de préparation des données pour le pipeline DVC
Projet : Smart Irrigation
Auteur  : ML-model team
Usage   : python prepare.py
          ou via DVC : dvc repro (stage 'prepare' dans dvc.yaml)

Sorties
-------
data/processed/train.csv   → features + cible binaire (besoin_eau)
data/processed/test.csv
data/processed/encoders.json → mapping des encodages pour la reproductibilité
"""

import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
# Racine du projet ML-model
BASE_DIR = Path(__file__).resolve().parent.parent

# Paths
RAW_DATA_PATH = BASE_DIR / "data" / "irrigation_prediction.csv"
PROCESSED_DIR = BASE_DIR / "data" / "sensor_data"

ENCODERS_PATH = PROCESSED_DIR / "encoders.json"
TRAIN_PATH    = PROCESSED_DIR / "train.csv"
TEST_PATH     = PROCESSED_DIR / "test.csv"


TARGET_RAW    = "Irrigation_Need"   # colonne originale  : Low / Medium / High
TARGET        = "besoin_eau"        # cible binaire       : 0 / 1

TEST_SIZE     = 0.2
RANDOM_STATE  = 42

# Colonnes catégorielles à encoder avec LabelEncoder
CATEGORICAL_COLS = [
    "Soil_Type",
    "Crop_Type",
    "Crop_Growth_Stage",
    "Season",
    "Mulching_Used",
    "Region",
]

# Colonnes numériques attendues (vérification de cohérence)
NUMERICAL_COLS = [
    "Soil_pH",
    "Soil_Moisture",
    "Organic_Carbon",
    "Electrical_Conductivity",
    "Temperature_C",
    "Humidity",
    "Rainfall_mm",
    "Sunlight_Hours",
    "Wind_Speed_kmh",
    "Field_Area_hectare",
    "Previous_Irrigation_mm",
]

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Étapes de préparation
# ──────────────────────────────────────────────

def load_data(path: Path) -> pd.DataFrame:
    """Chargement du fichier CSV brut."""
    log.info(f"Chargement des données depuis : {path}")
    df = pd.read_csv(path)
    log.info(f"  → {df.shape[0]:,} lignes × {df.shape[1]} colonnes chargées")
    return df


def validate_schema(df: pd.DataFrame) -> None:
    """Vérifie que les colonnes attendues sont présentes."""
    expected = set(CATEGORICAL_COLS + NUMERICAL_COLS + [TARGET_RAW])
    missing  = expected - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans le fichier brut : {missing}")
    log.info("  ✓ Schéma validé")


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Gestion des valeurs manquantes :
    - numériques  → médiane par type de culture (contexte agronomique)
    - catégorielles → mode global
    """
    log.info("Gestion des valeurs manquantes...")
    initial_missing = df.isnull().sum().sum()

    if initial_missing == 0:
        log.info("  → Aucune valeur manquante détectée")
        return df

    # Numériques : imputation par médiane groupée (par Crop_Type)
    for col in NUMERICAL_COLS:
        if df[col].isnull().any():
            df[col] = df.groupby("Crop_Type")[col].transform(
                lambda x: x.fillna(x.median())
            )
            # Fallback global si un groupe entier est NaN
            df[col] = df[col].fillna(df[col].median())
            log.info(f"  → {col} : médiane groupée appliquée")

    # Catégorielles : mode global
    for col in CATEGORICAL_COLS:
        if df[col].isnull().any():
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)
            log.info(f"  → {col} : mode '{mode_val}' appliqué")

    remaining = df.isnull().sum().sum()
    log.info(f"  ✓ Valeurs manquantes : {initial_missing} → {remaining}")
    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Suppression des doublons exacts."""
    before = len(df)
    df = df.drop_duplicates()
    removed = before - len(df)
    if removed:
        log.info(f"  ✓ {removed} doublon(s) supprimé(s)")
    else:
        log.info("  → Aucun doublon détecté")
    return df


def remove_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Détection et suppression des outliers extrêmes (IQR × 3)
    sur les colonnes numériques clés.
    On utilise un seuil large (×3) pour ne pas perdre
    de vrais cas agronomiques rares.
    """
    log.info("Suppression des outliers extrêmes (IQR × 3)...")
    sensitive_cols = [
        "Soil_Moisture", "Temperature_C", "Humidity",
        "Rainfall_mm", "Soil_pH",
    ]
    before = len(df)
    mask = pd.Series(True, index=df.index)

    for col in sensitive_cols:
        Q1  = df[col].quantile(0.25)
        Q3  = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 3 * IQR
        upper = Q3 + 3 * IQR
        mask &= df[col].between(lower, upper)

    df = df[mask].reset_index(drop=True)
    log.info(f"  ✓ {before - len(df)} ligne(s) supprimée(s) comme outliers extrêmes")
    return df


def create_binary_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    Crée la variable cible binaire `besoin_eau` :
      0 → 'Low'
      1 → 'Medium' ou 'High'

    La colonne originale `Irrigation_Need` est conservée
    pour permettre une éventuelle classification multi-classe
    ou une analyse post-entraînement.
    """
    log.info("Création de la variable cible binaire...")
    mapping = {"Low": 0, "Medium": 1, "High": 1}
    unknown = set(df[TARGET_RAW].unique()) - set(mapping.keys())
    if unknown:
        raise ValueError(f"Valeurs inconnues dans '{TARGET_RAW}' : {unknown}")

    df[TARGET] = df[TARGET_RAW].map(mapping)

    dist = df[TARGET].value_counts(normalize=True).mul(100).round(1)
    log.info(f"  ✓ Distribution : pas besoin d'eau={dist.get(0,0)}%  "
             f"besoin d'eau={dist.get(1,0)}%")
    return df


def encode_categoricals(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Encode les variables catégorielles avec LabelEncoder.
    Retourne le dataframe encodé + un dict de mapping
    (sauvegardé dans encoders.json pour reproductibilité et inference).
    """
    log.info("Encodage des variables catégorielles...")
    encoders_mapping: dict[str, dict] = {}

    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders_mapping[col] = {
            str(cls): int(idx)
            for idx, cls in enumerate(le.classes_)
        }
        log.info(f"  → {col} : {list(le.classes_)}")

    # Encodage binaire simple pour Mulching_Used (déjà Yes/No → 0/1)
    # LabelEncoder le gère, mais on documente explicitement
    log.info("  ✓ Encodage terminé")
    return df, encoders_mapping


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Création de features supplémentaires à partir des données brutes.
    Ces features peuvent améliorer le modèle sans introduire de data leakage.
    """
    log.info("Feature engineering...")

    # Indice de stress hydrique : humidité faible + température haute
    df["stress_hydrique"] = (
        (100 - df["Humidity"]) * df["Temperature_C"]
    ) / 100

    # Ratio pluie / surface (pluie efficace par hectare)
    df["pluie_par_hectare"] = df["Rainfall_mm"] / (df["Field_Area_hectare"] + 1e-6)

    # Interaction sol sec + chaleur (favorable à l'irrigation)
    df["sol_chaud_sec"] = df["Temperature_C"] * (1 - df["Soil_Moisture"] / 100)

    log.info("  ✓ 3 features créées : stress_hydrique, pluie_par_hectare, sol_chaud_sec")
    return df


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Sélectionne les colonnes finales pour le training.
    On conserve TARGET_RAW pour pouvoir faire une classification
    multi-classe plus tard si besoin.
    """
    feature_cols = NUMERICAL_COLS + CATEGORICAL_COLS + [
        "stress_hydrique", "pluie_par_hectare", "sol_chaud_sec",
        TARGET,
    ]
    return df[feature_cols]


def split_and_save(
    df: pd.DataFrame,
    encoders: dict,
    train_path: Path,
    test_path: Path,
    encoders_path: Path,
) -> None:
    """Découpage train/test et sauvegarde des fichiers de sortie."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    X = df.drop(columns=[TARGET])
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,   # équilibrage de la cible dans chaque split
    )

    train_df = X_train.copy()
    train_df[TARGET] = y_train.values

    test_df = X_test.copy()
    test_df[TARGET] = y_test.values

    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    with open(encoders_path, "w", encoding="utf-8") as f:
        json.dump(encoders, f, ensure_ascii=False, indent=2)

    log.info(f"  ✓ Train  : {len(train_df):,} lignes  → {train_path}")
    log.info(f"  ✓ Test   : {len(test_df):,} lignes  → {test_path}")
    log.info(f"  ✓ Encodeurs sauvegardés              → {encoders_path}")


# ──────────────────────────────────────────────
# Pipeline principal
# ──────────────────────────────────────────────

def run_pipeline() -> None:
    log.info("=" * 55)
    log.info("  SMART IRRIGATION — Préparation des données")
    log.info("=" * 55)

    df = load_data(RAW_DATA_PATH)
    validate_schema(df)
    df = remove_duplicates(df)
    df = handle_missing_values(df)
    df = remove_outliers(df)
    df = create_binary_target(df)
    df, encoders = encode_categoricals(df)
    df = feature_engineering(df)
    df = select_features(df)

    log.info(f"Dataset final : {df.shape[0]:,} lignes × {df.shape[1]} colonnes")
    split_and_save(df, encoders, TRAIN_PATH, TEST_PATH, ENCODERS_PATH)

    log.info("=" * 55)
    log.info("  Préparation terminée avec succès ✓")
    log.info("=" * 55)


if __name__ == "__main__":
    run_pipeline()