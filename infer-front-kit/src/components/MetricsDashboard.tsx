import type { ClassificationMetrics, RegressionMetrics, ClusteringMetrics } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type AnyMetrics = ClassificationMetrics | RegressionMetrics | ClusteringMetrics;

interface Props {
  readonly kind:    'classification' | 'regression' | 'clustering';
  readonly metrics: AnyMetrics;
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-sm p-3 space-y-1 ${highlight ? 'bg-primary/8 ring-1 ring-primary/20' : 'bg-muted/50'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold font-mono tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

export function MetricsDashboard({ kind, metrics }: Props) {
  if (kind === 'classification') {
    const m = metrics as ClassificationMetrics;
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle>Evaluation Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCell label="Accuracy"  value={(m.accuracy  * 100).toFixed(2) + '%'} highlight />
            <MetricCell label="Precision" value={(m.precision * 100).toFixed(2) + '%'} />
            <MetricCell label="Recall"    value={(m.recall    * 100).toFixed(2) + '%'} />
            <MetricCell label="F1 Score"  value={(m.f1        * 100).toFixed(2) + '%'} />
            <MetricCell label="ROC AUC"   value={m.roc_auc.toFixed(4)} />
          </div>
          {m.confusion_matrix.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Confusion Matrix</p>
              <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${m.confusion_matrix[0].length}, minmax(0, 1fr))` }}>
                {m.confusion_matrix.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      className={`w-10 h-10 flex items-center justify-center text-xs font-mono font-semibold rounded-sm
                        ${r === c ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {cell}
                    </div>
                  )),
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (kind === 'regression') {
    const m = metrics as RegressionMetrics;
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle>Evaluation Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCell label="R²"   value={m.r2.toFixed(4)}   highlight />
            <MetricCell label="RMSE" value={m.rmse.toFixed(4)} />
            <MetricCell label="MAE"  value={m.mae.toFixed(4)}  />
            <MetricCell label="MSE"  value={m.mse.toFixed(4)}  />
            <MetricCell label="MAPE" value={(m.mape * 100).toFixed(2) + '%'} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = metrics as ClusteringMetrics;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle>Evaluation Metrics</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCell label="Silhouette Score"     value={m.silhouette_score.toFixed(4)}     highlight />
          <MetricCell label="Davies-Bouldin Index" value={m.davies_bouldin_index.toFixed(4)} />
          {m.inertia != null && (
            <MetricCell label="Inertia" value={m.inertia.toFixed(2)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
