export type AppRole = 'admin' | 'manager' | 'member';
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested';

export interface PermissionContext {
  appRole: AppRole;
  projectRole?: ProjectRole | null;
  isAssignee?: boolean;
}

export const PERMISSION_MATRIX = {
  admin: {
    manageProjects: true,
    manageMembers: true,
    createTask: true,
    updateTask: true,
    deleteTask: true,
    submitReview: true,
    approveTask: true,
    rejectTask: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewReviewQueue: true,
  },
  manager: {
    manageProjects: true,
    manageMembers: true,
    createTask: true,
    updateTask: true,
    deleteTask: true,
    submitReview: true,
    approveTask: true,
    rejectTask: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewReviewQueue: true,
  },
  member: {
    manageProjects: false,
    manageMembers: false,
    createTask: true,
    updateTask: true,
    deleteTask: false,
    submitReview: true,
    approveTask: false,
    rejectTask: false,
    viewAnalytics: false,
    exportAnalytics: false,
    viewReviewQueue: false,
  },
} as const;

export type PermissionName = keyof (typeof PERMISSION_MATRIX)['admin'];

export function hasPermission(context: PermissionContext, permission: PermissionName) {
  const base = PERMISSION_MATRIX[context.appRole][permission];

  if (permission === 'manageMembers') {
    return base && ['owner', 'admin'].includes(context.projectRole || '');
  }

  if (permission === 'deleteTask') {
    return base || (context.appRole === 'member' && context.isAssignee === true);
  }

  if (permission === 'updateTask') {
    if (context.projectRole === 'viewer') {
      return false;
    }

    return base;
  }

  if (permission === 'submitReview') {
    return context.projectRole !== 'viewer';
  }

  if (permission === 'approveTask' || permission === 'rejectTask' || permission === 'viewReviewQueue') {
    return (
      base &&
      ['owner', 'admin', 'member'].includes(context.projectRole || '') &&
      (context.appRole === 'admin' || context.appRole === 'manager')
    );
  }

  if (permission === 'viewAnalytics' || permission === 'exportAnalytics') {
    return base;
  }

  return base;
}

export function canTransitionReviewStatus(params: {
  currentStatus: ReviewStatus;
  nextStatus: ReviewStatus;
}) {
  const validTransitions: Record<ReviewStatus, ReviewStatus[]> = {
    draft: ['pending_review'],
    pending_review: ['approved', 'changes_requested'],
    approved: [],
    changes_requested: ['pending_review'],
  };

  return validTransitions[params.currentStatus].includes(params.nextStatus);
}
