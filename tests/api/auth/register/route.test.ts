import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import bcrypt from 'bcryptjs';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password-123'),
  },
}));

describe('POST /api/auth/register', () => {
  const mockPrisma = (globalThis as any).mockPrisma;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 403 if registration is disabled via DISABLE_SIGNUP env', async () => {
    process.env.DISABLE_SIGNUP = 'true';

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Registration is currently disabled');
  });

  it('should return 403 if registration is disabled via NEXT_PUBLIC_DISABLE_SIGNUP env', async () => {
    process.env.NEXT_PUBLIC_DISABLE_SIGNUP = 'true';

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Registration is currently disabled');
  });

  it('should return 400 if email or password is missing', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing email or password');
  });

  it('should return 400 if email format is invalid', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid email format');
  });

  it('should return 400 if password is less than 6 characters', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: '12345' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Password must be at least 6 characters');
  });

  it('should return 400 if user already exists with this email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'existing-id',
      email: 'test@example.com',
    });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('User already exists with this email');
  });

  it('should hash the password and create the user successfully', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 'new-user-id',
      email: 'test@example.com',
    });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toBe('User registered successfully');
    expect(data.user).toEqual({ id: 'new-user-id', email: 'test@example.com' });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'hashed-password-123',
      },
    });
  });

  it('should return 500 if an internal server error occurs', async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('DB connection failed'));

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    // Suppress console.error in output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');

    consoleSpy.mockRestore();
  });
});
