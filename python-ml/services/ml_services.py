from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier,
    GradientBoostingRegressor,
)
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, davies_bouldin_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from schemas.schemas import (
    ClassificationReport as ClassificationMetrics, RegressionMetrics, ClusteringMetrics,
    ClassificationResult, RegressionResult, ClusteringResult,
    FeatureImportanceItem,
)
from services import storage


def _build_estimator(task: Any) -> Any:
    hp = task.hyperparams
    match task.algorithm:
        case 'random_forest':
            return RandomForestClassifier(
                n_estimators=hp.n_estimators, max_depth=hp.max_depth,
                min_samples_split=hp.min_samples_split, random_state=42, n_jobs=-1,
            )
        case 'gradient_boosting':
            return GradientBoostingClassifier(
                n_estimators=hp.n_estimators, learning_rate=hp.learning_rate,
                max_depth=hp.max_depth, random_state=42,
            )
        case 'svm':
            return SVC(C=hp.C, kernel=hp.kernel, gamma=hp.gamma, probability=True, random_state=42)
        case 'logistic_regression':
            return LogisticRegression(
                C=hp.C, max_iter=hp.max_iter, solver=hp.solver, random_state=42,
            )
        case 'linear_regression':
            return LinearRegression(fit_intercept=hp.fit_intercept)
        case 'ridge':
            return Ridge(alpha=hp.alpha, fit_intercept=hp.fit_intercept)
        case 'lasso':
            return Lasso(alpha=hp.alpha, fit_intercept=hp.fit_intercept)
        case 'xgboost':
            return GradientBoostingRegressor(
                n_estimators=hp.n_estimators, learning_rate=hp.learning_rate,
                max_depth=hp.max_depth, subsample=hp.subsample, random_state=42,
            )
        case 'kmeans':
            return KMeans(
                n_clusters=hp.n_clusters, max_iter=hp.max_iter,
                init=hp.init, random_state=42, n_init='auto',
            )
        case 'dbscan':
            return DBSCAN(eps=hp.eps, min_samples=hp.min_samples)
        case 'hierarchical':
            return AgglomerativeClustering(n_clusters=hp.n_clusters, linkage=hp.linkage)
        case _:
            raise ValueError(f'Unknown algorithm: {task.algorithm}')


def _extract_feature_importance(
    estimator: Any,
    features:  list[str],
) -> list[FeatureImportanceItem] | None:
    imps: np.ndarray | None = getattr(estimator, 'feature_importances_', None)
    if imps is None:
        coef = getattr(estimator, 'coef_', None)
        if coef is not None:
            imps = np.abs(np.atleast_2d(coef)).mean(axis=0)[:len(features)]
    if imps is None:
        return None
    total = float(imps.sum()) or 1.0
    return [
        FeatureImportanceItem(feature=f, importance=float(i / total))
        for f, i in sorted(zip(features, imps), key=lambda x: x[1], reverse=True)
    ]



def train_model(
    model_id:       str,
    task:           Any,
    df:             pd.DataFrame,
    target_column:  str,
    feature_columns: list[str],
) -> dict[str, Any]:
    """
    Trains the estimator, persists it to disk via joblib, returns metrics dict.
    """
    t0   = time.monotonic()
    kind = task.kind

    X = df[feature_columns].copy()
    y = df[target_column].copy()

    for col in X.select_dtypes(include='object').columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X.values.astype(float))
    est      = _build_estimator(task)

    if kind == 'clustering':
        labels   = est.fit_predict(X_scaled)
        n_unique = len(set(labels))
        sil  = float(silhouette_score(X_scaled, labels))     if n_unique > 1 else 0.0
        db   = float(davies_bouldin_score(X_scaled, labels)) if n_unique > 1 else 0.0
        metrics = ClusteringMetrics(
            silhouette_score=sil,
            davies_bouldin_index=db,
            inertia=float(getattr(est, 'inertia_', None) or 0) or None,
        )
        storage.save_estimator(model_id, est, scaler)
        fi = None

    elif kind == 'classification':
        le    = LabelEncoder()
        y_enc = le.fit_transform(y.astype(str))
        X_tr, X_te, y_tr, y_te = train_test_split(
            X_scaled, y_enc, test_size=0.2, random_state=42,
        )
        est.fit(X_tr, y_tr)
        y_pred = est.predict(X_te)
        y_prob = est.predict_proba(X_te) if hasattr(est, 'predict_proba') else None
        n_cls  = len(le.classes_)
        avg    = 'weighted' if n_cls > 2 else 'binary'

        roc = 0.0
        if y_prob is not None:
            try:
                roc = float(roc_auc_score(
                    y_te,
                    y_prob if n_cls == 2 else y_prob,
                    multi_class='ovr' if n_cls > 2 else 'raise',
                    average='weighted' if n_cls > 2 else None,
                ))
            except ValueError:
                roc = 0.0

        metrics = ClassificationMetrics(
            accuracy=float(accuracy_score(y_te, y_pred)),
            precision=float(precision_score(y_te, y_pred, average=avg, zero_division=0)),
            recall=float(recall_score(y_te, y_pred, average=avg, zero_division=0)),
            f1=float(f1_score(y_te, y_pred, average=avg, zero_division=0)),
            roc_auc=roc,
            confusion_matrix=confusion_matrix(y_te, y_pred).tolist(),
        )
        storage.save_estimator(model_id, est, scaler, encoder=le)
        fi = _extract_feature_importance(est, feature_columns)

    else:
        y_num = pd.to_numeric(y, errors='coerce').fillna(0).values
        X_tr, X_te, y_tr, y_te = train_test_split(
            X_scaled, y_num, test_size=0.2, random_state=42,
        )
        est.fit(X_tr, y_tr)
        y_pred = est.predict(X_te)
        mse    = float(mean_squared_error(y_te, y_pred))
        metrics = RegressionMetrics(
            mse=mse,
            rmse=float(np.sqrt(mse)),
            mae=float(mean_absolute_error(y_te, y_pred)),
            r2=float(r2_score(y_te, y_pred)),
            mape=float(np.mean(np.abs((y_te - y_pred) / (np.abs(y_te) + 1e-8))) * 100),
        )
        storage.save_estimator(model_id, est, scaler)
        fi = _extract_feature_importance(est, feature_columns)

    duration_ms = int((time.monotonic() - t0) * 1000)

    return {
        'metrics':            metrics.model_dump(),
        'feature_importance': [f.model_dump() for f in fi] if fi else None,
        'trained_at':         datetime.now(timezone.utc).isoformat(),
        'duration_ms':        duration_ms,
    }



def predict(
    model_id:       str,
    task_kind:      str,
    feature_columns: list[str],
    input_data:     dict[str, Any],
) -> ClassificationResult | RegressionResult | ClusteringResult:
    """
    Loads estimator from disk and runs inference.
    """
    artifacts = storage.load_estimator(model_id)
    if artifacts is None:
        raise KeyError(f'No trained estimator found for model {model_id}')

    est    = artifacts['estimator']
    scaler = artifacts['scaler']
    row    = scaler.transform([[float(input_data.get(f, 0)) for f in feature_columns]])

    if task_kind == 'clustering':
        label = int(est.predict(row)[0]) if hasattr(est, 'predict') else 0
        return ClusteringResult(cluster_id=label, distance_to_centroid=0.0)

    elif task_kind == 'classification':
        le      = artifacts['encoder']
        classes = le.classes_.tolist()
        idx     = int(est.predict(row)[0])
        probs   = est.predict_proba(row)[0].tolist() if hasattr(est, 'predict_proba') else []
        return ClassificationResult(
            predicted_class=classes[idx] if idx < len(classes) else str(idx),
            probabilities={cls: float(p) for cls, p in zip(classes, probs)},
        )

    else: 
        val = float(est.predict(row)[0])
        std = abs(val) * 0.05
        return RegressionResult(
            predicted_value=val,
            confidence_interval=(val - 1.96 * std, val + 1.96 * std),
        )