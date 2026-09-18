# WatchTogether — YouTube Watch Party System

> **Official Internship Assignment Implementation**  
> Real-Time YouTube Watch Party web application featuring synchronized playback, authoritative server-side Role-Based Access Control (RBAC), YouTube IFrame Player API integration, and in-app permission workflows, implemented using the dark cinematic Stitch design system.

---

## 🌐 Live Deployment & Demo

- **Live Production URL**: `https://watchalong-website.onrender.com` *(Render / Railway deployment ready)*
- **Local Dev Server**: `http://localhost:5173` (Vite) / `http://localhost:3001` (Express API & Socket.IO)

---

## 📖 Table of Contents
1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Folder Structure](#folder-structure)
6. [WebSockets & Event Contracts](#websockets--event-contracts)
7. [Playback Synchronization Engine](#playback-synchronization-engine)
8. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
9. [Permission Request Workflow](#permission-request-workflow)
10. [Local Setup & Installation](#local-setup--installation)
11. [Running Tests](#running-tests)
12. [Production Build & Deployment Guide](#production-build--deployment-guide)
13. [Code Walkthrough & Interview Defense](#code-walkthrough--interview-defense)
14. [Platform Limitations & Trade-offs](#platform-limitations--trade-offs)

---

## 1. Project Overview

WatchTogether enables multiple users across different browsers and devices to join a virtual watch room and experience synchronized YouTube video playback in real time.

When the **Host** or **Moderator** presses play, pauses, seeks to a timeline timestamp, or switches to a new YouTube video, all participants in the room instantly reflect that action. Joining users automatically receive the **Participant** role (view-only), and can request approval from room leaders to control playback or propose a new video.

---

## 2. Core Features

- **Real-Time Synchronization**: Play, pause, seek, and video-switch events propagate across all connected clients via WebSockets with sub-second precision.
- **Room-Based Architecture**:
  - Room creation with optional initial YouTube URL and custom room title.
  - Unique 6-character alphanumeric room codes (e.g. `#AB12CD`) generated server-side.
  - Shareable direct invite links (`/room/:roomId`).
- **YouTube IFrame Player API**: Embedded real video player with custom cinematic HUD, timeline scrubber, buffer display, volume slider, and fullscreen mode.
- **Authoritative Server-Side RBAC**:
  - **Host**: Crown badge (`workspace_premium`), full playback control, role assignment (promote/demote Moderator), and participant removal (kick).
  - **Moderator**: Shield badge (`shield`), playback controls (play, pause, seek, change video).
  - **Participant**: User badge (`person`), view-only by default; controls locked with instant "Request Permission" modal.
- **Permission Request & Approval System**: Participants can submit playback or video-change requests. Hosts/Moderators see an interactive banner in their panel with **[Approve]** and **[Reject]** buttons.
- **Anti-Echo Feedback Loop Guard**: Prevents remote synchronization events from re-triggering outgoing socket emissions indefinitely.
- **Stitch Design System Recreation**: Faithful implementation of the dark cinematic UI using Tailwind CSS tokens (`#111319` background, `#1d1f26` surfaces, `#ff5357` primary red/pink accents, Inter typography, and Material Symbols Outlined).
- **Zero Fake Metrics**: Displays truthful room states: `All participants synced`, `Broadcasting`, and real participant counts.
- **Reconnection Handling**: Graceful rejoin and offline detection banners when connectivity fluctuates.

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Modern component-based UI with fast HMR |
| **Styling** | Tailwind CSS | Faithful recreation of Stitch design token system |
| **Icons & Typography** | Google Inter & Material Symbols | Outlined icons and typography matching screenshots |
| **Real-Time Gateway** | Socket.IO (Client & Server) | Low-latency bidirectional WebSocket communication |
| **Backend Server** | Node.js, Express, TypeScript | REST API, session tracking, authoritative room engine |
| **Video Engine** | YouTube IFrame Player API | Video embedding and programmatic timeline control |
| **Testing** | Automated Multi-Client E2E Suite | 12 automated verification suites covering RBAC & sync |

---

## 4. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   React + TS Frontend                  │
│   Landing Page │ Create/Join │ Watch Party Room │ HUD  │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP / REST  │  Socket.IO (WebSocket)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Node.js + Express Server                 │
│  - REST API: /api/rooms (create, validate room code)   │
│  - Socket Gateway: Session lookup by socket.id         │
│  - Static Asset Server: Serves built client in prod    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Authoritative In-Memory RoomManager         │
│  - Rooms (Map<roomId, Room>)                           │
│  - Participants (Map<userId, Participant>)             │
│  - Server-Side RBAC Enforcement Checkers               │
│  - Timeline Sync Engine (effectiveTime calculation)    │
│  - Pending Permission Request Queue                    │
└────────────────────────────────────────────────────────┘
```

### Why the Server is Authoritative
1. **Security & Anti-Griefing**: Frontend buttons can be bypassed or inspected in DevTools. If an unauthorized participant manually emits `socket.emit('change_video', ...)`, the server evaluates the sender's stored role in `RoomManager` and rejects the event before mutating room state.
2. **Deterministic Timeline**: The server calculates `effectiveTime = currentTime + (now - updatedAt) / 1000` so that any client joining mid-stream immediately jumps to the exact timestamp without relying on another client's browser state.
3. **Session Consistency**: Ephemeral socket disconnects map back to the persistent user ID, preventing duplicate participants or lost role assignments.

---

## 5. Folder Structure

```
WatchAlong_website/
├── client/                     # Frontend React + TypeScript application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Toast)
│   │   ├── hooks/              # useYouTubePlayer (IFrame API & sync guard)
│   │   ├── pages/              # LandingPage, CreateJoinPage, WatchPartyPage
│   │   ├── services/           # socket.ts (Socket.IO client singleton)
│   │   ├── types/              # Client TypeScript interfaces & socket contracts
│   │   ├── utils/              # youtube.ts (URL parser, time formatter)
│   │   ├── App.tsx             # Root router, session manager, toast host
│   │   ├── main.tsx            # React root mount
│   │   └── index.css           # Tailwind directives & Material Symbols rules
│   ├── index.html              # HTML shell with Google Fonts & Material Symbols
│   ├── tailwind.config.js      # Stitch token color palette & typography
│   ├── vite.config.ts          # Vite configuration with proxy to port 3001
│   └── package.json
│
├── server/                     # Backend Node.js + Express + Socket.IO server
│   ├── src/
│   │   ├── models/             # RoomManager.ts (OOP Room, Participant, RBAC)
│   │   ├── socket/             # socketHandler.ts (Socket.IO event routing)
│   │   ├── utils/              # youtube.ts (server-side URL parsing)
│   │   ├── types/              # Shared server TypeScript contracts
│   │   ├── test_e2e.ts         # 12-suite automated multi-client verification
│   │   └── index.ts            # Express server, REST endpoints, static host
│   ├── tsconfig.json
│   └── package.json
│
├── .env.example                # Template for environment variables
├── package.json                # Root package with concurrent dev & build scripts
├── README.md                   # Comprehensive project documentation
└── walkthrough.md              # Completed verification walkthrough
```

---

## 6. WebSockets & Event Contracts

| Event | Direction | Payload | Auth Level | Description |
|---|---|---|---|---|
| `join_room` | Client → Server | `{ roomId, username, userId? }` | Public | Joins socket to room. Assigns Host if creator, else Participant. |
| `leave_room` | Client → Server | `{ roomId }` | Public | Leaves room and notifies others. |
| `play` | Client → Server | `{}` | Host / Mod | Starts playback and updates room state. |
| `pause` | Client → Server | `{}` | Host / Mod | Pauses playback and updates room state. |
| `seek` | Client → Server | `{ time: number }` | Host / Mod | Jumps to specific time and broadcasts state. |
| `change_video` | Client → Server | `{ videoId, title?, duration? }` | Host / Mod | Updates current video and resets playback position. |
| `assign_role` | Client → Server | `{ userId, role }` | Host Only | Promotes/demotes participant between MODERATOR and PARTICIPANT. |
| `remove_participant` | Client → Server | `{ userId }` | Host Only | Kicks user from room and emits kicked event. |
| `permission_request` | Client → Server | `{ action, payload? }` | Participant | Sends permission request to Host/Moderator. |
| `resolve_permission` | Client → Server | `{ requestId, approved }` | Host / Mod | Approves or rejects request; executes action if approved. |
| `sync_state` | Server → Clients | `PlaybackState` | Server | Broadcasts authoritative playback state to room. |
| `user_joined` | Server → Clients | `{ username, userId, role, participants }` | Server | Broadcasts when a new user enters. |
| `user_left` | Server → Clients | `{ username, userId, participants }` | Server | Broadcasts when a user disconnects or leaves. |
| `role_assigned` | Server → Clients | `{ userId, username, role, participants }` | Server | Broadcasts role change. |
| `participant_removed` | Server → Clients | `{ userId, participants }` | Server | Broadcasts when a participant is kicked. |
| `kicked` | Server → Client | `{ reason: string }` | Server | Sent directly to the removed socket. |
| `permission_received` | Server → Clients | `PermissionRequest` | Host / Mod | Delivers incoming request to leaders. |
| `permission_resolved` | Server → Clients | `{ requestId, approved, action, message }` | Server | Delivers resolution status to room. |

---

## 7. Playback Synchronization Engine

### Timeline Formula
When a video is in playing state, the server continuously calculates the current effective playback time without requiring frequent database writes:
$$\text{effectiveTime} = \text{currentTime} + \frac{\text{now} - \text{updatedAt}}{1000}$$
If the computed time exceeds video duration, it clamps at the video's end.

### Client Drift Compensation
When a client receives a `sync_state` event:
1. Video ID check: If `state.videoId !== localVideoId`, calls `player.loadVideoById()`.
2. Drift check: Compares `localTime` against `state.currentTime`. If $|\text{localTime} - \text{state.currentTime}| > 1.5\text{s}$, performs `player.seekTo(targetTime, true)`.
3. Play/Pause check: Matches playing or paused state.

### Anti-Echo Re-Entrant Guard
To prevent a broadcast loop where a programmatic update triggers `onStateChange` which emits another `play` event, the `useYouTubePlayer` hook flags `isRemoteAction.current = true` during remote sync updates. Any state change fired during this window is ignored from emitting outgoing socket events.

---

## 8. Role-Based Access Control (RBAC)

| Capability | Host 👑 | Moderator 🛡️ | Participant 👤 |
|---|:---:|:---:|:---:|
| Play / Pause | ✅ | ✅ | ❌ *(Request)* |
| Seek timeline | ✅ | ✅ | ❌ *(Request)* |
| Change video source | ✅ | ✅ | ❌ *(Request)* |
| Promote to Moderator | ✅ | ❌ | ❌ |
| Demote to Participant | ✅ | ❌ | ❌ |
| Kick Participant | ✅ | ❌ | ❌ |
| View participant list | ✅ | ✅ | ✅ |
| Send Reactions | ✅ | ✅ | ✅ |

---

## 9. Permission Request Workflow

```
Participant clicks "Request Permission" (or attempts restricted action)
      │
      ▼
Modal opens: Choose action (Play/Pause or Propose YouTube URL)
      │
      ▼
Socket: permission_request { action, payload }
      │
      ▼
Server validates session and broadcasts `permission_received` to Host & Moderators
      │
      ▼
Host / Moderator sees interactive banner:
   "Playback Permission Request: Alex Chen wants to change video"
   [ Reject ]   [ Approve ]
      │
      ├───────────────────────────────┐
      ▼ (If Rejected)                 ▼ (If Approved)
Server broadcasts declined     Server executes action on behalf of requester,
Notification to requester      updates RoomManager, broadcasts `sync_state`
```

---

## 10. Local Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or later (tested on Node v23.2.0)
- **npm**: v9.0.0 or later

### 1. Clone & Install
```bash
git clone <repo-url> WatchAlong_website
cd WatchAlong_website

# Install root, server, and client dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Start Development Servers
Run both backend and frontend concurrently with hot-reloading:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API & Socket: `http://localhost:3001`

---

## 11. Running Tests

The application includes an automated end-to-end multi-client test suite (`server/src/test_e2e.ts`) that launches 3 concurrent Socket.IO clients (Host, Moderator, Participant) to verify:
1. Health check endpoint
2. Room creation via REST
3. Room code lookup
4. Host connection & role assignment
5. Participant connection
6. Server-side RBAC rejection of unauthorized commands
7. Host seek and play synchronization
8. Host role promotion
9. Moderator playback control
10. Participant permission request and Host approval
11. Participant kick workflow
12. Graceful disconnect and participant list updates

Run the test suite with:
```bash
npm test
```

---

## 12. Production Build & Deployment Guide

### Single-Service Hosting (Render / Railway)
The backend is designed to serve the pre-built React frontend static assets from `client/dist` in production, eliminating cross-origin issues and simplifying deployment to a single web service!

1. **Build the complete project**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   npm start
   ```
   Access `http://localhost:3001` to view the full application.

### Deploying to Render:
1. Create a new **Web Service** on Render and connect the repository.
2. Build Command: `npm run install:all && npm run build`
3. Start Command: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default assigned by Render)

---

## 13. Code Walkthrough & Interview Defense

### Key Technical Decisions:
1. **Why In-Memory RoomManager?**
   For a single-server real-time watch party MVP, in-memory state provides zero-latency timeline lookups and eliminates database polling overhead. It adheres strictly to the official assignment recommendation while keeping architectural complexity minimal.
2. **Why Socket.IO instead of raw WebSockets?**
   Socket.IO provides built-in channel rooms (`socket.join('room:AB12CD')`), automatic reconnection buffering, binary serialization fallback, and request-response acknowledgments (`callbacks`), which are essential for reliable permission approval workflows.
3. **Drift Compensation vs. Hard Seeks**:
   A tolerance threshold of 1.5 seconds avoids stuttering playback from minor network jitter while ensuring all viewers remain in tight lockstep with the host.

---

## 14. Platform Limitations & Trade-offs

- **Browser Autoplay Policies**: Modern browsers (Chrome, Safari, Firefox) restrict videos with sound from playing automatically without prior user gesture. If a participant joins a playing room, video will synchronize once the user has clicked on the player or page.
- **Single-Server In-Memory State**: In-memory storage means restarting the server resets active rooms. In a scaled multi-instance cluster, a Redis pub/sub adapter (`@socket.io/redis-adapter`) can be attached with persistent room metadata stored in PostgreSQL or SQLite.
