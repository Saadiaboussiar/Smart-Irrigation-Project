from roboflow import Roboflow
import os, shutil
API_KEY = "OBFdjz6STnffSsrxdW8s"
rf = Roboflow(api_key=API_KEY)
project = rf.workspace("project-o5pym").project("smart-irrigation-gvdgh")
dataset = project.version(1).download("yolov8")
DEST_HEALTHY = "data/images/healthy"
DEST_NEEDS   = "data/images/needs-water"
for split in ["train", "valid", "test"]:
    for classe, dest in [("healthy", DEST_HEALTHY), ("needs-water", DEST_NEEDS)]:
        src = f"smart-irrigation-gvdgh-1/{split}/{classe}"
        if os.path.exists(src):
            for f in os.listdir(src):
                shutil.copy(os.path.join(src, f), os.path.join(dest, f))
print(f"healthy     : {len(os.listdir(DEST_HEALTHY))} images")
print(f"needs-water : {len(os.listdir(DEST_NEEDS))} images")
