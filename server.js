require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: 'prisma/.env' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    // Leave user room
    socket.on('leave-user', (userId) => {
      socket.leave(userId);
      console.log(`User ${userId} left their room`);
    });

    // Join chat room
    socket.on('join-chat', (chatRoomId) => {
      const roomName = `chat-${chatRoomId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined chat room: ${roomName}`);
      
      // Log all rooms this socket is in
      const rooms = Array.from(socket.rooms);
      console.log(`Socket ${socket.id} is now in rooms:`, rooms);
    });

    // Leave chat room
    socket.on('leave-chat', (chatRoomId) => {
      const roomName = `chat-${chatRoomId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left chat room: ${roomName}`);
    });

    // Handle test events
    socket.on('test-event', (data) => {
      console.log('Test event received:', data);
      // Echo back the test event
      socket.emit('test-event', { message: 'Test event received by server', originalData: data });
    });

    // Debug: Log all events
    socket.onAny((eventName, ...args) => {
      if (eventName !== 'disconnect') { // Avoid logging disconnect events
        console.log(`Socket ${socket.id} received event: ${eventName}`, args);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Make io available globally
  global.io = io;

  // Debug: Log all emitted events
  const originalEmit = io.emit;
  io.emit = function(event, ...args) {
    console.log(`Global emit: ${event}`, args);
    return originalEmit.apply(this, arguments);
  };

  const originalTo = io.to;
  io.to = function(room) {
    console.log(`Joining room: ${room}`);
    return originalTo.apply(this, arguments);
  };

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 