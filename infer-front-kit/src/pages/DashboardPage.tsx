import { type ElementType, Fragment } from 'react';
import { Database, BrainCircuit, Zap, TrendingUp } from 'lucide-react';
import { useAnalytics } from '@/hooks/useDomain';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label:     string;
  value:     number;
  icon:      ElementType;
  accent:    string;
  iconColor: string;
}

function StatCard({ label, value, icon: Icon, accent, iconColor }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-40">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</p>
          </div>
          <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${accent}`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const KIND_CONFIG = [
  { key: 'classification', label: 'Classification', bar: 'bg-primary',     dot: 'bg-primary' },
  { key: 'regression',     label: 'Regression',     bar: 'bg-blue-500',    dot: 'bg-blue-500' },
  { key: 'clustering',     label: 'Clustering',     bar: 'bg-orange-400',  dot: 'bg-orange-400' },
];

const ACTIVITY_BADGE: Record<string, string> = {
  dataset_uploaded:  'bg-emerald-100 text-emerald-700',
  model_created:     'bg-blue-100 text-blue-700',
  model_trained:     'bg-primary/10 text-primary',
  prediction_made:   'bg-amber-100 text-amber-700',
};

export function DashboardPage() {
  const query = useAnalytics();

  if (query.status === 'loading' || query.status === 'idle') {
    return (
      <div className="p-6 space-y-5">
        <div className="flex gap-3 flex-wrap">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="flex-1 h-28 min-w-40" />)}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (query.status === 'error') {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-sm text-destructive">{query.error.message}</p>
      </div>
    );
  }

  const { data }  = query;
  const total     = Math.max(data.total_models, 1);
  const kinds     = KIND_CONFIG.map((k) => ({ ...k, count: data.models_by_kind[k.key] ?? 0 }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold">System Overview</h2>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Datasets"    value={data.total_datasets}
          icon={Database}     accent="bg-emerald-100" iconColor="text-emerald-600"
        />
        <StatCard
          label="Models"      value={data.total_models}
          icon={BrainCircuit} accent="bg-primary/10"  iconColor="text-primary"
        />
        <StatCard
          label="Predictions" value={data.total_predictions}
          icon={Zap}          accent="bg-amber-100"   iconColor="text-amber-600"
        />
      </div>

      {/* Models by kind */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>Models by Type</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Stacked bar */}
          <div className="flex h-2.5 overflow-hidden rounded-full gap-px bg-muted">
            {kinds.map(({ key, bar, count }) =>
              count > 0 ? (
                <div
                  key={key}
                  className={`${bar} transition-all`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-3 gap-2">
            {kinds.map(({ key, label, dot, count }) => (
              <div key={key} className="flex items-center justify-between bg-muted/50 rounded-sm px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">No activity recorded yet.</p>
          ) : (
            <div>
              {data.recent_activity.slice(0, 10).map((event, i) => {
                const kind = event['kind'] as string;
                const name = (event['name'] ?? event['prediction_id'] ?? '') as string;
                const at   = event['at'] as string;
                const badgeCls = ACTIVITY_BADGE[kind] ?? 'bg-secondary text-secondary-foreground';
                return (
                  <Fragment key={i}>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${badgeCls}`}>
                          {kind.replace('_', ' ')}
                        </span>
                        <span className="text-sm truncate text-foreground">{name || '—'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-3 shrink-0">
                        {new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {i < Math.min(9, data.recent_activity.length - 1) && <Separator />}
                  </Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
