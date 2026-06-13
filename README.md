# 🎟️ SwiftInvite

A lightweight, frictionless, web-based event invitation and gate check-in system designed for casual event organizers. Packaged entirely in Docker for zero-configuration, production-ready deployments.

---

## ✨ Features

- **🚀 Frictionless Guest Inviter**: Batch-paste guest email addresses and instantly generate tickets.
- **📧 Clean HTML Email Delivery**: Automated beautifully-formatted invitations sent via Resend API containing dynamic event details and embedded QR codes.
- **📷 Web-Native Gate Scanner**: Bouncers scan ticket QR codes using their phone's native browser camera—no App Store downloads required.
- **🔒 Database Concurrency Lock**: Secured with row-level transaction database locks (`SELECT ... FOR UPDATE` in MySQL InnoDB & PostgreSQL) to completely eliminate double-scanning or ticket-sharing race conditions.
- **📊 Live Check-in Metrics**: Real-time event tiles in the dashboard showing check-in progress bars and ratios (e.g. `14/50 Checked In`).
- **🛡️ Secure Access Protection**: Restricts scans to verified event owners while providing guests with a friendly invitation details landing page.
- **⚙️ Toggleable Organizer Registrations**: Turn off new account registrations dynamically via an environment variable flag (`NEXT_PUBLIC_DISABLE_SIGNUP`) when sign-ups are not needed.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Strict TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [MySQL / MariaDB](https://www.mysql.com/) (compatible with Hostinger phpMyAdmin deployments; PostgreSQL is also supported)
- **ORM**: [Prisma ORM](https://www.prisma.io/) (configured for MySQL or PostgreSQL)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Credentials Provider)
- **QR Camera Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) (Browser-native web camera module)
- **Email Delivery**: [Resend API](https://resend.com/)
- **Containerization**: Docker Compose (`web` and `db` services)

---

## 🏃 Quick Start (Docker)

To run the entire application out-of-the-box using Docker, follow these steps:

### 1. Prerequisites
Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Configure Environment Variables
Copy `.env.example` to `.env` at the project root:
```bash
cp .env.example .env
```
Open [.env](file:///.env) and configure the variables:
- **`NEXT_PUBLIC_APP_URL`**: Set this to your laptop's local network Wi-Fi IP address (e.g., `http://192.168.1.100:3000`) so your phone can resolve and load the tickets over Wi-Fi when scanning.
- **`NEXT_PUBLIC_DISABLE_SIGNUP`**: Set to `true` to completely disable new registrations/sign-ups, or `false` to keep registrations open.
- **`NEXTAUTH_SECRET`**: Set a secret key to sign and encrypt session cookies (e.g. `some_random_secret_string`).
- **`RESEND_API_KEY`**: Paste your Resend API Key to enable live email delivery. (If left blank, invitations will gracefully fall back to printing verification links directly to the Docker logs console for easy testing).
- **`DATABASE_URL`**: Set to the local Docker database connection string:
  ```env
  DATABASE_URL="mysql://swift_dev_user:swift_dev_password@db:3306/swiftinvite_dev"
  ```

### 3. Spin Up Containers
Launch the multi-container configuration:
```bash
docker compose up --build
```
This command builds the Next.js standalone container, starts the MySQL database, automatically pushes database schemas on container start, and opens port `3000` on your host machine.

Access the portal at: **`http://localhost:3000`**

---

## 💻 Local Development

To run the Next.js app locally in development mode (without Docker):

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup local Database**: Configure a local MySQL instance and set `DATABASE_URL` in `.env`.
3. **Generate Prisma Client & Push Schema**:
   ```bash
   npx prisma generate
   ```
   ```bash
   npx prisma db push
   ```
4. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Hostinger & phpMyAdmin)

If you are deploying on a classic web hosting platform like **Hostinger** utilizing **phpMyAdmin**:

1. **Configure Prisma**: Ensure your datasource provider is set to `"mysql"` in your [schema.prisma](file:///Users/khallad/Documents/SwiftInvite/SwiftInviteApp/prisma/schema.prisma) file:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Import Tables via phpMyAdmin**:
   * Log into your Hostinger control panel.
   * Go to **Databases** -> **phpMyAdmin** and enter your database administration portal.
   * Select your database (e.g., `your_database_name`).
   * Click on the **Import** tab at the top.
   * Click **Choose File** and select the [schema.sql](file:///Users/khallad/Documents/SwiftInvite/SwiftInviteApp/schema.sql) file located in the root of the project.
   * Scroll down and click **Import** (or **Go**) to build all required tables (`User`, `Event`, `Invitation`).
3. **Set Environment Variable**: In the Hostinger Horizons app configuration dashboard, add `DATABASE_URL` (without quotes around the value):
   ```env
   DATABASE_URL=mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:3306/YOUR_DB_NAME
   ```
   * *Example database host:* `srv1812.hstgr.io` (or the IP address `92.113.22.70`)
4. **Set NextAuth Secrets**: In your dashboard, configure:
   * **`NEXTAUTH_SECRET`**: `your_secure_random_string`
   * **`NEXTAUTH_URL`**: `https://yourdomain.com`

---

## 📊 Database Schema

Designed for speed and cascade safety:

```prisma
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
  id          String    @id @default(uuid()) // Unique check-in token
  eventId     String
  event       Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guestEmail  String
  status      String    @default("pending") // Enums: "pending", "checked_in"
  scannedAt   DateTime?
  createdAt   DateTime  @default(now())

  @@unique([eventId, guestEmail]) // Prevents sending duplicate invites for an event
}
```

---

## 🚦 Gate Scan & Verification Logic

When an invite QR code is scanned, the scanner fetches the API endpoint `/api/verify/[UUID]` inside a transaction and changes the UI color layout instantly:

| Scenario / API JSON Response | UI Feedback Mode | Text Message Displayed |
| :--- | :--- | :--- |
| **UUID not found in database** | **Solid RED Background** | ❌ "INVALID TICKET - Not on guest list." |
| **Status is already `"checked_in"`** | **Solid YELLOW Background** | ⚠️ "DUPLICATE TICKET - Already scanned at [scannedAt]!" |
| **Status is `"pending"`** | **Solid GREEN Background** | "WELCOME! - [guestEmail] checked in successfully." |

### 🔒 Concurrency Protection
To prevent race conditions where a ticket is scanned simultaneously on two devices, the backend executes a row-level database lock inside a transaction:
```sql
SELECT * FROM "Invitation" WHERE "id" = [UUID] LIMIT 1 FOR UPDATE
```
Any secondary scan requests attempting to read the same ticket will block at the database level until the initial check-in transaction commits, guaranteeing 100% check-in reliability.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
