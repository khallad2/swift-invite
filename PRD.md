# Product Requirement Document (PRD)

## Project Name: SwiftInvite (MVP)

**Objective:** A lightweight, frictionless web-based event invitation and gate check-in system for casual event organizers, packaged entirely in Docker for zero-configuration deployment.

---

## 1. System Architecture & Tech Stack

To ensure an AI programmer tool can write this with zero ambiguity, we enforce a strict, single-repository, modern tech stack that runs entirely within Docker containers.

* **Frontend & Backend:** Next.js (App Router) using TypeScript and Tailwind CSS.
* **Database:** MySQL / MariaDB.
* **Database ORM/Client:** Prisma ORM (for automated migrations and type-safe queries).
* **Email Engine:** Resend API (via `@react-email/components` for clean styling).
* **QR Scanning:** `html5-qrcode` (Client-side browser-native camera scanner).
* **Containerization:** `docker-compose` orchestration consisting of a Web container and a Database container.

---

## 2. Core Database Schema (Prisma Format)

The AI tool must generate a schema matching this structure exactly to ensure the validation logic functions correctly:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Simple hashed password for organizer login
  events    Event[]
  createdAt DateTime @default(now())
}

model Event {
  id          String       @id @default(uuid())
  title       String
  description String?
  location    String
  dateTime    DateTime
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitations Invitation[]
  createdAt   DateTime     @default(now())
}

model Invitation {
  id          String    @id @default(uuid()) // This UUID serves as the unique validation token
  eventId     String
  event       Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guestEmail  String
  status      String    @default("pending") // Enums: "pending", "checked_in"
  scannedAt   DateTime?
  createdAt   DateTime  @default(now())

  @@unique([eventId, guestEmail]) // Prevents sending duplicate invites to the same person for an event
}
```

---

## 3. Functional Requirements & User Flows

The application consists of 4 core views/flows. All pages must be fully responsive, prioritizing mobile views for the gate bouncer and the guest.

### Flow 1: Organizer Authentication & Dashboard

* **`/auth/register` & `/auth/login`**: Simple email and password form.
* **`/dashboard`**: Lists all created events with a prominent "Create New Event" button. Displays total guest counts and check-in ratios (e.g., "14/50 Checked In").

### Flow 2: Event & Invitation Creation

* **`/events/new`**: A clean form collecting:
  * Event Title, Description, Location, Date & Time.
  * A large text area labeled: *"Enter Guest Emails (one email per line or separated by commas)"*.
* **Backend Processing**:
  1. Validate input fields. Parse and deduplicate emails.
  2. Save Event to DB.
  3. Loop through emails, generate an `Invitation` row with a fresh UUID token for each guest.
  4. Trigger asynchronous email queue via Resend API.

### Flow 3: Email Delivery & Guest Experience

* The email template must be high-contrast and work flawlessly on mobile Outlook/Gmail without blocking layouts.
* **Email Content:**
  * Header: *"You're invited to [Event Title]!"*
  * Body: Event description, location, time.
  * An embedded QR Code image generated using the public API fallback:
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://[YOUR_DOMAIN]/verify/[INVITATION_UUID]`
  * A fallback text link: *"Can't see the QR code? Click here to view your ticket."*

### Flow 4: The Mobile Gate Validator (Crucial Logic)

* **`/events/[eventId]/scan`**: This page is accessed by the organizer on their phone at the door. It requires the organizer to be logged in.
* **UI Components:** A live camera preview box powered by `html5-qrcode`. Below the camera box, a status display area.
* **Scanning Loop & State Machine Execution:**
  When the camera intercepts a QR code url containing `https://[domain]/verify/[UUID]`, it executes a silent background fetch to `/api/verify/[UUID]` and changes the UI color layout instantly based on the response:

| Scenario / API JSON Response | UI Feedback Mode | Text Message Displayed |
| --- | --- | --- |
| **UUID not found in database** | **Solid RED Background** | ❌ "INVALID TICKET - Not on guest list." |
| **Status is already `"checked_in"`** | **Solid YELLOW Background** | ⚠️ "DUPLICATE TICKET - Already scanned at [scannedAt]!" |
| **Status is `"pending"`** | **Solid GREEN Background** | "WELCOME! - [guestEmail] checked in successfully." |

* *Note on State:* On a Green response, the database must instantly change status to `"checked_in"` and log the timestamp to prevent the duplicate ticket loop. The scanner web UI must auto-reset back to scanning mode after a 2.5-second cooldown delay.

---

## 4. Non-Functional & Production Guardrails

* **Frictionless UX:** Do not enforce multi-step wizard setups. One single page to create an event and paste emails is all it takes.
* **Security:** The `/events/[eventId]/scan` and `/api/verify/[UUID]` routes **must** check session cookies to ensure only the authenticated event owner can execute validations. Guests scanning their own codes manually on their phones will just see a friendly dynamic landing page showing their invite details.

---

## 5. Dockerization Configuration (Execution Specs)

The AI agent must output exactly these two files at the root level to ensure multi-container capability out-of-the-box.

### `Dockerfile`

```dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run prisma generate to build type definitions before next build
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install prisma package locally in runner so npx prisma CLI works
RUN npm install prisma@5.22.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Ensure nextjs user has full ownership of the app directory (including node_modules)
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Loop until DB is ready, push schemas/migrations, then start Next.js server
CMD ["sh", "-c", "until npx prisma db push --skip-generate; do echo 'Waiting for database connection...'; sleep 2; done && node server.js"]
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: swiftinvite_mysql
    restart: always
    environment:
      MYSQL_DATABASE: swiftinvite_dev
      MYSQL_USER: swift_dev_user
      MYSQL_PASSWORD: swift_dev_password
      MYSQL_ROOT_PASSWORD: swift_root_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u$$MYSQL_USER", "-p$$MYSQL_PASSWORD"]
      timeout: 10s
      retries: 5

  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: swiftinvite_web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://swift_dev_user:swift_dev_password@db:3306/swiftinvite_dev
      - NEXTAUTH_SECRET=local_nextauth_secret_key_123
      - RESEND_API_KEY=${RESEND_API_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    depends_on:
      db:
        condition: service_healthy

volumes:
  mysql_data:
```

---

## 6. AI Agent Prompt Checklist for Verification

Feed this checklist directly to your AI tool to confirm execution readiness:

1. [ ] Check if `prisma db push` or migrations are executed inside the container entry point or initialization scripts.
2. [ ] Verify that client-side camera access works securely over standard HTTP on localhost origins for local testing, and requires HTTPS setups in production environments.
3. [ ] Confirm that the validation API script uses a transactional update database lock to prevent simultaneous race conditions if a malicious user tries to scan a single QR code on two devices at the exact same fraction of a second.