import type { PredictionRecord } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props { readonly prediction: PredictionRecord; readonly className?: string }

export function PredictionChart({ prediction, className }: Props) {
  const { result } = prediction;

  const content = (() => {
    switch (result.kind) {
      case 'classification': {
        const sorted = Object.entries(result.probabilities).sort(([, a], [, b]) => b - a);
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Predicted Class</p>
              <p className="text-2xl font-mono font-bold">{result.predicted_class}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Probabilities</p>
              {sorted.map(([cls, prob]) => (
                <div key={cls}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={cn('font-mono text-xs', cls === result.predicted_class && 'font-bold')}>
                      {cls}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={prob * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'regression':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Predicted Value</p>
              <p className="text-3xl font-mono font-bold tabular-nums">
                {result.predicted_value.toFixed(4)}
              </p>
            </div>
            {result.confidence_interval && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">95% Confidence Interval</p>
                <p className="text-sm font-mono text-muted-foreground">
                  [{result.confidence_interval[0].toFixed(4)}, {result.confidence_interval[1].toFixed(4)}]
                </p>
              </div>
            )}
          </div>
        );
      case 'clustering':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Assigned Cluster</p>
              <p className="text-3xl font-mono font-bold">#{result.cluster_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Distance to Centroid</p>
              <p className="text-sm font-mono text-muted-foreground tabular-nums">
                {result.distance_to_centroid.toFixed(4)}
              </p>
            </div>
          </div>
        );
    }
  })();

  return (
    <Card className={className}>
      <CardHeader><CardTitle>Prediction Result</CardTitle></CardHeader>
      <CardContent>
        {content}
        <p className="mt-4 pt-3 border-t text-xs text-muted-foreground font-mono">
          {prediction.id} · {new Date(prediction.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
