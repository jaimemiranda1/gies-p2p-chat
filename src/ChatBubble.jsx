import { Box, Paper, Typography } from "@mui/material";
import React from "react";
import Markdown from "react-markdown";

export function ChatBubble({ message }) {
  // "user" is the person sitting at this computer. "peer" is the other computer.
  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: "70%", // Widened slightly for human text
          px: 2,
          py: 1.5,
          fontSize: "14px",
          borderRadius: 2.5,
          bgcolor: isUser ? "#f0f7ff" : "#f8f9fa",
          color: isUser ? "#1a1a1a" : "#333333",
          border: isUser ? "1px solid #e3f2fd" : "1px solid #f0f0f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          "&:hover": {
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
          },
          transition: "box-shadow 0.2s ease-in-out",
        }}
        key={message.id}
      >
        <Markdown
          components={{
            p: ({ children }) => (
              <Typography
                component="p"
                sx={{
                  mb: 1.2,
                  lineHeight: 1.5,
                  fontSize: "14px",
                  "&:last-child": { mb: 0 },
                  wordBreak: "break-word"
                }}
              >
                {children}
              </Typography>
            ),
            strong: ({ children }) => (
              <Typography
                component="span"
                sx={{
                  fontWeight: 600,
                  color: isUser ? "#1976d2" : "#666666"
                }}
              >
                {children}
              </Typography>
            ),
            ul: ({ children }) => (
              <Box component="ul" sx={{ pl: 1.5, mb: 1.2 }}>
                {children}
              </Box>
            ),
            li: ({ children }) => (
              <Typography
                component="li"
                sx={{
                  mb: 0.3,
                  lineHeight: 1.5,
                  fontSize: "14px"
                }}
              >
                {children}
              </Typography>
            ),
          }}
        >
          {message.content}
        </Markdown>
      </Paper>
    </Box>
  );
}

export default ChatBubble;