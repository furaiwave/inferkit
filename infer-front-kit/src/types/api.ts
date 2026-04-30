declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type DatasetId    = Brand<string, 'DatasetId'>;
export type ModelId      = Brand<string, 'ModelId'>;
export type PredictionId = Brand<string, 'PredictionId'>;

export const asDatasetId    = (s: string): DatasetId    => s as DatasetId;
export const asModelId      = (s: string): ModelId      => s as ModelId;
export const asPredictionId = (s: string): PredictionId => s as PredictionId;

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';

export interface ColumnSchema {
  readonly name:          string;
  readonly type:          ColumnType;
  readonly nullable:      boolean;
  readonly unique_values: number | null;
}

export interface DatasetMeta {
  readonly id:         DatasetId;
  readonly name:       string;
  readonly created_at: string;
  readonly size_bytes: number;
  readonly row_count:  number;
  readonly columns:    readonly ColumnSchema[];
}

export interface DatasetListResponse {
  readonly data:        readonly DatasetMeta[];
  readonly total:       number;
  readonly page:        number;
  readonly page_size:   number;
  readonly total_pages: number;
}

export type ClassificationAlgorithm = 'random_forest' | 'gradient_boosting' | 'svm' | 'logistic_regression';
export type RegressionAlgorithm     = 'linear_regression' | 'ridge' | 'lasso' | 'xgboost';
export type ClusteringAlgorithm     = 'kmeans' | 'dbscan' | 'hierarchical';

type RandomForestParams     = { n_estimators: number; max_depth: number; min_samples_split: number };
type GradientBoostingParams = { n_estimators: number; learning_rate: number; max_depth: number };
type SVMParams              = { C: number; kernel: 'rbf' | 'linear' | 'poly'; gamma: 'scale' | 'auto' };
type LogisticParams         = { C: number; max_iter: number; solver: 'lbfgs' | 'liblinear' };
type LinearRegressionParams = { fit_intercept: boolean };
type RidgeLassoParams       = { alpha: number; fit_intercept: boolean };
type XGBoostParams          = { n_estimators: number; learning_rate: number; max_depth: number; subsample: number };
type KMeansParams           = { n_clusters: number; max_iter: number; init: 'k-means++' | 'random' };
type DBSCANParams            = { eps: number; min_samples: number };
type HierarchicalParams     = { n_clusters: number; linkage: 'ward' | 'complete' | 'average' };

export type AlgorithmHyperparams<A extends ClassificationAlgorithm | RegressionAlgorithm | ClusteringAlgorithm> =
  A extends 'random_forest'       ? RandomForestParams     :
  A extends 'gradient_boosting'   ? GradientBoostingParams :
  A extends 'svm'                 ? SVMParams              :
  A extends 'logistic_regression' ? LogisticParams         :
  A extends 'linear_regression'   ? LinearRegressionParams :
  A extends 'ridge' | 'lasso'     ? RidgeLassoParams       :
  A extends 'xgboost'             ? XGBoostParams          :
  A extends 'kmeans'              ? KMeansParams           :
  A extends 'dbscan'              ? DBSCANParams           :
  A extends 'hierarchical'        ? HierarchicalParams     :
  never;

export type AnyTask =
  | { kind: 'classification'; algorithm: ClassificationAlgorithm; hyperparams: Record<string, unknown> }
  | { kind: 'regression';     algorithm: RegressionAlgorithm;     hyperparams: Record<string, unknown> }
  | { kind: 'clustering';     algorithm: ClusteringAlgorithm;     hyperparams: Record<string, unknown> };


export type ModelStatus = 'idle' | 'training' | 'trained' | 'failed';

export interface ModelMeta {
  readonly id:              ModelId;
  readonly dataset_id:      DatasetId;
  readonly name:            string;
  readonly task:            AnyTask;
  readonly target_column:   string;
  readonly feature_columns: readonly string[];
  readonly status:          ModelStatus;
  readonly created_at:      string;
  readonly trained_at:      string | null;
  readonly duration_ms:     number | null;
  readonly error:           string | null;
}

export interface FeatureImportanceItem {
  readonly feature:    string;
  readonly importance: number;
}

export interface ClassificationMetrics {
  readonly accuracy:         number;
  readonly precision:        number;
  readonly recall:           number;
  readonly f1:               number;
  readonly roc_auc:          number;
  readonly confusion_matrix: readonly (readonly number[])[];
}
export interface RegressionMetrics {
  readonly mse: number; readonly rmse: number;
  readonly mae: number; readonly r2:   number; readonly mape: number;
}
export interface ClusteringMetrics {
  readonly silhouette_score:     number;
  readonly davies_bouldin_index: number;
  readonly inertia?:             number;
}

export interface ModelDetail extends ModelMeta {
  readonly metrics?:            ClassificationMetrics | RegressionMetrics | ClusteringMetrics;
  readonly feature_importance?: readonly FeatureImportanceItem[];
}

export type PredictionResult =
  | { kind: 'classification'; predicted_class: string;  probabilities: Record<string, number> }
  | { kind: 'regression';     predicted_value: number;  confidence_interval?: [number, number] }
  | { kind: 'clustering';     cluster_id: number;       distance_to_centroid: number };

export interface PredictionRecord {
  readonly id:         PredictionId;
  readonly model_id:   ModelId;
  readonly input:      Record<string, string | number | boolean>;
  readonly result:     PredictionResult;
  readonly created_at: string;
}

export interface AnalyticsOverview {
  readonly total_datasets:    number;
  readonly total_models:      number;
  readonly total_predictions: number;
  readonly models_by_kind:    Record<string, number>;
  readonly recent_activity:   readonly Record<string, unknown>[];
}

export interface GatewayEnvelope<T> {
  readonly success: true;
  readonly data:    T;
  readonly ts:      string;
}

export interface GatewayError {
  readonly success: false;
  readonly error:   { statusCode: number; message: string; path: string };
  readonly ts:      string;
}

export interface CreateModelBody {
  readonly dataset_id:      DatasetId;
  readonly name:            string;
  readonly task:            AnyTask;
  readonly target_column:   string;
  readonly feature_columns: readonly string[];
}

export interface PredictBody {
  readonly model_id: ModelId;
  readonly input:    Record<string, string | number | boolean>;
}