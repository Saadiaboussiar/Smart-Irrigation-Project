# prediction_store.py
import json
import os

STORE_FILE = "prediction_store.json"

def save_prediction(prediction_id, data):
    store = load_all()
    store[prediction_id] = data
    with open(STORE_FILE, "w") as f:
        json.dump(store, f)

def load_all():
    if not os.path.exists(STORE_FILE):
        return {}
    with open(STORE_FILE, "r") as f:
        return json.load(f)

def get_prediction(prediction_id):
    store = load_all()
    return store.get(prediction_id)