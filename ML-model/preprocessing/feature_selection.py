"""
feature_selection.py — Sélection des features pour le pipeline Smart Irrigation
Projet  : Smart Irrigation
Usage   : python feature_selection.py   (exécuté une seule fois avant les modèles)

Sorties
-------
data/sensor_data/train_selected.csv   → train avec seulement les features sélectionnées
data/sensor_data/test_selected.csv    → test avec seulement les features sélectionnées
data/sensor_data/selected_features.json → liste des features pour predict.py
models/feature_importance.png         → graphique comparatif des 3 méthodes
"""

import json
import logging
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
TRAIN_PATH = Path("data/sensor_data/train.csv")
TEST_PATH  = Path("data/sensor_data/test.csv")
DATA_DIR   = Path("data/sensor_data")
MODELS_DIR = Path("models")
TARGET        = "besoin_eau"
THRESHOLD     = 0.2
RANDOM_STATE  = 42

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
# Fonctions
# ──────────────────────────────────────────────

def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Chargement des fichiers train et test."""
    log.info("Chargement des données...")
    train_df = pd.read_csv(TRAIN_PATH)
    test_df  = pd.read_csv(TEST_PATH)
    log.info(f"  ✓ Train : {train_df.shape[0]:,} lignes × {train_df.shape[1]} colonnes")
    log.info(f"  ✓ Test  : {test_df.shape[0]:,} lignes  × {test_df.shape[1]} colonnes")
    return train_df, test_df


def compute_pearson(X_train: pd.DataFrame, y_train: pd.Series) -> pd.Series:
    """Corrélation linéaire entre chaque feature et la cible."""
    return X_train.corrwith(y_train).abs().rename("Pearson")


def compute_mutual_info(X_train: pd.DataFrame, y_train: pd.Series) -> pd.Series:
    """
    Mutual Information — détecte les relations non linéaires.
    Meilleure que Pearson pour les variables catégorielles encodées.
    """
    mi_values = mutual_info_classif(X_train, y_train, random_state=RANDOM_STATE)
    return pd.Series(mi_values, index=X_train.columns, name="Mutual_Info")


def compute_rf_importance(X_train: pd.DataFrame, y_train: pd.Series) -> pd.Series:
    """
    Random Forest Importance — détecte les interactions entre colonnes.
    Le seul qui voit les relations complexes entre plusieurs features.
    """
    rf = RandomForestClassifier(
        n_estimators=100,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    return pd.Series(rf.feature_importances_, index=X_train.columns, name="RF_Importance")


def combine_and_normalize(
    pearson: pd.Series,
    mi: pd.Series,
    rf_imp: pd.Series,
) -> pd.DataFrame:
    """
    Combine les 3 méthodes et normalise chaque score entre 0 et 1
    pour pouvoir les comparer sur la même échelle.
    Calcule la moyenne des 3 scores normalisés.
    """
    results = pd.concat([pearson, mi, rf_imp], axis=1)
    results_norm = results.apply(
        lambda x: (x - x.min()) / (x.max() - x.min())
    )
    results_norm["Average"] = results_norm.mean(axis=1)
    results_norm = results_norm.sort_values("Average", ascending=False)
    return results_norm


def plot_feature_importance(results_norm: pd.DataFrame) -> None:
    """Graphique comparatif des 3 méthodes avec ligne de seuil."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(14, 6))
    results_norm.drop(columns="Average").plot(kind="bar", ax=ax, width=0.7)

    # ligne de seuil
    ax.axhline(
        y=THRESHOLD, color="red",
        linestyle="--", linewidth=1.5,
        label=f"Seuil = {THRESHOLD}"
    )

    ax.set_title(
        "Feature Importance — 3 Méthodes Combinées",
        fontsize=14, fontweight="bold"
    )
    ax.set_ylabel("Score Normalisé (0-1)")
    ax.set_xlabel("Features")
    ax.legend()
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(MODELS_DIR / "feature_importance.png", dpi=150)
    plt.close()
    log.info("  ✓ Graphique sauvegardé → models/feature_importance.png")


def select_and_save(
    results_norm: pd.DataFrame,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> list[str]:
    """
    Sélectionne les features avec Average > THRESHOLD.
    Sauvegarde :
    - train_selected.csv
    - test_selected.csv
    - selected_features.json
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    selected = results_norm[
        results_norm["Average"] > THRESHOLD
    ].index.tolist()

    log.info(f"  ✓ {len(selected)} features sélectionnées : {selected}")

    # sauvegarder les datasets réduits
    train_selected = train_df[selected + [TARGET]]
    test_selected  = test_df[selected + [TARGET]]

    train_selected.to_csv(DATA_DIR / "train_selected.csv", index=False)
    test_selected.to_csv(DATA_DIR / "test_selected.csv", index=False)

    log.info(f"  ✓ Train sélectionné : {train_selected.shape} → data/sensor_data/train_selected.csv")
    log.info(f"  ✓ Test sélectionné  : {test_selected.shape}  → data/sensor_data/test_selected.csv")

    # sauvegarder la liste des features pour predict.py
    with open(DATA_DIR / "selected_features.json", "w") as f:
        json.dump(selected, f, indent=2)
    log.info("  ✓ Features sauvegardées → data/sensor_data/selected_features.json")

    return selected


# ──────────────────────────────────────────────
# Pipeline principal
# ──────────────────────────────────────────────

def run() -> None:
    log.info("=" * 55)
    log.info("  SMART IRRIGATION — Sélection des Features")
    log.info("=" * 55)

    # 1. Charger les données
    train_df, test_df = load_data()

    X_train = train_df.drop(columns=[TARGET])
    y_train = train_df[TARGET]

    # 2. Calculer les 3 méthodes
    log.info("Calcul des scores de sélection (3 méthodes)...")
    pearson = compute_pearson(X_train, y_train)
    mi      = compute_mutual_info(X_train, y_train)
    rf_imp  = compute_rf_importance(X_train, y_train)

    # 3. Combiner et normaliser
    results_norm = combine_and_normalize(pearson, mi, rf_imp)
    log.info("\n=== Scores combinés ===\n" + results_norm.round(3).to_string())

    # 4. Graphique
    plot_feature_importance(results_norm)

    # 5. Sélectionner et sauvegarder
    log.info(f"Sélection avec seuil = {THRESHOLD}...")
    selected = select_and_save(results_norm, train_df, test_df)

    log.info("=" * 55)
    log.info("  Sélection terminée avec succès ✓")
    log.info(f"  {len(selected)} features retenues sur {X_train.shape[1]}")
    log.info("=" * 55)


if __name__ == "__main__":
    run()