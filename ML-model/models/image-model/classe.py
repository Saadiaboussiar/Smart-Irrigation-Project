import json
from pathlib import Path

# ─── Même chemin que dans son code d'entraînement ────────────────────────
TRAIN_DIR = "/Users/maounouissal/Documents/Smart-Irrigation-Project/ML-model/data/images/train/"

# ─── Lire les classes depuis les dossiers ────────────────────────────────
classes = sorted([d.name for d in Path(TRAIN_DIR).iterdir() if d.is_dir()])
class_indices = {name: idx for idx, name in enumerate(classes)}

print("Classes trouvées :")
print(class_indices)

# ─── Sauvegarder classes.json ─────────────────────────────────────────────
with open("classes.json", "w") as f:
    json.dump(class_indices, f, indent=2)

print("✅ classes.json sauvegardé !")