export type AppRole = 'owner' | 'admin' | 'manager' | 'member';
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested';

export interface PermissionContext {
  appRole: AppRole;
  projectRole?: ProjectRole | null;
  isAssignee?: boolean;
}

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Chủ tổ chức',
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  member: 'Thành viên',
};

export const APP_ROLE_PRIORITY: Record<AppRole, number> = {
  member: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

export const PERMISSION_MATRIX = {
  owner: {
    manageProjects: true,
    manageMembers: true,
    createTask: true,
    assignTask: true,
    updateTask: true,
    deleteTask: true,
    submitReview: true,
    approveTask: true,
    rejectTask: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewReviewQueue: true,
    manageOrganizationSettings: true,
    manageOrganizationRoles: true,
  },
  admin: {
    manageProjects: true,
    manageMembers: true,
    createTask: true,
    assignTask: true,
    updateTask: true,
    deleteTask: true,
    submitReview: true,
    approveTask: true,
    rejectTask: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewReviewQueue: true,
    manageOrganizationSettings: true,
    manageOrganizationRoles: true,
  },
  manager: {
    manageProjects: true,
    manageMembers: true,
    createTask: true,
    assignTask: true,
    updateTask: true,
    deleteTask: true,
    submitReview: true,
    approveTask: true,
    rejectTask: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewReviewQueue: true,
    manageOrganizationSettings: false,
    manageOrganizationRoles: false,
  },
  member: {
    manageProjects: false,
    manageMembers: false,
    createTask: false,
    assignTask: false,
    updateTask: true,
    deleteTask: false,
    submitReview: true,
    approveTask: false,
    rejectTask: false,
    viewAnalytics: false,
    exportAnalytics: false,
    viewReviewQueue: false,
    manageOrganizationSettings: false,
    manageOrganizationRoles: false,
  },
} as const;

export type PermissionName = keyof (typeof PERMISSION_MATRIX)['admin'];

export function isLeadershipRole(role?: string | null): role is AppRole {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

export function canManageOrganizationSettings(role: AppRole) {
  return PERMISSION_MATRIX[role].manageOrganizationSettings;
}

export function canManageOrganizationRoles(role: AppRole) {
  return PERMISSION_MATRIX[role].manageOrganizationRoles;
}

export function getAssignableOrganizationRoles(role: AppRole): AppRole[] {
  if (role === 'owner') {
    return ['owner', 'admin', 'manager', 'member'];
  }

  if (role === 'admin') {
    return ['manager', 'member'];
  }

  return [];
}

export function canAssignOrganizationRole(actorRole: AppRole, nextRole: AppRole) {
  return getAssignableOrganizationRoles(actorRole).includes(nextRole);
}

export function canManageOrganizationTarget(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === 'owner') {
    return true;
  }

  if (actorRole === 'admin') {
    return targetRole === 'manager' || targetRole === 'member';
  }

  return false;
}

export function canManageTaskDefinition(context: PermissionContext) {
  if (context.projectRole === 'viewer') {
    return false;
  }

  return (
    context.appRole === 'owner' ||
    context.appRole === 'admin' ||
    context.appRole === 'manager' ||
    context.projectRole === 'owner' ||
    context.projectRole === 'admin'
  );
}

export function canUpdateTaskExecution(context: PermissionContext) {
  if (context.projectRole === 'viewer') {
    return false;
  }

  return canManageTaskDefinition(context) || context.isAssignee === true;
}

export function canManageTaskChecklist(context: PermissionContext) {
  return canManageTaskDefinition(context);
}

export function canToggleTaskChecklist(context: PermissionContext) {
  return canUpdateTaskExecution(context);
}

export function hasPermission(context: PermissionContext, permission: PermissionName) {
  const base = PERMISSION_MATRIX[context.appRole][permission];

  if (permission === 'manageMembers') {
    return base && ['owner', 'admin'].includes(context.projectRole || '');
  }

  if (permission === 'deleteTask') {
    return base || (context.appRole === 'member' && context.isAssignee === true);
  }

  if (permission === 'updateTask') {
    return base && canManageTaskDefinition(context);
  }

  if (permission === 'assignTask') {
    if (context.projectRole === 'viewer') {
      return false;
    }

    return base || ['owner', 'admin'].includes(context.projectRole || '');
  }

  if (permission === 'submitReview') {
    return context.projectRole !== 'viewer';
  }

  if (permission === 'approveTask' || permission === 'rejectTask' || permission === 'viewReviewQueue') {
    return (
      base &&
      ['owner', 'admin', 'member'].includes(context.projectRole || '') &&
      (context.appRole === 'owner' || context.appRole === 'admin' || context.appRole === 'manager')
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
