# Testing Strategy: SwiftInvite

This document outlines the testing strategy, standards, structure, and configurations for SwiftInvite.

## 1. Testing Pyramid & Focus Areas

Our testing strategy follows the standard testing pyramid, placing our primary focus where the greatest business and security risks reside.

```
       / \
      /   \      E2E Tests (Playwright) - Critical User Flows
     / E2E \     (e.g., Guest scanning ticket flow)
    /-------\
   /         \   Integration Tests (Vitest + MSW) - APIs & Route Handlers
  /  API/Int  \  (e.g., verify/[id], create event, auth registers)
 /-------------\
/               \ Unit Tests (Vitest + RTL) - Component rendering, auth options, utils
/      Unit     \ (e.g., CheckInButton, NextAuth authorize, email parsing)
/-----------------\
```

### What We Test (High-Value Paths)
- **Business Logic**: E.g., event email parsing, duplicate scanning protection, and invitation token generation.
- **Security & Authorization**: NextAuth authentication configurations, registration disabling mechanisms, and check-in route owner validations.
- **State Machine Transitions**: State flow of a ticket status from `pending` to `checked_in` under concurrent load (simulated row-level lock).
- **Interactive Component State**: Click handlers, input fields validations, load spinners, and error alerts.

### What We DO NOT Test
- **Framework Internals**: We do not test Next.js routing internals, React rendering engine, or NextAuth session provider logic.
- **CSS and Styling**: Tailwind layouts and CSS designs are verified via manual review.
- **Database Engine**: We mock the Prisma client rather than running a live database during unit/integration tests to ensure speed and predictability.

---

## 2. Coverage Goals

| Layer | Target Line Coverage | Target Branch Coverage |
| --- | --- | --- |
| **Critical Business Logic (API Route Handlers)** | $\ge 90\%$ | $\ge 90\%$ |
| **Database / Authentication utilities** | $\ge 90\%$ | $\ge 90\%$ |
| **Client UI Components (Logic & State)** | $\ge 80\%$ | $\ge 80\%$ |
| **Entire Application Average** | $\ge 85\%$ | $\ge 80\%$ |

---

## 3. Mocking & Fixtures Strategy

To maintain sub-second testing feedback loops:
1. **Prisma Client (`@/lib/db`)**:
   We implement a manual mock for the Prisma database client that mimics the exact behavior of database calls, transaction scopes (`db.$transaction`), raw queries (`db.$queryRaw`), and row updates.
2. **Next.js Features**:
   - `next/navigation`: Mock `useRouter`, `redirect`, and `notFound`.
   - `next/headers`: Mock `headers` list.
   - `next-auth/next`: Mock `getServerSession` to return mocked sessions.
3. **Resend API**:
   - We mock the `resend` package to prevent real email transmission and track the emails sent during test assertions.

---

## 4. Test Directory Layout

All tests are placed in the `tests/` directory under the root:
```
tests/
├── api/                  # API Integration Tests
│   ├── auth/
│   │   └── register/
│   │       └── route.test.ts
│   ├── events/
│   │   └── route.test.ts
│   └── verify/
│       └── route.test.ts
├── components/           # Component Unit Tests
│   ├── CheckInButton.test.tsx
│   └── NewEventPage.test.tsx
└── lib/                  # Library/Utility Unit Tests
    └── auth.test.ts
```

---

## 5. CI Integration

Tests are executed automatically on every push to the `master` branch via GitHub Actions:
- Environment settings ensure Vitest runs in single-pass headless mode (`vitest run`).
- Any failing test halts build execution, triggering the automated Git rollback flow.
