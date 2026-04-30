from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from schemas.schemas import PredictRequest, PredictionRecord
from services import storage, ml_services as ml_service

router = APIRouter(prefix='/predictions', tags=['predictions'])


@router.post('', response_model=PredictionRecord, status_code=201)
async def predict(body: PredictRequest) -> PredictionRecord:
    meta = storage.load_model_meta(body.model_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f'Model {body.model_id} not found')
    if meta.get('status') != 'trained':
        raise HTTPException(
            status_code=409,
            detail=f'Model is not trained yet (status: {meta.get("status")})',
        )

    try:
        result = ml_service.predict(
            model_id=body.model_id,
            task_kind=meta['task']['kind'],
            feature_columns=meta['feature_columns'],
            input_data=body.input,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Prediction failed: {e}')

    record_dict = {
        'id':         storage.new_id(),
        'model_id':   body.model_id,
        'input':      body.input,
        'result':     result.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    storage.save_prediction(record_dict)
    return PredictionRecord(**record_dict)


@router.get('', response_model=list[PredictionRecord])
async def list_predictions(
    model_id: str | None = Query(default=None),
) -> list[PredictionRecord]:
    records = storage.list_predictions(model_id=model_id)
    return [PredictionRecord(**r) for r in records]


@router.get('/{prediction_id}', response_model=PredictionRecord)
async def get_prediction(prediction_id: str) -> PredictionRecord:
    record = storage.load_prediction(prediction_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f'Prediction {prediction_id} not found')
    return PredictionRecord(**record)