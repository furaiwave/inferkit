from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query

from schemas.schemas import CreateModelRequest, ModelMeta, ModelDetail
from services import storage, ml_services as ml_service

router  = APIRouter(prefix='/models', tags=['models'])
_pool   = ThreadPoolExecutor(max_workers=4) 


def _build_mock_df(model_meta: dict[str, Any]):
    """Generates synthetic training data when no dataset CSV found."""
    import numpy as np
    import pandas as pd

    features = model_meta['feature_columns']
    target   = model_meta['target_column']
    kind     = model_meta['task']['kind']
    n        = 300

    data = {col: np.random.randn(n) * 10 + 50 for col in features}
    if kind == 'classification':
        data[target] = np.random.choice(['A', 'B', 'C'], n)
    else:
        data[target] = np.random.randn(n) * 20 + 100
    return pd.DataFrame(data)


async def _run_training(model_id: str) -> None:
    """
    Offloads sklearn training to a thread pool so the event loop stays free.
    Updates model meta on disk with results or error.
    """
    meta = storage.load_model_meta(model_id)
    if meta is None:
        return

    meta['status'] = 'training'
    storage.save_model_meta(meta)

    loop = asyncio.get_event_loop()
    try:
        df = storage.load_dataset_csv(meta['dataset_id'])
        if df is None:
            df = _build_mock_df(meta)

        from schemas.schemas import ClassificationTask, RegressionTask, ClusteringTask
        task_data = meta['task']
        task_kind = task_data['kind']
        task_cls  = {'classification': ClassificationTask, 'regression': RegressionTask, 'clustering': ClusteringTask}[task_kind]
        task      = task_cls.model_validate(task_data)

        result = await loop.run_in_executor(
            _pool,
            ml_service.train_model,
            model_id,
            task,
            df,
            meta['target_column'],
            meta['feature_columns'],
        )

        meta.update({
            'status':             'trained',
            'trained_at':         result['trained_at'],
            'duration_ms':        result['duration_ms'],
            'metrics':            result['metrics'],
            'feature_importance': result['feature_importance'],
        })
    except Exception as exc:
        meta.update({'status': 'failed', 'error': str(exc)})

    storage.save_model_meta(meta)


@router.post('', response_model=ModelMeta, status_code=201)
async def create_model(body: CreateModelRequest) -> ModelMeta:
    if storage.load_dataset_meta(body.dataset_id) is None:
        raise HTTPException(status_code=404, detail=f'Dataset {body.dataset_id} not found')

    model_id = storage.new_id()
    meta: dict[str, Any] = {
        'id':              model_id,
        'dataset_id':      body.dataset_id,
        'name':            body.name,
        'task':            body.task.model_dump(),
        'target_column':   body.target_column,
        'feature_columns': body.feature_columns,
        'status':          'idle',
        'created_at':      datetime.now(timezone.utc).isoformat(),
        'trained_at':      None,
        'duration_ms':     None,
        'error':           None,
    }
    storage.save_model_meta(meta)
    return ModelMeta(**meta)

@router.get('', response_model=list[ModelMeta])
async def list_models(
    dataset_id: str | None = Query(default=None),
) -> list[ModelMeta]:
    metas = storage.list_model_metas()
    if dataset_id:
        metas = [m for m in metas if m.get('dataset_id') == dataset_id]
    return [ModelMeta(**m) for m in metas]

@router.get('/{model_id}', response_model=ModelDetail)
async def get_model(model_id: str) -> ModelDetail:
    meta = storage.load_model_meta(model_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f'Model {model_id} not found')
    return ModelDetail(**meta)

@router.post('/{model_id}/train', response_model=ModelMeta)
async def train_model(
    model_id:         str,
    background_tasks: BackgroundTasks,
) -> ModelMeta:
    meta = storage.load_model_meta(model_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f'Model {model_id} not found')
    if meta.get('status') == 'training':
        raise HTTPException(status_code=409, detail='Model is already training')

    meta['status'] = 'training'
    storage.save_model_meta(meta)
    background_tasks.add_task(_run_training, model_id)
    return ModelMeta(**meta)


@router.delete('/{model_id}')
async def delete_model(model_id: str) -> dict:
    if not storage.delete_model(model_id):
        raise HTTPException(status_code=404, detail=f'Model {model_id} not found')
    return {'success': True}