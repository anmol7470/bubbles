# Bubbles

A real-time chat application with support for direct messages and group chats, built with TanStack Start and Go.

## Features

- **Real-time messaging** with WebSocket support for instant message delivery, editing, and deletion
- **Direct messages and group chats** with member management (add/remove members, rename groups)
- **Message features** including replies, typing indicators, and read receipts
- **Unread message tracking** to keep track of new messages in each chat
- **User profiles** with customizable avatars and usernames
- **Image sharing** with Cloudflare R2 storage integration
- **Chat management** functionality with delete, leave, rename
- **Responsive design** with dark mode support

## Tech Stack

### Frontend

- [React](https://react.dev)
- [TanStack Start](https://tanstack.com/start) for full-stack React framework
- [TanStack Form](https://tanstack.com/form) for form state management
- [TanStack Query](https://tanstack.com/query) for data fetching and caching
- [Tailwind CSS](https://tailwindcss.com) for styling
- [shadcn/ui](https://ui.shadcn.com) component library
- [usehooks-ts](https://usehooks-ts.com) for React hooks
- [Zod](https://zod.dev) for schema validation

### Backend

- [Go](https://go.dev) with [Gin](https://gin-gonic.com) framework
- [Docker](https://www.docker.com) for running local databases
- [PostgreSQL](https://www.postgresql.org) for data persistence
- [Redis](https://redis.io) for caching and session management
- [gorilla/websocket](https://github.com/gorilla/websocket) for real-time features
- [air](https://github.com/air-verse/air) for live reloading
- [ulule/limiter](https://github.com/ulule/limiter) for rate limiting
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-compatible) for image storage
- [sqlc](https://sqlc.dev) for type-safe SQL queries

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org)
- [Go](https://go.dev)
- [Docker](https://www.docker.com)

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/anmol7470/bubbles.git
   cd bubbles
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Frontend (`frontend/.env`):

   ```bash
   mv frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

   Backend (`backend/.env`):

   ```bash
   mv backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start PostgreSQL and Redis**

   ```bash
   cd backend
   make docker-up
   ```

5. **Run database migrations**

   ```bash
   # while already in /backend
   make migrate-up
   ```

6. **Start the development servers**

   ```bash
   cd ../ # go back to root directory
   npm run dev
   ```

This uses [mprocs](https://github.com/pvolok/mprocs) to run both frontend (port 3000) and backend (port 8080) concurrently.

### Project Structure

```
bubbles/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   ├── routes/        # TanStack Router routes
│   │   └── ...
│   └── package.json
│
├── backend/               # Go backend application
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express-style middleware
│   ├── models/            # Data models
│   ├── database/          # Database queries (sqlc)
│   ├── websocket/         # WebSocket handlers
│   ├── utils/             # Utility functions
│   ├── sql/               # SQL schema and queries
│   ├── Makefile          # Backend commands
│   └── main.go
│
├── mprocs.yaml           # Development process configuration
└── package.json          # Root package.json
```

## Todos

- [x] Add r2 storage for images
- [x] Fix message content styling taking inspiration from whatsapp
- [x] Add websocket for real-time chat for sending, deleting, editing messages, and typing indicators
- [x] Add read receipts for messages
- [x] Add unread message count for chats
- [x] Context menu to manage chats - Delete, Leave. Rename, Add/remove members if group chat
- [x] Add profile picture and username changes for users
- [x] Message reply to feature
- [ ] Add voice message support??
- [ ] Add online/offline status for DMs
- [ ] Add message reactions
- [ ] Add mentions in group chats
- [ ] Add email verification on sign up
