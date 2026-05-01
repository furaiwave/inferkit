import { Fragment } from 'react';
import { Trash2, Table2, FileText } from 'lucide-react';
import type { DatasetMeta, DatasetId } from '@/types/api';
import { DatasetUploader } from '@/components/DatasetUploader';
import { useDatasets, useDeleteDataset } from '@/hooks/useDomain';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const TYPE_STYLE: Record<string, string> = {
  numeric:     'bg-blue-100   text-blue-700',
  categorical: 'bg-violet-100 text-violet-700',
  datetime:    'bg-amber-100  text-amber-700',
  boolean:     'bg-emerald-100 text-emerald-700',
  text:        'bg-slate-100  text-slate-600',
};

const TYPE_LABEL: Record<string, string> = {
  numeric:     'числові',
  categorical: 'категоріальні',
  datetime:    'дата/час',
  boolean:     'логічні',
  text:        'текстові',
};

function DatasetRow({ dataset, onDelete }: { dataset: DatasetMeta; onDelete: (id: DatasetId) => void }) {
  const colTypes = dataset.columns.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{dataset.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(dataset.created_at).toLocaleDateString()} ·{' '}
              {(dataset.size_bytes / 1024).toFixed(1)} KB ·{' '}
              {dataset.row_count.toLocaleString()} рядків ·{' '}
              {dataset.columns.length} стовп.
            </p>
            {/* Column type breakdown */}
            {dataset.columns.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(colTypes).map(([type, count]) => (
                  <span
                    key={type}
                    className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${TYPE_STYLE[type] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {count} {TYPE_LABEL[type] ?? type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">готово</Badge>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(dataset.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DatasetPage() {
  const query = useDatasets();
  const { mutate: deleteDataset } = useDeleteDataset();

  const handleDelete = async (id: DatasetId) => {
    const result = await deleteDataset(id);
    if (result) query.refetch();
  };

  const datasets = query.status === 'success' ? query.data.data : [];

  return (
    <div className="p-6 space-y-5">

      <div className="flex items-center gap-2 mb-1">
        <Table2 className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold">Датасети</h2>
      </div>

      <DatasetUploader onUploaded={() => query.refetch()} />

      <Card>
        <CardHeader>
          <CardTitle>
            {query.status === 'success'
              ? `${query.data.total} датасет${query.data.total === 1 ? '' : 'ів'}`
              : 'Датасети'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {query.status === 'loading' && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          )}
          {query.status === 'success' && datasets.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">
              Датасети ще не завантажені. Завантажте CSV файл вище, щоб розпочати.
            </p>
          )}
          {datasets.map((ds, i) => (
            <Fragment key={ds.id}>
              <DatasetRow dataset={ds} onDelete={handleDelete} />
              {i < datasets.length - 1 && <Separator />}
            </Fragment>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
