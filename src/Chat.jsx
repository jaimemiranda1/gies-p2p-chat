import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { Paper, Box, Button, IconButton, Chip, Stack, Typography, AppBar, Toolbar } from "@mui/material";
import Modal from "@mui/material/Modal";
import SendIcon from "@mui/icons-material/Send";
import Chatbox from "./Chatbox";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import InputBase from "@mui/material/InputBase";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import { io } from "socket.io-client";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export function Chat() {
  let [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [openFinish, setOpenFinish] = useState(false);
  const handleOpenFinish = () => setOpenFinish(true);
  const handleCloseFinish = () => setOpenFinish(false);

  const [openClear, setOpenClear] = useState(false);
  const handleOpenClear = () => setOpenClear(true);
  const handleCloseClear = () => setOpenClear(false);

  const [userID, setUserID] = useState("test");
  const [roomID, setRoomID] = useState("default_room");
  const [messages, setMessages] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [outputMessages, setOutputMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);

  // Socket reference
  const socketRef = useRef(null);

  // Generates Q1, A1, Q2, A2 based on message index to satisfy the Wide Format CSV
  const getQAVar = (index) => {
    const isQuestion = index % 2 === 0;
    const number = Math.floor(index / 2) + 1;
    return isQuestion ? `Q${number}` : `A${number}`;
  };

  const getData = () => {
    var output = {
      ParticipantID: userID,
      TimeStart: startTime,
    };
    var headersTemp = [
      { label: "ParticipantID", key: "ParticipantID" },
      { label: "TimeStart", key: "TimeStart" },
    ];

    messages.forEach((mes) => {
      output[`Time${mes.var}`] = mes.id;
      output[mes.var] = mes.content.replace(/\"/g, '""');
      headersTemp = [
        ...headersTemp,
        { label: `Time${mes.var}`, key: `Time${mes.var}` },
        { label: mes.var, key: mes.var },
      ];
    });

    output["TimeEnd"] = Date.now();
    headersTemp = [...headersTemp, { label: "TimeEnd", key: "TimeEnd" }];
    setOutputMessages([output]);
    setHeaders(headersTemp);
  };

  useEffect(() => {
    // Set Storage Key as a combination of userID and roomID
    const storageKey = `${userID}_${roomID}`;
    let saved = localStorage.getItem(storageKey);
    if (messages.length !== 0 && saved) {
      let savedState = JSON.parse(saved);
      savedState.messages = messages;
      localStorage.setItem(storageKey, JSON.stringify(savedState));
    }
  }, [messages, userID, roomID]);

  useEffect(() => {
    const tempID = searchParams.get("id");
    const tempRoom = searchParams.get("room") || "default_room";

    if (!tempID) {
      navigate("/?id=test&room=Pair1", { replace: true });
      return;
    }

    setUserID(tempID);
    setRoomID(tempRoom);

    // Initialize Local Storage State
    const storageKey = `${tempID}_${tempRoom}`;
    let saved = localStorage.getItem(storageKey);
    if (saved == null) {
      let savedState = {
        startTime: Date.now(),
        userID: tempID,
        messages: [],
      };
      localStorage.setItem(storageKey, JSON.stringify(savedState));
      setStartTime(savedState.startTime);
      setMessages([]);
    } else {
      const savedState = JSON.parse(saved);
      setStartTime(savedState.startTime);
      setMessages(savedState.messages || []);
    }

    // Initialize Socket.io
    // This tells the browser: "Connect to port 3000 on whatever IP address you are currently visiting"
    socketRef.current = io(`http://${window.location.hostname}:3000`);

    socketRef.current.emit("join_room", { room: tempRoom, userId: tempID });

    // Catch the "Room Full" event from the server
    socketRef.current.on("room_full", () => {
      setIsRoomFull(true);
    });

    // Load missed messages from the server when joining
    socketRef.current.on("load_history", (historyArray) => {
      // Map the server's raw data back into the Q1/A1 format the UI expects
      const formattedHistory = historyArray.map((msg, index) => ({
        role: msg.senderId === tempID ? "user" : "peer",
        content: msg.message,
        id: msg.timestamp,
        var: getQAVar(index)
      }));
      setMessages(formattedHistory);
    });

    // Listen for incoming messages
    socketRef.current.on("receive_message", (data) => {
      setMessages((prev) => {
        const nextVar = getQAVar(prev.length);
        return [...prev, {
          role: "peer",
          content: data.message,
          id: data.timestamp,
          var: nextVar
        }];
      });
    });

    // Listen for clear chat command from the other computer
    socketRef.current.on("clear_chat_broadcast", () => {
      localStorage.removeItem(storageKey);
      setMessages([]);
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [searchParams, navigate]);

  const sendMessage = (messageText) => {
    if (!messageText.trim()) return;

    const timestamp = Date.now();
    const nextVar = getQAVar(messages.length);

    const newMsg = {
      role: "user",
      content: messageText,
      id: timestamp,
      var: nextVar,
    };

    // Update local UI
    setMessages((prev) => [...prev, newMsg]);

    // Send to peer
    socketRef.current.emit("send_message", {
      room: roomID,
      message: messageText,
      timestamp: timestamp,
      senderId: userID
    });
  };

  const handleClearChat = () => {
    const storageKey = `${userID}_${roomID}`;
    localStorage.removeItem(storageKey);
    setMessages([]);
    socketRef.current.emit("clear_chat", { room: roomID });
    handleCloseClear();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        bgcolor: "#ffffff",
      }}
    >
      {isRoomFull ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <Typography variant="h4" color="error" sx={{ mb: 2 }}>Room is Full</Typography>
          <Typography variant="body1" color="text.secondary">
            Two participants are already connected to Room {roomID}. Please check your assignment or wait for a space to open.
          </Typography>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            borderRadius: 0,
            overflow: "hidden",
            bgcolor: "white",
            border: "1px solid #e0e0e0",
          }}
        >
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: "#ffffff",
              borderBottom: "1px solid #f0f0f0"
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", minHeight: "64px" }}>
              <Typography variant="h6" sx={{ fontWeight: 500, color: "#333333" }}>
                Chat
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenFinish}
                  sx={{
                    borderColor: "#e0e0e0",
                    color: "#666666",
                    textTransform: "none",
                    "&:hover": { borderColor: "#cccccc", bgcolor: "#fafafa" }
                  }}
                  startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                >
                  Export
                </Button>
                <IconButton
                  onClick={handleOpenClear}
                  sx={{ color: "#666666", "&:hover": { bgcolor: "#f5f5f5" } }}
                >
                  <SettingsIcon />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <Chatbox messages={messages} typing={typing} />
          </Box>

          <Box sx={{ p: 2, borderTop: "1px solid #f0f0f0", bgcolor: "white" }}>
            <Paper
              component="form"
              elevation={0}
              sx={{
                p: "8px 12px",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                bgcolor: "#fafafa",
                border: "1px solid #e0e0e0",
                "&:focus-within": { border: "1px solid #999999", bgcolor: "white" },
              }}
              onSubmit={(ev) => {
                ev.preventDefault();
                const input = ev.target.elements.chatInput;
                sendMessage(input.value);
                input.value = "";
              }}
            >
              <InputBase
                name="chatInput"
                sx={{
                  ml: 1, flex: 1, fontSize: "15px", color: "#333333"
                }}
                placeholder="Type your message..."
                multiline
                maxRows={4}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    sendMessage(ev.target.value);
                    ev.target.value = "";
                  }
                }}
              />
              <IconButton type="submit" sx={{ p: "6px", color: "#666666" }}>
                <SendIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Paper>
          </Box>
        </Paper>
      )}

      {/* Export Modal */}
      <Modal open={openFinish} onClose={handleCloseFinish}>
        <Box sx={style}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>Export Results</Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography variant="body2">User ID:</Typography>
              <Chip label={userID} size="small" />
            </Box>
            <Box
              sx={{
                display: "flex", justifyContent: "center", bgcolor: "#f8f9fa", p: 2,
                borderRadius: 2, border: "1px solid #e0e0e0", cursor: "pointer",
              }}
            >
              <CSVLink
                data={outputMessages}
                asyncOnClick={true}
                filename={`${userID}_transcript.csv`}
                style={{ color: "inherit", textDecoration: "none", display: "flex", gap: "8px" }}
                onClick={getData}
                headers={headers}
              >
                <DownloadIcon /> Download CSV
              </CSVLink>
            </Box>
          </Stack>
        </Box>
      </Modal>

      {/* Clear Settings Modal */}
      <Modal open={openClear} onClose={handleCloseClear}>
        <Box sx={style}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>Settings</Typography>
          <Stack spacing={3}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearChat}
              sx={{ borderRadius: 2, py: 1 }}
            >
              Clear History for Both Users
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}