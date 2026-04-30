from __future__ import annotations
from fastapi import APIRouter
from schemas.schemas import AnalyticsOverview
from services import storage

router = APIRouter(prefix='/analytics', tags=['analytics'])


@router.get('/overview', response_model=AnalyticsOverview)
async def overview() -> AnalyticsOverview:
    datasets    = storage.list_dataset_metas()
    models      = storage.list_model_metas()
    predictions = storage.list_predictions()

    models_by_kind: dict[str, int] = {'classification': 0, 'regression': 0, 'clustering': 0}
    recent: list[dict] = []

    for m in models:
        kind = m.get('task', {}).get('kind', 'classification')
        models_by_kind[kind] = models_by_kind.get(kind, 0) + 1
        if m.get('trained_at'):
            recent.append({'kind': 'model_trained', 'model_id': m['id'], 'name': m['name'], 'at': m['trained_at']})

    for d in datasets:
        recent.append({'kind': 'dataset_uploaded', 'dataset_id': d['id'], 'name': d['name'], 'at': d['created_at']})

    for p in predictions[-5:]:
        recent.append({'kind': 'prediction_made', 'prediction_id': p['id'], 'at': p['created_at']})

    # Sort by time desc, keep last 20
    recent.sort(key=lambda x: x.get('at', ''), reverse=True)

    return AnalyticsOverview(
        total_datasets=len(datasets),
        total_models=len(models),
        total_predictions=len(predictions),
        models_by_kind=models_by_kind,
        recent_activity=recent[:20],
    )