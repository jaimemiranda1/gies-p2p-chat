const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Enable CORS: Allows the React frontend to communicate with the server
app.use(cors());

// Serve the static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all: Route any other URL back to the React index page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Find the computer's Local IP Address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip non-IPv4 and internal (localhost) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer(app);

// Initialize Socket.io and allow all local origins
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Aggressive heartbeat to instantly drop ghost connections
  // pingTimeout: 5000,
  // pingInterval: 1000
});

// Temporary memory cache for rooms
const roomMessageCache = {}

// Listen for incoming WebSocket connections
io.on("connection", (socket) => {
  console.log(`🔌 New Connection: ${socket.id}`);

  // Handle joining a specific room (Pair1, Pair2, etc.)
  socket.on("join_room", (data) => {
    const room = io.sockets.adapter.rooms.get(data.room);

    // Ghost Cleanup: Check if this specific user already has a stale connection in the room
    if (room) {
      for (const existingSocketId of room) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket && existingSocket.userId === data.userId) {
          console.log(`👻 Ghost detected for [${data.userId}]. Clearing stale connection.`);
          // Force drop the ghost
          existingSocket.disconnect(true);
        }
      }
    }

    const updatedRoom = io.sockets.adapter.rooms.get(data.room);
    // Get the current number of clients in the room
    const numClients = updatedRoom ? updatedRoom.size : 0;

    if (numClients >= 2) {
      console.log(`🚫 User [${data.userId}] rejected from full room: [${data.room}]`);
      // Alert the frontend
      socket.emit("room_full");
      // Stop them from joining
      return;
    }

    // Tag socket with User ID and join the room
    socket.userId = data.userId;
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

    // Generate a YYYYMMDD folder name based on the message timestamp
    const msgDate = new Date(data.timestamp);
    const year = msgDate.getFullYear();
    const month = String(msgDate.getMonth() + 1).padStart(2, '0');
    const day = String(msgDate.getDate()).padStart(2, '0');
    const dateFolderName = `${year}${month}${day}`; // e.g., "20261010"

    // Define the path for the chat arhive: e.g. /Chat Archive/20261010
    const archiveDirPath = path.join(__dirname, 'Chat Archive', dateFolderName);

    // Confirm the folder exists. If it doesn't, create it, and then save the files
    fs.mkdir(archiveDirPath, { recursive: true }, (err) => {
      if (err) {
        console.error("⚠️ Failed to create archive folders:", err);
        return;
      }

      // Format the entry text
      const logEntry = `[${msgDate.toLocaleString()}] Room: ${data.room} | User: ${data.senderId} | Message: ${data.message}\n`;

      // Define the two separate file paths
      const masterFilePath = path.join(archiveDirPath, 'master_chat_backup.txt');
      const roomFilePath = path.join(archiveDirPath, `${data.room}_backup.txt`);

      // Append to the Master Ledger
      fs.appendFile(masterFilePath, logEntry, (err) => {
        if (err) console.error("⚠️ Failed to write master backup:", err);
      });

      // Append to the Room-Specific File
      fs.appendFile(roomFilePath, logEntry, (err) => {
        if (err) console.error(`⚠️ Failed to write ${data.room} backup:`, err);
      });
    });

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
  // Get IP Address
  const networkIp = getLocalIpAddress();

  // Console Logs
  console.log(`\n🚀 Gies P2P Chat Server Active!`)
  console.log(`💻 Local Machine:  http://localhost:${PORT}`);
  console.log(`🌐 Network URL:    http://${networkIp}:${PORT}`)
  console.log(`----------------------------------------------\n`);
});