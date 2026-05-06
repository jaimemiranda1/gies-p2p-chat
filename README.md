# Gies P2P Chat

A completely localized, peer-to-peer web chat application designed to facilitate one-on-one communication between predefined computer pairs on a Local Area Network (LAN). Built with React, Node.js, and Socket.io, this application acts as a seamless handoff from Qualtrics surveys and supports local CSV transcript exports.

## Prerequisites

- [Node.js](https://nodejs.org/en/download) (tested in v24.15.0, LTS recommended)

<table align="center">
  <tr>
    <td><img src="Node.js macOs Install.png" alt="macOS Node.js Installer" width="400"/></td>
    <td><img src="Node.js Windows Install.png" alt="Windows Node.js Installer" width="380"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <em>Download the official macOS (.pkg) or Windows (.msi) installer directly from <a href="https://nodejs.org/en/download">Node.js</a>.</em>
    </td>
  </tr>
</table>

- All client machines must be connected to the exact same Local Area Network (Wi-Fi or Ethernet) as the Host machine.

## Local Development Setup

1. Open a Terminal and `cd` into the repository folder.
2. Install dependencies: `npm install`
3. In terminal 1, run the WebSocket server: `node server.cjs`
4. In terminal 2, run the Vite development server: `npm run dev -- --host`
5. Access the development build at:
   - **Host Machine:** `http://localhost:5173/?id=DevUser1&room=1`
   - **Network Machine:** `http://[HOST_IP_ADDRESS]:5173/?id=DevUser2&room=1`.

**Understanding the URL Parameters:**
Because this application acts as a handoff from a survey tool, the React frontend requires these variables in the URL to function:
- `id`: A unique identifier for the user. In production, this will be the auto-generated Qualtrics Response ID. For local testing, any unique string (e.g., `DevUser1`) will work.
- `room`: The pairing assignment. Users who have the same room parameter (e.g., `room=1`) will be routed into the same private WebSocket chat. A maximum of 2 users is allowed per room.