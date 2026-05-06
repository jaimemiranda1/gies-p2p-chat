const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS: Allows the React frontend to communicate with the server
app.use(cors());

// Serve the static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all: Route any other URL back to the React index page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);

// Initialize Socket.io and allow all local origins
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Temporary memory cache for rooms
const roomMessageCache = {}

// Listen for incoming WebSocket connections
io.on("connection", (socket) => {
  console.log(`🔌 New Connection: ${socket.id}`);

  // Handle joining a specific room (Pair1, Pair2, etc.)
  socket.on("join_room", (data) => {
    // Get the current number of clients in the requested room
    const room = io.sockets.adapter.rooms.get(data.room);
    const numClients = room ? room.size : 0;

    if (numClients >= 2) {
      console.log(`🚫 User [${data.userId}] rejected from full room: [${data.room}]`);
      // Alert the frontend
      socket.emit("room_full");
      // Stop them from joining
      return;
    }

    socket.join(data.room);
    console.log(`👤 User [${data.userId}] joined room: [${data.room}] (Current occupants: ${numClients + 1})`);

    // If this room has a chat history, send it to the person who just joined
    if (roomMessageCache[data.room]) {
      socket.emit("load_history", roomMessageCache[data.room]);
    }

  });

  // Handle incoming messages
  socket.on("send_message", (data) => {
    console.log(`💬 Message in [${data.room}] from [${data.senderId}]`);

    // Save the message to the server's memory
    if (!roomMessageCache[data.room]) {
      roomMessageCache[data.room] = [];
    }
    roomMessageCache[data.room].push(data);

    // broadcast 'receive_message' to everyone in the room EXCEPT the sender
    socket.to(data.room).emit("receive_message", data);
  });

  // Handle clearing the chat
  socket.on("clear_chat", (data) => {
    console.log(`🧹 Chat cleared in room: [${data.room}]`);

    // Wipe the server's memory when they clear the chat
    roomMessageCache[data.room] = [];

    socket.to(data.room).emit("clear_chat_broadcast");
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});

// Boot up the server on Port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat Router Server running on http://localhost:${PORT}`);
});