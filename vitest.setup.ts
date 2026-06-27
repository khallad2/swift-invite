import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Initialize environment variables needed for module-level load instantiation
process.env.RESEND_API_KEY = 'mock_resend_key';
process.env.NEXTAUTH_SECRET = 'mock_nextauth_secret';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Define mocks directly on globalThis before module resolution
(globalThis as any).mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  invitation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(async (cb) => {
    return await cb((globalThis as any).mockPrisma);
  }),
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

(globalThis as any).mockEmailsSend = vi.fn().mockResolvedValue({ id: 'dummy_email_id' });

// Setup module mocks returning the globalThis instances (eliminates hoisting errors)
vi.mock('@/lib/db', () => ({
  db: (globalThis as any).mockPrisma,
}));

// Mock Resend as a standard ES6 Class to support 'new Resend()' constructor calls
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: (globalThis as any).mockEmailsSend,
      };
    },
  };
});

// Mock Next.js navigation hooks and helpers
vi.mock('next/navigation', () => {
  const pushMock = vi.fn();
  const replaceMock = vi.fn();
  const prefetchMock = vi.fn();
  const refreshMock = vi.fn();
  const backMock = vi.fn();

  const useRouter = () => ({
    push: pushMock,
    replace: replaceMock,
    prefetch: prefetchMock,
    refresh: refreshMock,
    back: backMock,
  });

  return {
    useRouter,
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
    redirect: vi.fn((url) => {
      const err = new Error(`Redirect to ${url}`);
      (err as any).digest = `NEXT_REDIRECT;${url};307;`;
      throw err;
    }),
    notFound: vi.fn(() => {
      const err = new Error('notFound');
      (err as any).digest = 'NEXT_NOT_FOUND';
      throw err;
    }),
  };
});

// Mock Next.js headers helper
vi.mock('next/headers', () => {
  const getMock = vi.fn((key: string) => {
    if (key === 'host') return 'localhost:3000';
    return null;
  });
  return {
    headers: vi.fn(() => ({
      get: getMock,
    })),
  };
});

// Mock next-auth server helper
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
