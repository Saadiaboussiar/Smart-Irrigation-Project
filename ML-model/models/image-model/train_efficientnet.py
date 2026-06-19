import os
import json
import mlflow
import dagshub
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# =========================
# MLflow + DagsHub init
# =========================
dagshub.init(repo_owner="Saadiaboussiar", repo_name="Smart-Irrigation-Project", mlflow=True)

mlflow.set_experiment("EfficientNet-SmartIrrigation")

# =========================
# Paths
# =========================
BASE_DIR   = "/Users/maounouissal/Documents/Smart-Irrigation-Project/ML-model"
TRAIN_DIR  = BASE_DIR + "/data/images/train/"
VAL_DIR    = BASE_DIR + "/data/images/valid/"
MODEL_DIR  = BASE_DIR + "/models/image-model/"

IMAGE_SIZE = 224
BATCH_SIZE = 32
EPOCHS     = 15

# =========================
# Data
# =========================
print("Chargement des images...")

train_gen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    horizontal_flip=True
)

val_gen = ImageDataGenerator(rescale=1./255)

train_data = train_gen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMAGE_SIZE, IMAGE_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

val_data = val_gen.flow_from_directory(
    VAL_DIR,
    target_size=(IMAGE_SIZE, IMAGE_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

NUM_CLASSES = train_data.num_classes
print(f"Classes ({NUM_CLASSES}) : {train_data.class_indices}")

# =========================
# Save classes.json
# =========================
classes_path = MODEL_DIR + "classes.json"
with open(classes_path, "w") as f:
    json.dump(train_data.class_indices, f, indent=4)

print("classes.json créé ✔")

# =========================
# Model (EfficientNet)
# =========================
base = EfficientNetB0(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
base.trainable = False

x = base.output
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dense(128, activation="relu")(x)
x = layers.Dropout(0.3)(x)
out = layers.Dense(NUM_CLASSES, activation="softmax")(x)

model = Model(inputs=base.input, outputs=out)

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# =========================
# Training + MLflow
# =========================
with mlflow.start_run(run_name="EfficientNetB0") as run:

    mlflow.log_params({
        "model": "EfficientNetB0",
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "image_size": IMAGE_SIZE,
        "optimizer": "adam",
        "dropout": 0.3,
        "dense_units": 128,
        "num_classes": NUM_CLASSES
    })

    callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        ModelCheckpoint(
            MODEL_DIR + "best_model.keras",
            monitor="val_accuracy",
            save_best_only=True
        )
    ]

    history = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    # Metrics logging
    for epoch, (acc, val_acc) in enumerate(zip(history.history["accuracy"], history.history["val_accuracy"])):
        mlflow.log_metric("accuracy", float(acc), step=epoch)
        mlflow.log_metric("val_accuracy", float(val_acc), step=epoch)

    best_acc = max(history.history["val_accuracy"])
    mlflow.log_metric("best_val_accuracy", float(best_acc))

    # Save local model
    model.save(MODEL_DIR + "efficientnet_irrigation.keras")

    # MLflow model registry (IMPORTANT)
    mlflow.keras.log_model(
        model,
        name="image-model",
        registered_model_name="SmartIrrigation-ImageModel"
    )

    print(f"\nPrecision : {best_acc*100:.2f}%")
    print(f"Run ID    : {run.info.run_id}")
    print("Run enregistré dans MLflow OK ✅")