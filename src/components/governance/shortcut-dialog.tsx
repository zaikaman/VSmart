'use client';

import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ShortcutItem {
  keyLabel: string;
  description: string;
}

export function ShortcutDialog({
  open,
  onOpenChange,
  title,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: ShortcutItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Keyboard className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={`${item.keyLabel}-${item.description}`} className="flex items-center justify-between rounded-2xl border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3">
              <span className="text-sm text-slate-600">{item.description}</span>
              <kbd className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                {item.keyLabel}
              </kbd>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
