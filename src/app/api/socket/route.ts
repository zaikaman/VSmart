import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Socket.IO endpoint. Use socket.io-client to connect.',
    path: '/api/socket',
  });
}

// Note: Socket.io server setup sẽ được thực hiện trong custom server
// Với Next.js development mode, Socket.io không hoạt động đầy đủ
// Production build sẽ cần custom server (server.js) để integrate Socket.io
