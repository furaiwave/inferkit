import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadDataset } from '@/hooks/useDomain';
import type { DatasetMeta } from '@/types/api';
import { cn } from '@/lib/utils';

interface DatasetUploaderProps {
  readonly onUploaded?: (dataset: DatasetMeta) => void;
  readonly className?:  string;
}

export function DatasetUploader({ onUploaded, className }: DatasetUploaderProps) {
  const [file, setFile]         = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const { state, mutate, reset } = useUploadDataset();

  const handleFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setProgress(0);
    const iv = setInterval(() => setProgress((p) => Math.min(p + 12, 85)), 150);
    const result = await mutate({ file, name: file.name.replace('.csv', '') });
    clearInterval(iv);
    setProgress(100);
    if (result) onUploaded?.(result);
  }, [file, mutate, onUploaded]);

  const handleReset = useCallback(() => { setFile(null); setProgress(0); reset(); }, [reset]);

  return (
    <Card className={cn(state.status === 'error' ? 'ring-1 ring-destructive/50' : '', className)}>
      <CardContent className="pt-5 pb-5">

        {/* idle / pending */}
        {(state.status === 'idle' || state.status === 'pending') && (
          <div className="flex items-center gap-4">
            {/* Drop zone icon */}
            <div className={cn(
              'w-12 h-12 rounded-sm border-2 border-dashed flex items-center justify-center shrink-0 transition-colors',
              file ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30',
            )}>
              {file
                ? <FileText className="w-5 h-5 text-primary" />
                : <Upload className="w-5 h-5 text-muted-foreground" />}
            </div>

            {/* Info + actions */}
            <div className="flex-1 min-w-0">
              {file ? (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <button type="button" onClick={handleReset} className="ml-auto text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium mb-1">Завантажте CSV датасет</p>
              )}

              {state.status === 'pending' ? (
                <div className="space-y-1.5">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">Завантаження… {progress}%</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>{file ? 'Змінити файл' : 'Обрати CSV'}</span>
                    </Button>
                  </label>
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleFile} className="sr-only" />
                  {file && (
                    <Button size="sm" onClick={handleUpload}>
                      Завантажити
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* success */}
        {state.status === 'success' && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{state.data.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {state.data.row_count.toLocaleString()} рядків · {state.data.columns.length} стовпців · успішно завантажено
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>Завантажити ще</Button>
          </div>
        )}

        {/* error */}
        {state.status === 'error' && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Помилка завантаження</p>
              <p className="text-xs text-muted-foreground mt-0.5">{state.error.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>Повторити</Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
