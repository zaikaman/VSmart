export interface ChecklistItemInput {
  title: string;
  is_done: boolean;
  sort_order: number;
}

export function normalizeChecklistItems(input: unknown): ChecklistItemInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalizedItems = input
    .map<ChecklistItemInput | null>((item, index) => {
      if (typeof item === 'string') {
        return {
          title: item.trim(),
          is_done: false,
          sort_order: index,
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const rawTitle = 'title' in item ? item.title : '';
      const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

      if (!title) {
        return null;
      }

      const rawIsDone = 'is_done' in item ? item.is_done : false;
      const rawSortOrder = 'sort_order' in item ? item.sort_order : index;

      return {
        title,
        is_done: typeof rawIsDone === 'boolean' ? rawIsDone : false,
        sort_order:
          typeof rawSortOrder === 'number' && Number.isFinite(rawSortOrder)
            ? rawSortOrder
            : index,
        };
    })
    .filter((item): item is ChecklistItemInput => item !== null);

  return normalizedItems;
}

export function serializeChecklistTemplate(items: ChecklistItemInput[]) {
  return items.map((item, index) => ({
    title: item.title,
    is_done: item.is_done ?? false,
    sort_order: item.sort_order ?? index,
  }));
}
