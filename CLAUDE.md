# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # Initial setup: install deps, generate Prisma types, run migrations
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint via Next.js
npm test             # Run Vitest tests
npm run db:reset     # Reset database (destructive)
```

Run a single test file: `npx vitest path/to/test.ts`

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude generates code that renders in a live preview — no files are written to disk.

### Request Flow

1. User prompt → `POST /api/chat` (streaming)
2. Server calls Claude via Vercel AI SDK with two tools:
   - **str_replace_editor** (`src/lib/tools/str-replace.ts`): create/view/edit file contents
   - **file_manager** (`src/lib/tools/file-manager.ts`): rename/delete files
3. Tool calls mutate the **virtual file system** (in-memory state, not disk)
4. Updated files stream back to client → `FileSystemContext` state updates
5. `PreviewFrame` recompiles JSX via `@babel/standalone` in a sandboxed iframe

### Key Contexts

- **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): Virtual FS state — all generated files live here
- **ChatContext** (`src/lib/contexts/chat-context.tsx`): Chat messages and Vercel AI SDK streaming

### Layout

`MainContent.tsx` uses `ResizablePanelGroup` for the split-pane UI:
- Left (35%): chat interface
- Right (65%): toggle between live Preview and Monaco code editor

### AI Provider

`src/lib/provider.ts` — returns the Claude model if `ANTHROPIC_API_KEY` is set in `.env`, otherwise falls back to a deterministic `MockLanguageModel` for development without an API key.

### Auth

JWT sessions via `jose` stored in secure HTTP-only cookies. Passwords hashed with `bcrypt`. Anonymous users can use the app; projects only persist to SQLite (Prisma) for authenticated users.

### Preview Rendering

`src/lib/transform/jsx-transformer.ts` transforms the virtual FS files into executable browser code. `PreviewFrame.tsx` renders them in an iframe using `@babel/standalone` and an import map.

### Database Schema

Schema: `prisma/schema.prisma` — SQLite (`prisma/dev.db`), client generated to `src/generated/prisma`.

**User** — `id` (cuid), `email` (unique), `password` (bcrypt), `createdAt`, `updatedAt`, `projects[]`

**Project** — `id` (cuid), `name`, `userId?` (nullable — anon users), `messages` (JSON string, default `"[]"`), `data` (JSON string for virtual FS, default `"{}"`), `createdAt`, `updatedAt`, `user?` (onDelete: Cascade)

## Commit Convention

Use the format: `[type] description`

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `bug` | Bug fix |
| `enhance` | Improvement to an existing feature |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `refactor` | Code restructure without behavior change |
| `chore` | Deps, config, tooling |

Example: `feat add markdown support to chat messages`

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY` to use a real Claude model. The app works without it via the mock provider.
