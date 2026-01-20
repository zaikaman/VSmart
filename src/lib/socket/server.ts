import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { SOCKET_EVENTS, type SocketEvents } from './events';

let io: SocketIOServer | null = null;

export function getSocketIO(httpServer?: HTTPServer): SocketIOServer {
  if (!io && httpServer) {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      path: '/api/socket',
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      // Room management - join project/board rooms
      socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
      });

      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room ${roomId}`);
      });

      // Join user-specific room for notifications
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`Client ${socket.id} joined user room ${userId}`);
      });
    });
  }

  if (!io) {
    throw new Error('Socket.IO not initialized. Call getSocketIO with httpServer first.');
  }

  return io;
}

export function broadcastTaskStatusChange(
  taskId: string,
  newStatus: string,
  updatedBy: string
) {
  if (!io) return;

  const event: SocketEvents['task:status-change'] = {
    taskId,
    newStatus: newStatus as any,
    updatedBy,
    timestamp: Date.now(),
  };

  io.emit(SOCKET_EVENTS.TASK_STATUS_CHANGE, event);
}

export function broadcastTaskUpdate(
  taskId: string,
  updates: any,
  updatedBy: string
) {
  if (!io) return;

  const event: SocketEvents['task:update'] = {
    taskId,
    updates,
    updatedBy,
    timestamp: Date.now(),
  };

  io.emit(SOCKET_EVENTS.TASK_UPDATE, event);
}

export function broadcastTaskCreate(task: any, createdBy: string) {
  if (!io) return;

  const event: SocketEvents['task:create'] = {
    task: {
      id: task.id,
      ten: task.ten,
      trangThai: task.trangThai,
      priority: task.priority,
      progress: task.progress,
    },
    createdBy,
    timestamp: Date.now(),
  };

  io.emit(SOCKET_EVENTS.TASK_CREATE, event);
}

export function broadcastTaskDelete(taskId: string, deletedBy: string) {
  if (!io) return;

  const event: SocketEvents['task:delete'] = {
    taskId,
    deletedBy,
    timestamp: Date.now(),
  };

  io.emit(SOCKET_EVENTS.TASK_DELETE, event);
}

export function broadcastNotification(notification: SocketEvents['notification']) {
  if (!io) return;
  
  // Emit to specific user room
  io.to(`user:${notification.nguoi_dung_id}`).emit(SOCKET_EVENTS.NOTIFICATION, notification);
}
