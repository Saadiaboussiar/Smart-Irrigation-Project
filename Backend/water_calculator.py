"""
Calcul de la quantité d'eau nécessaire par plante
Méthode : Blaney-Criddle simplifiée (FAO)

Source :
    FAO Irrigation and Drainage Paper No. 56
    "Crop evapotranspiration - Guidelines for computing crop water requirements"
    Auteurs : Richard G. Allen, Luis S. Pereira, Dirk Raes, Martin Smith
    FAO, Rome, 1998
    https://www.fao.org/3/x0490e/x0490e00.htm

Formule utilisée :
    ET0 = p × (0.46 × Temperature_C + 8.13)       [mm/jour]
    ETc = ET0 × Kc                                  [mm/jour]
    Besoins nets = max(0, ETc - Rainfall_mm)        [mm/jour]
    Quantité (L/plante) = Besoins_nets × Surface_plante × 1000 / 1000

Paramètres FAO utilisés :
    p = 0.27  (fraction heures soleil journalières — zones arides Maroc/Maghreb)
    Surface par plante = 0.25 m² (valeur standard FAO petites cultures)

Coefficient cultural Kc selon Crop_Growth_Stage (FAO Table 12) :
    Stage 1 (initial)     : Kc = 0.40
    Stage 2 (development) : Kc = 0.70
    Stage 3 (mid-season)  : Kc = 1.05
    Stage 4 (late season) : Kc = 0.85
    Stage 5 (harvest)     : Kc = 0.60

Ajustements locaux appliqués :
    - sol_chaud_sec  : +20% si sol chaud et sec (stress hydrique)
    - Mulching_Used  : -20% si paillis utilisé (réduit évaporation)
    - Wind_Speed_kmh : +1% par 10 km/h de vent (augmente évaporation)
    - Soil_Moisture  : réduction si humidité sol déjà élevée
"""


# ─────────────────────────────────────────────────────
# Coefficients culturaux Kc selon FAO Table 12
# ─────────────────────────────────────────────────────
KC_TABLE = {
    1: 0.40,   # Stage initial
    2: 0.70,   # Développement
    3: 1.05,   # Mi-saison (pic)
    4: 0.85,   # Fin saison
    5: 0.60,   # Récolte
}

# Fraction heures soleil journalières — Maroc/zones arides (FAO)
P_SUNSHINE = 0.27

# Surface occupée par plante en m² (FAO standard petites cultures)
SURFACE_PAR_PLANTE = 0.25


def get_kc(crop_growth_stage: float) -> float:
    """
    Retourne le coefficient cultural Kc selon le stade de croissance
    Source : FAO Paper 56, Table 12
    """
    stage = int(round(crop_growth_stage))
    stage = max(1, min(5, stage))  # clamp entre 1 et 5
    return KC_TABLE[stage]


def calculate_water_quantity(
    temperature_c: float,
    rainfall_mm: float,
    crop_growth_stage: float,
    soil_moisture: float,
    sol_chaud_sec: float,
    mulching_used: float,
    wind_speed_kmh: float
) -> dict:
    """
    Calcule la quantité d'eau nécessaire par plante (L/plante/jour)

    Paramètres
    ----------
    temperature_c     : Température en °C
    rainfall_mm       : Précipitations en mm
    crop_growth_stage : Stade de croissance (1 à 5)
    soil_moisture     : Humidité du sol (%)
    sol_chaud_sec     : 1 si sol chaud et sec, 0 sinon
    mulching_used     : 1 si paillis utilisé, 0 sinon
    wind_speed_kmh    : Vitesse du vent en km/h

    Retourne
    --------
    dict avec ET0, ETc, besoins_nets, quantite_litres, kc, details
    """

    # ── Étape 1 : ET0 Blaney-Criddle (FAO)
    ET0 = P_SUNSHINE * (0.46 * temperature_c + 8.13)
    ET0 = max(0.0, ET0)

    # ── Étape 2 : Kc selon stade de croissance
    kc = get_kc(crop_growth_stage)

    # ── Étape 3 : ETc = ET0 × Kc
    ETc = ET0 * kc

    # ── Étape 4 : Ajustements locaux
    # Sol chaud et sec → stress hydrique +20%
    if sol_chaud_sec == 1:
        ETc *= 1.20

    # Paillis → réduit évaporation -20%
    if mulching_used == 1:
        ETc *= 0.80

    # Vent → augmente évaporation (+1% par 10 km/h)
    ETc *= (1 + wind_speed_kmh * 0.001)

    # Humidité sol élevée → moins besoin d'eau
    # Si soil_moisture > 60% → réduire proportionnellement
    if soil_moisture > 60:
        ETc *= max(0.5, 1 - (soil_moisture - 60) / 100)

    # ── Étape 5 : Besoins nets (soustraire la pluie)
    besoins_nets = max(0.0, ETc - rainfall_mm)

    # ── Étape 6 : Conversion mm → L/plante
    # 1 mm = 1 L/m², donc L/plante = besoins_nets × surface
    quantite_litres = round(besoins_nets * SURFACE_PAR_PLANTE, 2)

    # ── Résultat
    return {
        "quantite_eau_litres"  : quantite_litres,
        "unite"                : "L/plante/jour",
        "details": {
            "ET0_mm"           : round(ET0, 3),
            "Kc"               : kc,
            "ETc_mm"           : round(ETc, 3),
            "besoins_nets_mm"  : round(besoins_nets, 3),
            "surface_plante_m2": SURFACE_PAR_PLANTE,
            "stade_croissance" : int(round(crop_growth_stage)),
        },
        "source": "FAO Blaney-Criddle simplifié — FAO Paper No.56 (1998)"
    }