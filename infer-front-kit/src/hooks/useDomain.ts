import { api } from '@/api/client';
import { useQuery, useMutation } from './useQuery';
import type {
  DatasetMeta, DatasetListResponse, ModelMeta, ModelDetail,
  CreateModelBody, PredictionRecord, PredictBody,
  AnalyticsOverview, ModelId, DatasetId,
} from '@/types/api';

export const useDatasets = (page = 1, pageSize = 20) =>
  useQuery<DatasetListResponse>(
    () => api.get(`/datasets?page=${page}&page_size=${pageSize}`),
    [page, pageSize],
  );

export const useDataset = (id: DatasetId | null) =>
  useQuery<DatasetMeta>(() => api.get(`/datasets/${id}`), [id], id !== null);

export const useUploadDataset = () =>
  useMutation<DatasetMeta, { file: File; name?: string }>(({ file, name }) => {
    const form = new FormData();
    form.append('file', file);
    const q = name ? `?name=${encodeURIComponent(name)}` : '';
    return api.upload(`/datasets${q}`, form);
  });

export const useDeleteDataset = () =>
  useMutation<{ success: true }, DatasetId>((id) => api.delete(`/datasets/${id}`));

export const useModels = (datasetId?: DatasetId) =>
  useQuery<ModelMeta[]>(
    () => api.get(`/models${datasetId ? `?dataset_id=${datasetId}` : ''}`),
    [datasetId],
  );

export const useModel = (id: ModelId | null) =>
  useQuery<ModelDetail>(() => api.get(`/models/${id}`), [id], id !== null);

export const useCreateModel = () =>
  useMutation<ModelMeta, CreateModelBody>((body) => api.post('/models', body));

export const useTrainModel = () =>
  useMutation<ModelMeta, ModelId>((id) => api.post(`/models/${id}/train`, {}));

export const useDeleteModel = () =>
  useMutation<{ success: true }, ModelId>((id) => api.delete(`/models/${id}`));

export const usePredictions = (modelId?: ModelId) =>
  useQuery<PredictionRecord[]>(
    () => api.get(`/predictions${modelId ? `?model_id=${modelId}` : ''}`),
    [modelId],
  );

export const usePredict = () =>
  useMutation<PredictionRecord, PredictBody>((body) => api.post('/predictions', body));

export const useAnalytics = () =>
  useQuery<AnalyticsOverview>(() => api.get('/analytics/overview'), []);