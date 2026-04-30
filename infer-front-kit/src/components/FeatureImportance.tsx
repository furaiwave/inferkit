import type { FeatureImportanceItem } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props { readonly items: readonly FeatureImportanceItem[]; readonly className?: string }

export function FeatureImportance({ items, className }: Props) {
  const sorted = [...items].sort((a, b) => b.importance - a.importance);
  return (
    <Card className={className}>
      <CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {sorted.length === 0
          ? <p className="text-sm text-muted-foreground">No feature data available.</p>
          : sorted.map((item) => (
              <div key={item.feature}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono text-xs">{item.feature}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {(item.importance * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={item.importance * 100} className="h-1.5" />
              </div>
            ))
        }
      </CardContent>
    </Card>
  );
}