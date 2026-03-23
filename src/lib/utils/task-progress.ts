export type WorkflowReviewStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested' | null | undefined;
export type WorkflowProgressMode = 'manual' | 'checklist' | null | undefined;
export type WorkflowTaskStatus = 'todo' | 'in-progress' | 'done' | string | null | undefined;

export function getEffectiveTaskProgress(params: {
  progress?: number | null;
  progressMode?: WorkflowProgressMode;
  status?: WorkflowTaskStatus;
  reviewStatus?: WorkflowReviewStatus;
}) {
  if (params.progressMode === 'checklist') {
    return Math.max(0, Math.min(100, params.progress || 0));
  }

  if (params.reviewStatus === 'pending_review') {
    return 90;
  }

  if (params.reviewStatus === 'approved') {
    return 100;
  }

  if (params.reviewStatus === 'changes_requested') {
    return 50;
  }

  if (params.status === 'done') {
    return 100;
  }

  if (params.status === 'in-progress') {
    return 50;
  }

  return 0;
}

export function getTaskProgressLabel(params: {
  progressMode?: WorkflowProgressMode;
  status?: WorkflowTaskStatus;
  reviewStatus?: WorkflowReviewStatus;
}) {
  if (params.progressMode === 'checklist') {
    return 'Theo checklist';
  }

  if (params.reviewStatus === 'pending_review') {
    return 'Chờ duyệt';
  }

  if (params.reviewStatus === 'changes_requested') {
    return 'Cần chỉnh sửa';
  }

  if (params.reviewStatus === 'approved' || params.status === 'done') {
    return 'Hoàn thành';
  }

  if (params.status === 'in-progress') {
    return 'Đang làm';
  }

  return 'Cần làm';
}
