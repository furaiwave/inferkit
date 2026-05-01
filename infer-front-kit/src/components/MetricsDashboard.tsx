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
        <CardHeader className="pb-2"><CardTitle>Метрики якості</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCell label="Точність"       value={(m.accuracy  * 100).toFixed(2) + '%'} highlight />
            <MetricCell label="Прецизійність"  value={(m.precision * 100).toFixed(2) + '%'} />
            <MetricCell label="Повнота"        value={(m.recall    * 100).toFixed(2) + '%'} />
            <MetricCell label="F1-міра"        value={(m.f1        * 100).toFixed(2) + '%'} />
            <MetricCell label="ROC AUC"        value={m.roc_auc.toFixed(4)} />
          </div>
          {m.confusion_matrix.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground font-medium mb-3">Правильні передбачення по класах</p>
              {(() => {
                const diagonal  = m.confusion_matrix.map((row, i) => row[i]);
                const totals    = m.confusion_matrix.map(row => row.reduce((a, b) => a + b, 0));
                const maxVal    = Math.max(...diagonal, 1);
                return (
                  <div className="overflow-x-auto pb-1">
                    <div className="flex items-end gap-px min-w-max" style={{ height: '7rem' }}>
                      {diagonal.map((val, i) => {
                        const pct     = totals[i] > 0 ? Math.round(val / totals[i] * 100) : 0;
                        const barH    = Math.max((val / maxVal) * 100, val > 0 ? 4 : 0);
                        return (
                          <div
                            key={i}
                            className="flex flex-col items-center justify-end gap-px group"
                            style={{ width: '1.25rem' }}
                            title={`Клас ${i}: ${val} з ${totals[i]} (${pct}%)`}
                          >
                            <div
                              className="w-full rounded-t-sm transition-all bg-primary/60 group-hover:bg-primary"
                              style={{ height: `${barH}%` }}
                            />
                            <span className="text-[9px] text-muted-foreground font-mono leading-none">
                              {i}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
        <CardHeader className="pb-2"><CardTitle>Метрики якості</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCell label="R²"   value={m.r2.toFixed(4)}   highlight />
            <MetricCell label="RMSE" value={m.rmse.toFixed(4)} />
            <MetricCell label="MAE"  value={m.mae.toFixed(4)}  />
            <MetricCell label="MSE"  value={m.mse.toFixed(4)}  />
            <MetricCell label="MAPE" value={m.mape.toFixed(2) + '%'} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = metrics as ClusteringMetrics;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle>Метрики якості</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCell label="Силует"                value={m.silhouette_score.toFixed(4)}     highlight />
          <MetricCell label="Індекс Девіса-Болдіна" value={m.davies_bouldin_index.toFixed(4)} />
          {m.inertia != null && (
            <MetricCell label="Інерція" value={m.inertia.toFixed(2)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
