import os
import mlflow
import mlflow.keras
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
BASE_DIR   = BASE_DIR  = "/Users/maounouissal/Desktop/Smart-Irrigation-Project/ML-model"
DATA_DIR  = BASE_DIR + "/data/images/"
MODEL_DIR = BASE_DIR + "/models/image-model/"

IMAGE_SIZE = 224
BATCH_SIZE = 32
EPOCHS     = 15

print("Chargement des images...")

gen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=20,
    horizontal_flip=True
)

train_data = gen.flow_from_directory(
    DATA_DIR,
    target_size=(IMAGE_SIZE, IMAGE_SIZE),
    batch_size=BATCH_SIZE,
    subset="training",
    class_mode="categorical"
)

val_data = gen.flow_from_directory(
    DATA_DIR,
    target_size=(IMAGE_SIZE, IMAGE_SIZE),
    batch_size=BATCH_SIZE,
    subset="validation",
    class_mode="categorical"
)

print(f"Classes : {train_data.class_indices}")

base = EfficientNetB0(
    weights="imagenet",
    include_top=False,
    input_shape=(224, 224, 3)
)
base.trainable = False

x   = base.output
x   = layers.GlobalAveragePooling2D()(x)
x   = layers.Dense(128, activation="relu")(x)
x   = layers.Dropout(0.3)(x)
out = layers.Dense(2, activation="softmax")(x)

model = Model(inputs=base.input, outputs=out)
model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

mlflow.set_tracking_uri(
    "https://dagshub.com/Saadiaboussiar/Smart-Irrigation-Project.mlflow"
)
mlflow.set_experiment("EfficientNet-SmartIrrigation")

with mlflow.start_run(run_name="EfficientNetB0"):
    mlflow.log_params({
        "model":      "EfficientNetB0",
        "epochs":     EPOCHS,
        "batch_size": BATCH_SIZE
    })
    callbacks = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=4,
            restore_best_weights=True
        ),
        ModelCheckpoint(
            MODEL_DIR + "best_model.h5",
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
    best_acc = max(history.history["val_accuracy"])
    mlflow.log_metric("val_accuracy", round(best_acc, 4))
    model.save(MODEL_DIR + "efficientnet_irrigation.h5")
    print(f"\nPrécision : {best_acc*100:.2f}%")
    print("Modèle sauvegardé !")