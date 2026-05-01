import React, { useState, useEffect, useCallback } from 'react';
import { Play, Trash2, RefreshCw } from 'lucide-react';
import type { ModelDetail, ModelId, DatasetId, PredictionRecord, CreateModelBody } from '@/types/api';
import {
  useDatasets, useModels, useModel,
  useCreateModel, useTrainModel, useDeleteModel, usePredict,
} from '@/hooks/useDomain';
import { ModelTrainer }      from '@/components/ModelTrainer';
import { MetricsDashboard }  from '@/components/MetricsDashboard';
import { FeatureImportance } from '@/components/FeatureImportance';
import { PredictionChart }   from '@/components/PredictionChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button }     from '@/components/ui/button';
import { Badge }      from '@/components/ui/badge';
import { Separator }  from '@/components/ui/separator';
import { Skeleton }   from '@/components/ui/skeleton';
import { Input }      from '@/components/ui/input';
import { Label }      from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

const STATUS_LABEL: Record<string, string> = {
  idle:     'очікує',
  training: 'навчання',
  trained:  'навчено',
  failed:   'помилка',
};

function statusVariant(s: string): BadgeVariant {
  switch (s) {
    case 'trained':  return 'default';
    case 'training': return 'secondary';
    case 'failed':   return 'destructive';
    default:         return 'outline';
  }
}

function PredictForm({ model, onResult }: { model: ModelDetail; onResult: (r: PredictionRecord) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(model.feature_columns.map((c) => [c, '0'])),
  );
  const { state, mutate } = usePredict();

  const handleSubmit = useCallback(async () => {
    const input = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)]),
    );
    const result = await mutate({ model_id: model.id, input });
    if (result) onResult(result);
  }, [values, mutate, model.id, onResult]);

  return (
    <Card>
      <CardHeader><CardTitle>Запустити прогноз</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {model.feature_columns.map((col) => (
            <div key={col} className="space-y-1.5">
              <Label className="font-mono text-xs">{col}</Label>
              <Input
                value={values[col] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [col]: e.target.value }))}
                placeholder="0"
                className="font-mono text-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={state.status === 'pending'} className="w-full">
          {state.status === 'pending' ? 'Прогнозування…' : 'Запустити прогноз'}
        </Button>
        {state.status === 'error' && (
          <p className="text-xs text-destructive">{state.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ModelDetailPanel({ modelId, onDeleted }: { modelId: ModelId; onDeleted: () => void }) {
  const query = useModel(modelId);
  const { state: trainState, mutate: train } = useTrainModel();
  const { mutate: deleteModel }              = useDeleteModel();
  const [prediction, setPrediction]          = useState<PredictionRecord | null>(null);

  const isTraining = query.status === 'success' && query.data.status === 'training';
  const { refetch } = query;

  useEffect(() => {
    if (!isTraining) return;
    const iv = setInterval(refetch, 2000);
    return () => clearInterval(iv);
  }, [isTraining, refetch]);

  if (query.status === 'loading' || query.status === 'idle') {
    return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-40" /></div>;
  }
  if (query.status === 'error') {
    return <p className="text-sm text-destructive p-4">{query.error.message}</p>;
  }

  const model     = query.data;
  const canTrain  = model.status === 'idle' || model.status === 'failed';

  const handleDelete = async () => {
    const result = await deleteModel(model.id);
    if (result) onDeleted();
  };

  const handleTrain = async () => {
    const result = await train(model.id);
    if (result) query.refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">{model.name}</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => query.refetch()}>
            <RefreshCw className={cn('w-4 h-4', isTraining && 'animate-spin')} />
          </Button>
          {canTrain && (
            <Button size="sm" variant="outline" onClick={handleTrain} disabled={trainState.status === 'pending'}>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {trainState.status === 'pending' ? 'Запуск…' : 'Навчити'}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Тип',       model.task.kind],
            ['Алгоритм',  model.task.algorithm],
            ['Статус',    <Badge variant={statusVariant(model.status)}>{STATUS_LABEL[model.status] ?? model.status}</Badge>],
            ['Ціль',      model.target_column],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              {typeof value === 'string'
                ? <p className="text-sm font-medium font-mono">{value}</p>
                : value}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Training state messages */}
      {isTraining && (
        <p className="text-sm text-muted-foreground animate-pulse">Навчання в процесі — оновлення кожні 2с…</p>
      )}
      {model.status === 'failed' && model.error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{model.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Metrics / features / predict */}
      {model.status === 'trained' && (
        <Tabs defaultValue="metrics">
          <TabsList>
            <TabsTrigger value="metrics">Метрики</TabsTrigger>
            <TabsTrigger value="features" disabled={!model.feature_importance?.length}>
              Важливість ознак
            </TabsTrigger>
            <TabsTrigger value="predict">Прогноз</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            {model.metrics && (
              <MetricsDashboard
                kind={model.task.kind}
                metrics={model.metrics as Parameters<typeof MetricsDashboard>[0]['metrics']}
              />
            )}
          </TabsContent>

          <TabsContent value="features">
            {model.feature_importance && <FeatureImportance items={model.feature_importance} />}
          </TabsContent>

          <TabsContent value="predict" className="space-y-4">
            <PredictForm model={model} onResult={setPrediction} />
            {prediction && <PredictionChart prediction={prediction} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export function ModelPage() {
  const [datasetId, setDatasetId] = useState<DatasetId | null>(null);
  const [modelId,   setModelId]   = useState<ModelId | null>(null);

  const datasetsQuery = useDatasets();
  const modelsQuery   = useModels(datasetId ?? undefined);
  const { state: createState, mutate: createModel } = useCreateModel();

  const datasets = datasetsQuery.status === 'success' ? datasetsQuery.data.data : [];
  const models   = modelsQuery.status  === 'success'  ? modelsQuery.data        : [];
  const selected = datasets.find((d) => d.id === datasetId);

  const { mutate: deleteModel } = useDeleteModel();
  const { refetch: refetchModels } = modelsQuery;

  const handleCreate = useCallback(async (body: CreateModelBody) => {
    const result = await createModel(body);
    if (result) { setModelId(result.id); refetchModels(); }
  }, [createModel, refetchModels]);

  const handleDeleteFromList = useCallback(async (id: ModelId) => {
    const result = await deleteModel(id);
    if (result) {
      if (modelId === id) setModelId(null);
      refetchModels();
    }
  }, [deleteModel, modelId, refetchModels]);

  return (
    <div className="p-6 flex gap-6 flex-wrap lg:flex-nowrap">

      <div className="w-full lg:w-72 shrink-0 space-y-4">
        <h2 className="text-lg font-semibold">Моделі</h2>

        <div className="space-y-1.5">
          <Label>Датасет</Label>
          <Select
            value={datasetId ?? ''}
            onValueChange={(v: string) => { setDatasetId(v as DatasetId); setModelId(null); }}
          >
            <SelectTrigger><SelectValue placeholder="— оберіть датасет —" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">
                {datasetId ? 'Для цього датасету немає моделей.' : 'Спочатку оберіть датасет.'}
              </p>
            ) : models.map((model, i) => (
              <React.Fragment key={model.id}>
                <div className={cn(
                  'flex items-center group transition-colors',
                  modelId === model.id ? 'bg-muted' : 'hover:bg-muted/50',
                )}>
                  <button
                    type="button"
                    onClick={() => setModelId(model.id)}
                    className="flex-1 min-w-0 text-left px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{model.name}</span>
                      <Badge variant={statusVariant(model.status)} className="shrink-0">
                        {STATUS_LABEL[model.status] ?? model.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{model.task.kind} · {model.task.algorithm}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFromList(model.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity pr-3 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Видалити модель"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {i < models.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <ModelTrainer
            datasetId={selected.id}
            columns={selected.columns.map((c) => c.name)}
            onSubmit={handleCreate}
            isLoading={createState.status === 'pending'}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-3xl">
        {modelId ? (
          <ModelDetailPanel
            modelId={modelId}
            onDeleted={() => { setModelId(null); modelsQuery.refetch(); }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Оберіть модель для перегляду
          </div>
        )}
      </div>

    </div>
  );
}