from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class ColumnSchema(BaseModel):
    name: str
    type: Literal['numeric', 'categorical', 'datetime', 'boolean', 'text']
    nullable: bool
    unique_values: int | None = None


class DatasetMeta(BaseModel):
    id: str
    name: str
    created_at: str
    size_bytes: int
    row_count: int
    columns: list[ColumnSchema]


class DatasetListResponse(BaseModel):
    data: list[DatasetMeta]
    total: int
    page: int
    page_size: int
    total_pages: int


class RandomForestParams(BaseModel):
    n_estimators: int = Field(100, ge=1)
    max_depth: int = Field(10, ge=1)
    min_samples_split: int = Field(2, ge=2)


class GradientBoostingParams(BaseModel):
    n_estimators: int = Field(100, ge=1)
    learning_rate: float = Field(0.1, gt=0, le=1)
    max_depth: int = Field(5, ge=1)


class SVMParams(BaseModel):
    C: float = Field(1.0, gt=0)
    kernel: Literal['rbf', 'linear', 'poly'] = 'rbf'
    gamma: Literal['scale', 'auto'] = 'scale'


class LogisticParams(BaseModel):
    C: float = Field(1.0, gt=0)
    max_iter: int = Field(100, ge=1)
    solver: Literal['lbfgs', 'liblinear'] = 'lbfgs'


class LinearRegressionParams(BaseModel):
    fit_intercept: bool = True


class RidgeLassoParams(BaseModel):
    alpha: float = Field(1.0, gt=0)
    fit_intercept: bool = True


class XGBoostParams(BaseModel):
    n_estimators: int = Field(100, ge=1)
    learning_rate: float = Field(0.1, gt=0, le=1)
    max_depth: int = Field(6, ge=1)
    subsample: float = Field(0.8, gt=0, le=1)


class KMeansParams(BaseModel):
    n_clusters: int = Field(3, ge=2)
    max_iter: int = Field(300, ge=1)
    init: Literal['k-means++', 'random'] = 'k-means++'


class DBSCANParams(BaseModel):
    eps: float = Field(0.5, gt=0)
    min_samples: int = Field(5, ge=1)


class HierarchicalParams(BaseModel):
    n_clusters: int = Field(3, ge=2)
    linkage: Literal['ward', 'complete', 'average'] = 'ward'


class ClassificationTask(BaseModel):
    kind: Literal['classification']
    algorithm: Literal['random_forest', 'gradient_boosting', 'svm', 'logistic_regression']
    hyperparams: RandomForestParams | GradientBoostingParams | SVMParams | LogisticParams


class RegressionTask(BaseModel):
    kind: Literal['regression']
    algorithm: Literal['linear_regression', 'ridge', 'lasso', 'xgboost']
    hyperparams: LinearRegressionParams | RidgeLassoParams | XGBoostParams


class ClusteringTask(BaseModel):
    kind: Literal['clustering']
    algorithm: Literal['kmeans', 'dbscan', 'hierarchical']
    hyperparams: KMeansParams | DBSCANParams | HierarchicalParams


AnyTask = ClassificationTask | RegressionTask | ClusteringTask


class CreateModelRequest(BaseModel):
    dataset_id: str
    name: str = Field(..., min_length=1, max_length=120)
    task: AnyTask = Field(discriminator='kind')
    target_column: str
    feature_columns: list[str] = Field(..., min_length=1)


class ModelMeta(BaseModel):
    id: str
    dataset_id: str
    name: str
    task: AnyTask = Field(discriminator='kind')
    target_column: str
    feature_columns: list[str]
    status: Literal['idle', 'training', 'trained', 'failed']
    created_at: str
    trained_at: str | None = None
    duration_ms: int | None = None
    error: str | None = None


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class ClassificationReport(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    confusion_matrix: list[list[int]]


class RegressionMetrics(BaseModel):
    mse: float
    rmse: float
    mae: float
    r2: float
    mape: float


class ClusteringMetrics(BaseModel):
    silhouette_score: float
    davies_bouldin_index: float
    inertia: float | None = None


class ModelDetail(ModelMeta):
    metrics: ClassificationReport | RegressionMetrics | ClusteringMetrics | None = None
    feature_importance: list[FeatureImportanceItem] | None = None


class PredictRequest(BaseModel):
    model_id: str
    input: dict[str, Any]


class ClassificationResult(BaseModel):
    kind: Literal['classification'] = 'classification'
    predicted_class: str
    probabilities: dict[str, float]


class RegressionResult(BaseModel):
    kind: Literal['regression'] = 'regression'
    predicted_value: float
    confidence_interval: tuple[float, float] | None = None


class ClusteringResult(BaseModel):
    kind: Literal['clustering'] = 'clustering'
    cluster_id: int
    distance_to_centroid: float


class PredictionRecord(BaseModel):
    id: str
    model_id: str
    input: dict[str, Any]
    result: ClassificationResult | RegressionResult | ClusteringResult
    created_at: str


class AnalyticsOverview(BaseModel):
    total_datasets: int
    total_models: int
    total_predictions: int
    models_by_kind: dict[str, int]
    recent_activity: list[dict[str, Any]]
