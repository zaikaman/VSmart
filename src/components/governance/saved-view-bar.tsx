'use client';

import { useState } from 'react';
import { BookmarkPlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SavedViewBar<T>({
  title,
  description,
  views,
  onApply,
  onSave,
  onDelete,
  disabled,
  saving,
}: {
  title: string;
  description: string;
  views: Array<{ id: string; name: string; value: T }>;
  onApply: (value: T) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <div className="rounded-[28px] border border-[#dbe4ce] bg-[#f8fbf3] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61705f]">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Đặt tên cho góc nhìn hiện tại..."
            className="sm:w-[240px]"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || saving}
            onClick={() => {
              if (!name.trim()) {
                toast.error('Vui lòng nhập tên góc nhìn');
                return;
              }

              onSave(name.trim());
              setName('');
              toast.success('Đã lưu góc nhìn');
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookmarkPlus className="mr-2 h-4 w-4" />}
            Lưu góc nhìn
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {views.length === 0 ? (
          <div className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500">
            Chưa có góc nhìn nào được lưu.
          </div>
        ) : (
          views.map((view) => (
            <div key={view.id} className="inline-flex items-center gap-1 rounded-full border border-white bg-white px-2 py-1">
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => onApply(view.value)}
              >
                {view.name}
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                onClick={() => onDelete(view.id)}
                aria-label={`Xóa góc nhìn ${view.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
