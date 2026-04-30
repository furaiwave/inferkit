from __future__ import annotations
import io
from datetime import datetime, timezone
from typing import Any
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from schemas.schemas import DatasetMeta, DatasetListResponse, ColumnSchema
from services import storage

router = APIRouter(prefix='/datasets', tags=['datasets'])


def _infer_column_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return 'boolean'
    if pd.api.types.is_numeric_dtype(series):
        return 'numeric'
    if pd.api.types.is_datetime64_any_dtype(series):
        return 'datetime'
    if series.nunique() / max(len(series), 1) < 0.5:
        return 'categorical'
    return 'text'

@router.post('', response_model=DatasetMeta, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str        = Query(default=''),
) -> DatasetMeta:
    """Upload a CSV file and persist metadata + raw data to filesystem."""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=422, detail='Only .csv files are accepted')

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f'Invalid CSV: {e}')

    if df.empty:
        raise HTTPException(status_code=422, detail='CSV file is empty')

    dataset_id = storage.new_id()
    dataset_name = name or file.filename.removesuffix('.csv')

    columns = [
        ColumnSchema(
            name=col,
            type=_infer_column_type(df[col]),
            nullable=bool(df[col].isna().any()),
            unique_values=int(df[col].nunique()) if _infer_column_type(df[col]) in ('categorical', 'text') else None,
        )
        for col in df.columns
    ]

    meta: dict[str, Any] = {
        'id':         dataset_id,
        'name':       dataset_name,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'size_bytes': len(contents),
        'row_count':  len(df),
        'columns':    [c.model_dump() for c in columns],
    }

    storage.save_dataset_meta(meta)
    storage.save_dataset_csv(dataset_id, df)

    return DatasetMeta(**meta)

@router.get('', response_model=DatasetListResponse)
async def list_datasets(
    page:      int = Query(default=1,  ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> DatasetListResponse:
    all_metas = storage.list_dataset_metas()
    total     = len(all_metas)
    start     = (page - 1) * page_size
    data      = [DatasetMeta(**m) for m in all_metas[start:start + page_size]]
    return DatasetListResponse(
        data=data, total=total, page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),  
    )

@router.get('/{dataset_id}', response_model=DatasetMeta)
async def get_dataset(dataset_id: str) -> DatasetMeta:
    meta = storage.load_dataset_meta(dataset_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f'Dataset {dataset_id} not found')
    return DatasetMeta(**meta)

@router.get('/{dataset_id}/preview')
async def preview_dataset(
    dataset_id: str,
    rows:       int = Query(default=10, ge=1, le=100),
) -> dict:
    df = storage.load_dataset_csv(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail=f'Dataset {dataset_id} not found')
    return {
        'rows':    df.head(rows).fillna('').to_dict(orient='records'),
        'columns': list(df.columns),
    }

@router.delete('/{dataset_id}')
async def delete_dataset(dataset_id: str) -> dict:
    if not storage.delete_dataset(dataset_id):
        raise HTTPException(status_code=404, detail=f'Dataset {dataset_id} not found')
    return {'success': True}