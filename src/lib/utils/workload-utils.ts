export type WorkloadStatus = 'available' | 'balanced' | 'stretched' | 'overloaded';

export interface WorkloadTaskLike {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai: 'todo' | 'in-progress' | 'done';
  deadline: string;
  risk_score?: number | null;
}

export interface WorkloadSummary {
  activeTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  highRiskTasks: number;
  loadPoints: number;
  capacityPoints: number;
  loadRatio: number;
  loadStatus: WorkloadStatus;
}

export const OVERLOAD_ACTIVE_TASK_THRESHOLD = 5;
export const DEFAULT_CAPACITY_POINTS = 18;

const PRIORITY_LOAD: Record<WorkloadTaskLike['priority'], number> = {
  low: 2,
  medium: 3,
  high: 5,
  urgent: 7,
};

const STATUS_FACTOR: Record<WorkloadTaskLike['trang_thai'], number> = {
  todo: 0.75,
  'in-progress': 1,
  done: 0,
};

export function isWeekendDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getTaskLoadPoints(task: WorkloadTaskLike) {
  const priorityPoints = PRIORITY_LOAD[task.priority] || PRIORITY_LOAD.medium;
  const statusFactor = STATUS_FACTOR[task.trang_thai] ?? 1;
  const deadline = new Date(task.deadline);
  const now = new Date();

  let score = priorityPoints * statusFactor;

  if (task.trang_thai !== 'done' && deadline.getTime() < now.getTime()) {
    score += 2;
  }

  if ((task.risk_score || 0) >= 70) {
    score += 1.5;
  }

  return Number(score.toFixed(2));
}

export function getDueSoonTaskCount(tasks: WorkloadTaskLike[], withinDays = 7) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + withinDays);

  return tasks.filter((task) => {
    if (task.trang_thai === 'done') {
      return false;
    }

    const deadline = new Date(task.deadline);
    return deadline.getTime() >= now.getTime() && deadline.getTime() <= end.getTime();
  }).length;
}

export function getOverdueTaskCount(tasks: WorkloadTaskLike[]) {
  const now = new Date();

  return tasks.filter((task) => {
    if (task.trang_thai === 'done') {
      return false;
    }

    return new Date(task.deadline).getTime() < now.getTime();
  }).length;
}

export function getHighRiskTaskCount(tasks: WorkloadTaskLike[]) {
  return tasks.filter((task) => task.trang_thai !== 'done' && (task.risk_score || 0) >= 70).length;
}

export function getWorkloadStatus(loadRatio: number, activeTasks: number): WorkloadStatus {
  if (activeTasks >= OVERLOAD_ACTIVE_TASK_THRESHOLD + 1 || loadRatio >= 1) {
    return 'overloaded';
  }

  if (activeTasks >= OVERLOAD_ACTIVE_TASK_THRESHOLD || loadRatio >= 0.78) {
    return 'stretched';
  }

  if (loadRatio >= 0.45) {
    return 'balanced';
  }

  return 'available';
}

export function summarizeWorkload(
  tasks: WorkloadTaskLike[],
  capacityPoints = DEFAULT_CAPACITY_POINTS
): WorkloadSummary {
  const activeTasks = tasks.filter((task) => task.trang_thai !== 'done').length;
  const loadPoints = Number(
    tasks.reduce((total, task) => total + getTaskLoadPoints(task), 0).toFixed(2)
  );
  const loadRatio = capacityPoints > 0 ? Number((loadPoints / capacityPoints).toFixed(2)) : 0;
  const overdueTasks = getOverdueTaskCount(tasks);
  const dueSoonTasks = getDueSoonTaskCount(tasks);
  const highRiskTasks = getHighRiskTaskCount(tasks);

  return {
    activeTasks,
    overdueTasks,
    dueSoonTasks,
    highRiskTasks,
    loadPoints,
    capacityPoints,
    loadRatio,
    loadStatus: getWorkloadStatus(loadRatio, activeTasks),
  };
}

export function getCapacityBadgeConfig(status: WorkloadStatus) {
  switch (status) {
    case 'available':
      return {
        label: 'Rảnh',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'balanced':
      return {
        label: 'Ổn định',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    case 'stretched':
      return {
        label: 'Sát tải',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    default:
      return {
        label: 'Quá tải',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
  }
}
