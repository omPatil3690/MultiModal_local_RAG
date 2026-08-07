from sentence_transformers import SentenceTransformer
from faster_whisper import WhisperModel
import torch
import os
import ollama
from modules.models import OLLAMA_VL_MODEL, OLLAMA_TEXT_MODEL

LOCAL_DIR = "local_models"
MODEL_NAME = "small"  # You can change to "medium", "large-v2", etc.
WHISPER_PATH = os.path.join(LOCAL_DIR, f"faster-whisper-{MODEL_NAME}")


def download_sentence_transformer():
    path = os.path.join(LOCAL_DIR, "all-MiniLM-L6-v2")
    print(f"Downloading SentenceTransformer -> {path}")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    model.save(path)
    print("✅ SentenceTransformer saved locally.")

def download_faster_whisper():
    print(f"Downloading faster-whisper model '{MODEL_NAME}' into {LOCAL_DIR} ...")
    if torch.cuda.is_available():
        device = "cuda"
        compute_type = "float16"
    else:
        device = "cpu"
        compute_type = "int8"
    # Instantiating triggers download if missing
    model = WhisperModel(
        MODEL_NAME,
        device=device,
        compute_type=compute_type,
        download_root=LOCAL_DIR
    )
    print(f"✅ Model '{MODEL_NAME}' downloaded and saved at: {WHISPER_PATH}")
    print(f"   Using device={device}, compute_type={compute_type}")


def download_ollama_models():
    models_to_download = []
    if OLLAMA_VL_MODEL:
        models_to_download.append(OLLAMA_VL_MODEL)
    if OLLAMA_TEXT_MODEL:
        models_to_download.append(OLLAMA_TEXT_MODEL)

    unique_models = list(dict.fromkeys(models_to_download))
    for model_name in unique_models:
        print(f"Pulling Ollama model '{model_name}'...")
        ollama.pull(model_name)
        print(f"✅ Ollama model '{model_name}' downloaded.")


if __name__ == "__main__":
    os.makedirs(LOCAL_DIR, exist_ok=True)
    # download_sentence_transformer()
    # download_faster_whisper()
    download_ollama_models()
    print("\n🎉 All models downloaded and stored in local_models/ folder.")
