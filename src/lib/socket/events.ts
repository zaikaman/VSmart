// Socket.io Event Types

export interface TaskStatusChangeEvent {
  taskId: string;
  newStatus: 'todo' | 'in-progress' | 'done';
  updatedBy: string;
  timestamp: number;
}

export interface TaskCreateEvent {
  task: {
    id: string;
    ten: string;
    trangThai: string;
    priority: string;
    progress: number;
  };
  createdBy: string;
  timestamp: number;
}

export interface TaskUpdateEvent {
  taskId: string;
  updates: Partial<{
    ten: string;
    moTa: string;
    deadline: string;
    priority: string;
    progress: number;
    trangThai: string;
  }>;
  updatedBy: string;
  timestamp: number;
}

export interface TaskDeleteEvent {
  taskId: string;
  deletedBy: string;
  timestamp: number;
}

export type SocketEvents = {
  'task:status-change': TaskStatusChangeEvent;
  'task:create': TaskCreateEvent;
  'task:update': TaskUpdateEvent;
  'task:delete': TaskDeleteEvent;
  'task:refresh': void;
};

export const SOCKET_EVENTS = {
  TASK_STATUS_CHANGE: 'task:status-change',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_REFRESH: 'task:refresh',
} as const;
