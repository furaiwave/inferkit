import { useState, useCallback } from 'react';
import type { CreateModelBody, DatasetId, AnyTask, ClassificationAlgorithm, RegressionAlgorithm, ClusteringAlgorithm } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ModelTrainerProps {
  readonly datasetId:  DatasetId;
  readonly columns:    readonly string[];
  readonly onSubmit:   (body: CreateModelBody) => void;
  readonly isLoading?: boolean;
  readonly className?: string;
}

type TaskKind = 'classification' | 'regression' | 'clustering';

const ALGORITHMS = {
  classification: ['random_forest', 'gradient_boosting', 'svm', 'logistic_regression'] satisfies ClassificationAlgorithm[],
  regression:     ['linear_regression', 'ridge', 'lasso', 'xgboost']                   satisfies RegressionAlgorithm[],
  clustering:     ['kmeans', 'dbscan', 'hierarchical']                                  satisfies ClusteringAlgorithm[],
} as const;

const DEFAULT_HYPERPARAMS = {
  random_forest:       { n_estimators: 100, max_depth: 10, min_samples_split: 2 },
  gradient_boosting:   { n_estimators: 100, learning_rate: 0.1, max_depth: 5 },
  svm:                 { C: 1.0, kernel: 'rbf', gamma: 'scale' },
  logistic_regression: { C: 1.0, max_iter: 100, solver: 'lbfgs' },
  linear_regression:   { fit_intercept: true },
  ridge:               { alpha: 1.0, fit_intercept: true },
  lasso:               { alpha: 1.0, fit_intercept: true },
  xgboost:             { n_estimators: 100, learning_rate: 0.1, max_depth: 6, subsample: 0.8 },
  kmeans:              { n_clusters: 3, max_iter: 300, init: 'k-means++' },
  dbscan:              { eps: 0.5, min_samples: 5 },
  hierarchical:        { n_clusters: 3, linkage: 'ward' },
} as const;

function HyperparamsEditor({
  algorithm, values, onChange,
}: {
  algorithm: keyof typeof DEFAULT_HYPERPARAMS;
  values:    Record<string, string | number | boolean>;
  onChange:  (k: string, v: string | number | boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Hyperparameters</Label>
      <div className="rounded-md border p-3 space-y-2 bg-muted/30">
        {Object.entries(DEFAULT_HYPERPARAMS[algorithm]).map(([key, def]) => {
          const val = values[key] ?? def;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-40 shrink-0 font-mono">{key}</span>
              {typeof def === 'boolean' ? (
                <Button
                  type="button" size="sm" variant={val ? 'default' : 'outline'}
                  onClick={() => onChange(key, !val)}
                  className="h-6 px-3 text-xs"
                >
                  {val ? 'true' : 'false'}
                </Button>
              ) : typeof def === 'number' ? (
                <Input
                  type="number"
                  value={Number(val)}
                  onChange={(e) => onChange(key, parseFloat(e.target.value))}
                  step={Number(def) < 1 ? 0.01 : 1}
                  className="h-7 w-28 font-mono text-xs"
                />
              ) : (
                <Input
                  type="text"
                  value={String(val)}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="h-7 w-36 font-mono text-xs"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModelTrainer({ datasetId, columns, onSubmit, isLoading, className }: ModelTrainerProps) {
  const [name,        setName]        = useState('');
  const [kind,        setKind]        = useState<TaskKind>('classification');
  const [algorithm,   setAlgorithm]   = useState<string>(ALGORITHMS.classification[0]);
  const [hyperparams, setHyperparams] = useState<Record<string, string | number | boolean>>({});
  const [target,      setTarget]      = useState('');
  const [features,    setFeatures]    = useState<Set<string>>(new Set());

  const handleKind = useCallback((k: TaskKind) => {
    setKind(k); setAlgorithm(ALGORITHMS[k][0]); setHyperparams({});
  }, []);

  const toggleFeature = useCallback((col: string) => {
    setFeatures((prev) => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name || !target || features.size === 0) return;
    const defaults = DEFAULT_HYPERPARAMS[algorithm as keyof typeof DEFAULT_HYPERPARAMS];
    onSubmit({
      dataset_id:      datasetId,
      name,
      task:            { kind, algorithm, hyperparams: { ...defaults, ...hyperparams } } as AnyTask,
      target_column:   target,
      feature_columns: [...features],
    });
  }, [name, target, features, kind, algorithm, hyperparams, datasetId, onSubmit]);

  return (
    <Card className={className}>
      <CardHeader><CardTitle>New Model</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        <div className="space-y-1.5">
          <Label htmlFor="model-name">Model Name</Label>
          <Input id="model-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RandomForest v1" />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label>Task Kind</Label>
          <div className="flex gap-2">
            {(['classification', 'regression', 'clustering'] satisfies TaskKind[]).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? 'default' : 'outline'} onClick={() => handleKind(k)}>
                {k}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Algorithm</Label>
          <Select value={algorithm} onValueChange={(v: string) => { setAlgorithm(v); setHyperparams({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(ALGORITHMS[kind] as readonly string[]).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <HyperparamsEditor
          algorithm={algorithm as keyof typeof DEFAULT_HYPERPARAMS}
          values={hyperparams}
          onChange={(k, v) => setHyperparams((p) => ({ ...p, [k]: v }))}
        />

        <Separator />

        <div className="space-y-1.5">
          <Label>Target Column</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue placeholder="— select target —" /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Feature Columns</Label>
          <div className="flex flex-wrap gap-1.5">
            {columns.filter((c) => c !== target).map((col) => (
              <Badge
                key={col}
                variant={features.has(col) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => toggleFeature(col)}
              >
                {col}
              </Badge>
            ))}
          </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!name || !target || features.size === 0 || isLoading}
        >
          {isLoading ? 'Creating…' : 'Create Model'}
        </Button>
      </CardFooter>
    </Card>
  );
}
