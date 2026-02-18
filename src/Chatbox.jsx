import { Box, Paper, Typography } from "@mui/material";
import Typing from "./Typing";
import React, { useState } from "react";
import ChatBubble from "./ChatBubble";


const convertTime = (someMillisecondValue) => {
  var date = new Date();
  date.setTime(someMillisecondValue);
  var minute = date.getMinutes();
  var hour = date.getHours();
  var day = date.getDate();
  var month = date.getMonth();
  var year = date.getFullYear();
  return `${month}/${day}/${year} ${hour}:${minute}`;
};

export function Chatbox({ messages, typing, openingMessage }) {
  const listRef = React.useRef(null);
  
  React.useEffect(() => {
    let lastItem = listRef.current?.lastChild;
    lastItem?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  }, [messages]);
  
  console.log("messages ", messages);
  
  return (
    <Box
      ref={listRef}
      id="simplebar"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        bgcolor: "#ffffff",
        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "#e0e0e0",
          borderRadius: "3px",
          "&:hover": {
            bgcolor: "#cccccc",
          },
        },
      }}
    >
      {openingMessage && (
        <Box sx={{ py: 1.5 }}>
          <ChatBubble
            message={{
              content: [openingMessage],
              source: "assistant",
              id: "opening",
            }}
            key="opening"
          />
        </Box>
      )}

      {messages.length > 0 && (
        <Box sx={{ py: 0.5 }}>
          {messages.map((message, i) => (
            <ChatBubble message={message} key={i} />
          ))}
        </Box>
      )}
      
      {typing && !messages.some(msg => msg.isStreaming) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            px: 2,
            mb: 1.5,
          }}
        >
          <Typing />
        </Box>
      )}
    </Box>
  );
}

export default Chatbox;
// const getResponse = (message) => {
//   fetch("http://localhost:1234/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: `{ \n  "messages": [ \n    { "role": "system", "content": "You are a manager communicating in the tone of an online chat." },\n    { "role": "user", "content": "${message}" }\n  ], \n  "temperature": 0.7, \n  "max_tokens": 1000,\n  "stream": true\n}`,
//   }).then(async (res) => {
//     const time = Date.now();
//     const reader = res.body.getReader();
//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) {
//         return;
//       }
//       if (
//         new Decoder().decode(value).substring(5).indexOf("[DONE]") ==
//           -1 &&
//         new TextDecoder().decode(value).substring(5) != ""
//       ) {
//         let temp = JSON.parse(new TextDecoder().decode(value).substring(6));
//         console.log(temp);
//         console.log("updating");
//         handleStream(time, temp.choices[0].delta.content);
//       }
//     }
//   });
// };
