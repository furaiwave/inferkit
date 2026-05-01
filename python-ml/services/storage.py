from __future__ import annotations

import json
import uuid
import shutil
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

BASE = Path(__file__).parent.parent / 'storage'
DATASETS_DIR = BASE / 'datasets'
MODELS_DIR = BASE / 'models'
PREDICTIONS_DIR = BASE / 'predictions'

for _d in (DATASETS_DIR, MODELS_DIR, PREDICTIONS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

def save_dataset_meta(meta: dict[str, Any]) -> None:
    path = DATASETS_DIR / meta['id']
    path.mkdir(parents=True, exist_ok=True)
    (path / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2))

def load_dataset_meta(dataset_id: str) -> dict[str, Any] | None:
    p = DATASETS_DIR / dataset_id / 'meta.json'
    if not p.exists():
        return None
    try:
        text = p.read_text().strip()
        return json.loads(text) if text else None
    except (json.JSONDecodeError, OSError):
        return None

def list_dataset_metas() -> list[dict[str, Any]]:
    result = []
    for p in sorted(DATASETS_DIR.iterdir()):
        meta_file = p / 'meta.json'
        if not meta_file.exists():
            continue
        try:
            text = meta_file.read_text().strip()
            if text:
                result.append(json.loads(text))
        except (json.JSONDecodeError, OSError):
            pass
    return result

def save_dataset_csv(dataset_id: str, df: pd.DataFrame) -> None:
    path = DATASETS_DIR / dataset_id
    path.mkdir(parents=True, exist_ok=True)
    df.to_csv(path / 'data.csv', index=False)

def load_dataset_csv(dataset_id: str) -> pd.DataFrame | None:
    p = DATASETS_DIR / dataset_id / 'data.csv'
    if not p.exists():
        return None
    return pd.read_csv(p)

def delete_dataset(dataset_id: str) -> bool:
    p = DATASETS_DIR / dataset_id
    if not p.exists():
        return False
    shutil.rmtree(p)
    return True

def save_model_meta(meta: dict[str, Any]) -> None:
    path = MODELS_DIR / meta['id']
    path.mkdir(parents=True, exist_ok=True)
    serializable = {k: v for k, v in meta.items() if k not in ('_estimator',)}
    (path / 'meta.json').write_text(json.dumps(serializable, ensure_ascii=False, indent=2))

def load_model_meta(model_id: str) -> dict[str, Any] | None:
    p = MODELS_DIR / model_id / 'meta.json'
    if not p.exists():
        return None
    try:
        text = p.read_text().strip()
        return json.loads(text) if text else None
    except (json.JSONDecodeError, OSError):
        return None

def list_model_metas() -> list[dict[str, Any]]:
    result = []
    for p in sorted(MODELS_DIR.iterdir()):
        meta_file = p / 'meta.json'
        if not meta_file.exists():
            continue
        try:
            text = meta_file.read_text().strip()
            if text:
                result.append(json.loads(text))
        except (json.JSONDecodeError, OSError):
            pass
    return result

def save_estimator(model_id: str, estimator: Any, scaler: Any, encoder: Any | None = None) -> None:
    path = MODELS_DIR / model_id
    path.mkdir(parents=True, exist_ok=True)
    joblib.dump(estimator, path / 'estimator.pkl')
    joblib.dump(scaler, path / 'scaler.pkl')
    if encoder is not None:
        joblib.dump(encoder, path / 'encoder.pkl')

def load_estimator(model_id: str) -> dict[str, Any] | None:
    path = MODELS_DIR / model_id
    est_path = path / 'estimator.pkl'
    if not est_path.exists():
        return None
    result: dict[str, Any] = {
        'estimator': joblib.load(est_path),
        'scaler':    joblib.load(path / 'scaler.pkl'),
    }
    enc_path = path / 'encoder.pkl'
    if enc_path.exists():
        result['encoder'] = joblib.load(enc_path)
    return result

def delete_model(model_id: str) -> bool:
    p = MODELS_DIR / model_id
    if not p.exists():
        return False
    shutil.rmtree(p)
    return True

def save_prediction(record: dict[str, Any]) -> None:
    p = PREDICTIONS_DIR / f"{record['id']}.json"
    p.write_text(json.dumps(record, ensure_ascii=False, indent=2))

def load_prediction(prediction_id: str) -> dict[str, Any] | None:
    p = PREDICTIONS_DIR / f"{prediction_id}.json"
    if not p.exists():
        return None
    try:
        text = p.read_text().strip()
        return json.loads(text) if text else None
    except (json.JSONDecodeError, OSError):
        return None

def list_predictions(model_id: str | None = None) -> list[dict[str, Any]]:
    result = []
    for p in sorted(PREDICTIONS_DIR.glob('*.json')):
        try:
            text = p.read_text().strip()
            if not text:
                continue
            record = json.loads(text)
        except (json.JSONDecodeError, OSError):
            continue
        if model_id is None or record.get('model_id') == model_id:
            result.append(record)
    return result

def new_id() -> str:
    return str(uuid.uuid4())
