'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket events interface
export interface SocketEvents {
  'task:created': { task: unknown };
  'task:updated': { taskId: string; updates: unknown };
  'task:deleted': { taskId: string };
  'project:updated': { projectId: string; updates: unknown };
  'notification': { message: string; type: string };
}

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState('N/A');

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: '/api/socket',
      });
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket!.io.engine.transport.name);

      socket!.io.engine.on('upgrade', (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport('N/A');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
    };
  }, []);

  const on = <K extends keyof SocketEvents>(
    event: K,
    handler: (data: SocketEvents[K]) => void
  ) => {
    if (!socket) return;
    socket.on(event as string, handler as (data: unknown) => void);
  };

  const off = <K extends keyof SocketEvents>(
    event: K,
    handler?: (data: SocketEvents[K]) => void
  ) => {
    if (!socket) return;
    if (handler) {
      socket.off(event as string, handler as (data: unknown) => void);
    } else {
      socket.off(event as string);
    }
  };

  const emit = <K extends keyof SocketEvents>(
    event: K,
    data: SocketEvents[K]
  ) => {
    if (!socket) return;
    socket.emit(event as string, data);
  };

  const joinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('join-room', roomId);
  };

  const leaveRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('leave-room', roomId);
  };

  const joinUserRoom = (userId: string) => {
    if (!socket) return;
    socket.emit('join-user-room', userId);
  };

  return {
    socket,
    isConnected,
    transport,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    joinUserRoom,
  };
}
    joinRoom,
    leaveRoom,
  };
}
