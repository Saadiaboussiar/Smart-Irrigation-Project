import zipfile, json, re, shutil, os
import mlflow
import dagshub
from dotenv import load_dotenv

load_dotenv(".env")
dagshub.init(repo_owner="Saadiaboussiar", repo_name="Smart-Irrigation-Project", mlflow=True)
os.environ["MLFLOW_TRACKING_USERNAME"] = os.getenv("DAGSHUB_USERNAME")
os.environ["MLFLOW_TRACKING_PASSWORD"] = os.getenv("DAGSHUB_USER_TOKEN")

local_path = mlflow.artifacts.download_artifacts("models:/SmartIrrigation-ImageModel/2")
orig  = os.path.join(local_path, "data", "model.keras")
fixed = r"E:\Smart-Irrigation-Project\Backend\model_fixed.keras"

print(f"Original : {orig}")

with zipfile.ZipFile(orig, "r") as z:
    files = {n: z.read(n) for n in z.namelist()}

config_key = next(k for k in files if k.endswith("config.json"))
s = files[config_key].decode("utf-8")

# Supprimer tous les paramètres incompatibles
s = re.sub(r',\s*"renorm":\s*false',          '', s)
s = re.sub(r',\s*"renorm_clipping":\s*null',  '', s)
s = re.sub(r',\s*"renorm_momentum":\s*[\d.]+','', s)
s = re.sub(r',\s*"quantization_config":\s*null', '', s)

files[config_key] = s.encode("utf-8")

if os.path.exists(fixed):
    os.remove(fixed)

with zipfile.ZipFile(fixed, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in files.items():
        z.writestr(name, data)

print(f"✅ model_fixed.keras recréé : {fixed}")