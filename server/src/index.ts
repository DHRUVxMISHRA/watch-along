import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { roomManager } from './models/RoomManager';
import { setupSocketHandlers } from './socket/socketHandler';
import { extractYouTubeVideoId } from './utils/youtube';
import { ClientToServerEvents, ServerToClientEvents } from './types';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Middleware
app.use(cors({
  origin: CLIENT_URL === '*' ? '*' : [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Setup Socket.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CLIENT_URL === '*' ? '*' : [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setupSocketHandlers(io);

// REST API Endpoints

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.getAllRooms().length,
    timestamp: new Date().toISOString()
  });
});

// Create Room
app.post('/api/rooms', (req: Request, res: Response): void => {
  try {
    const { roomName, videoUrl, videoTitle } = req.body;

    let initialVideoId: string | undefined = undefined;
    if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim()) {
      const extracted = extractYouTubeVideoId(videoUrl);
      if (!extracted) {
        res.status(400).json({ success: false, error: 'Invalid YouTube URL provided.' });
        return;
      }
      initialVideoId = extracted;
    }

    const room = roomManager.createRoom(roomName, initialVideoId, videoTitle);
    res.status(201).json({
      success: true,
      room: room.toData()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create room.' });
  }
});

// Get Room Information / Validate Room Code
app.get('/api/rooms/:roomId', (req: Request, res: Response): void => {
  const roomId = req.params.roomId.toUpperCase();
  const room = roomManager.getRoom(roomId);

  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found. Check the room code and try again.' });
    return;
  }

  res.json({
    success: true,
    room: room.toData()
  });
});

// Serve Client in Production if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[WatchTogether Server] Running on http://localhost:${PORT}`);
});
