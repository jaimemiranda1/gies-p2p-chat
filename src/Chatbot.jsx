import React, { useState, useCallback } from "react";
import "./App.css";
import { Paper, Box, Button, IconButton, Chip, Stack, CircularProgress, Typography, AppBar, Toolbar } from "@mui/material";
import Modal from "@mui/material/Modal";
import SendIcon from "@mui/icons-material/Send";
import Chatbox from "./Chatbox";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CSVLink, CSVDownload } from "react-csv";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import InputBase from "@mui/material/InputBase";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import RemoveMarkdown from "remove-markdown";

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

import { context } from "./context";
console.log(context);

export function Chatbot() {
  let [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [openFinish, setOpenFinish] = React.useState(false);
  const handleOpenFinish = () => setOpenFinish(true);
  const handleCloseFinish = () => setOpenFinish(false);
  const [openClear, setOpenClear] = React.useState(false);
  const handleOpenClear = () => setOpenClear(true);
  const handleCloseClear = () => setOpenClear(false);

  const [userID, setUserID] = useState("test");
  const [messages, setMessages] = useState([]);

  const [headers, setHeaders] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [outputMessages, setOutputMessages] = useState([]);

  const controller = new AbortController();
  const [typing, setTyping] = React.useState(false);
  const [questionCount, setQuestionCount] = React.useState(1);
  
  // Add model loading state
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  // Model warming function
  const warmModel = async () => {
    try {
      const response = await fetch("http://localhost:1234/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          temperature: 0.7,
          max_tokens: 10, // Very short response for warming
          stream: false,
        }),
      });
      
      if (response.ok) {
        console.log("Model warmed successfully");
      }
    } catch (error) {
      console.error("Model warming failed:", error);
    } finally {
      setIsModelLoading(false);
    }
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

    messages.map((mes) => {
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

  React.useEffect(() => {
    console.log(`${userID}`);
    let saved = localStorage.getItem(`${userID}`);

    if (messages.length !== 0 && saved) {
      let savedState = JSON.parse(saved);
      console.log(savedState);
      savedState.messages = messages;
      localStorage.setItem(`${userID}`, JSON.stringify(savedState));
      console.log("updated ", savedState);
    }
  }, [messages]);

  React.useEffect(() => {
    const tempID = searchParams.get("id");
    
    // If no user ID in URL, redirect to default
    if (!tempID) {
      navigate("/?id=test", { replace: true });
      return;
    }
    
    // Set userID and load data
    setUserID(tempID);
    
    let saved = localStorage.getItem(`${tempID}`);
    console.log("saved", saved);
    if (saved == null) {
      let savedState = {
        startTime: Date.now(),
        userID: tempID,
        messages: [],
      };

      localStorage.setItem(`${tempID}`, JSON.stringify(savedState));
      setStartTime(savedState.startTime);
      setMessages([]);
    } else {
      const savedState = JSON.parse(saved);
      console.log(savedState);
      setStartTime(savedState.startTime);
      setMessages(savedState.messages || []);
    }
    
    // Warm the model on page load
    warmModel();
  }, [searchParams, navigate]);

  const getResponse = async (message) => {
    setTyping(true);
    const newChat = [
      ...messages,
      {
        role: "user",
        content: message,
        id: Date.now(),
        var: `Q${questionCount}`,
      },
    ];
    setMessages(newChat);
    
    // Add a placeholder message for the assistant response
    const assistantMessageId = Date.now() + 1;
    const assistantMessage = {
      content: "",
      role: "assistant",
      id: assistantMessageId,
      var: `A${questionCount}`,
      isStreaming: true,
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("http://localhost:1234/v1/chat/completions", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          messages: [/* { role: "assistant", content: context }, */ ...newChat],
          temperature: 0.7,
          max_tokens: -1,
          stream: true, // Enable streaming
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Stream is complete
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
              setTyping(false);
              setQuestionCount((prevState) => prevState + 1);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const content = parsed.choices[0].delta.content;
                
                // Update the message content in real-time
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content + content }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setTyping(false);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: "Whoops. looks like something went wrong.",
                isStreaming: false 
              }
            : msg
        )
      );
      setQuestionCount((prevState) => prevState + 1);
    }
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
        {/* Header */}
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
              ChatBot
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
                  "&:hover": {
                    borderColor: "#cccccc",
                    bgcolor: "#fafafa"
                  }
                }}
                startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
              >
                Export
              </Button>
              <IconButton 
                onClick={handleOpenClear}
                sx={{ 
                  color: "#666666",
                  "&:hover": { bgcolor: "#f5f5f5" }
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Chat Area */}
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Chatbox messages={messages} typing={typing} openingMessage={searchParams.get("opening")} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid #f0f0f0",
            bgcolor: "white",
          }}
        >
          {isModelLoading ? (
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#fafafa",
                border: "1px solid #f0f0f0",
              }}
            >
              <CircularProgress size={20} sx={{ mr: 2, color: "#666666" }} />
              <Typography variant="body2" color="#666666" sx={{ fontWeight: 400 }}>
                Model loading...
              </Typography>
            </Paper>
          ) : (
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
                "&:hover": {
                  border: "1px solid #cccccc",
                },
                "&:focus-within": {
                  border: "1px solid #999999",
                  bgcolor: "white",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <IconButton 
                sx={{ 
                  p: "6px", 
                  color: "#999999",
                  "&:hover": { color: "#666666" },
                  "&:disabled": { color: "#e0e0e0" }
                }}
                aria-label="stop"
                onClick={() => {
                  controller.abort();
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.isStreaming 
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  );
                  setTyping(false);
                }}
                disabled={!messages.some(msg => msg.isStreaming)}
              >
                <StopCircleIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <InputBase
                sx={{ 
                  ml: 1, 
                  flex: 1,
                  fontSize: "15px",
                  color: "#333333",
                  "& .MuiInputBase-input": {
                    padding: "8px 0",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "#999999",
                    opacity: 1,
                  }
                }}
                placeholder="Type your message..."
                multiline
                maxRows={4}
                inputProps={{}}
                disabled={isModelLoading}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !isModelLoading && !ev.shiftKey) {
                    ev.preventDefault();
                    if (ev.target.value.trim()) {
                      getResponse(ev.target.value);
                      ev.target.value = "";
                    }
                  }
                }}
              />
              <IconButton 
                sx={{ 
                  p: "6px",
                  color: "#666666",
                  "&:hover": { 
                    bgcolor: "#f0f0f0",
                    color: "#333333"
                  },
                  "&:disabled": {
                    color: "#e0e0e0"
                  }
                }} 
                aria-label="send"
                disabled={isModelLoading}
                onClick={(ev) => {
                  const input = ev.target.closest('form').querySelector('input, textarea');
                  if (input && input.value.trim()) {
                    getResponse(input.value);
                    input.value = "";
                  }
                }}
              >
                <SendIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Paper>
          )}
        </Box>
      </Paper>

      <Modal
        open={openFinish}
        onClose={handleCloseFinish}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 3, fontWeight: 500, color: "#333333" }}
          >
            Export Results
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="#666666">User ID:</Typography>
              <Chip 
                label={userID} 
                size="small"
                sx={{ 
                  bgcolor: "#f5f5f5", 
                  color: "#666666",
                  fontWeight: 400
                }} 
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#f8f9fa",
                p: 2,
                color: "#666666",
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                "&:hover": { 
                  bgcolor: "#f0f0f0",
                  border: "1px solid #cccccc"
                },
                transition: "all 0.2s",
                cursor: "pointer",
              }}
            >
              <CSVLink
                data={outputMessages}
                asyncOnClick={true}
                filename={`${userID}.csv`}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  fontWeight: 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onClick={getData}
                headers={headers}
                enclosingCharacter={`"`}
                target="_blank"
              >
                <DownloadIcon sx={{ fontSize: 20 }} />
                Download Results
              </CSVLink>
            </Box>
          </Stack>
        </Box>
      </Modal>

      <Modal open={openClear} onClose={handleCloseClear}>
        <Box sx={style}>
          <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 500, color: "#333333" }}>
            Settings
          </Typography>
          <Stack spacing={3}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="#666666">User ID:</Typography>
              <Chip 
                label={userID} 
                size="small"
                sx={{ 
                  bgcolor: "#f5f5f5", 
                  color: "#666666",
                  fontWeight: 400
                }} 
              />
            </Box>
            
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                localStorage.clear();
                setMessages([]);
                handleCloseClear();
              }}
              sx={{
                borderRadius: 2,
                py: 1,
                fontWeight: 400,
                borderColor: "#ffcdd2",
                color: "#d32f2f",
                "&:hover": {
                  borderColor: "#ef5350",
                  bgcolor: "#ffebee"
                }
              }}
            >
              Clear History
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}

