import { Chat } from "./Chat";
import React, { useState, useCallback } from "react";
import "./App.css";
import { Paper, Box } from "@mui/material";
import TextField from "@mui/material/TextField";
import SendIcon from "@mui/icons-material/Send";
import Chatbox from "./Chatbox";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Router, Routes, Route } from "react-router-dom";

const darkTheme = createTheme({
  palette: {
    mode: "light",
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Routes>
        <Route path="/" element={<Chat />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
