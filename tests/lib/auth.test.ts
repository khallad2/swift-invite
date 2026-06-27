import { vi, describe, it, expect, beforeEach } from 'vitest';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Get the credentials provider from authOptions
const credentialsProvider = authOptions.providers.find(
  (provider) => provider.id === 'credentials'
) as any;

// Use the actual authorize function configured inside options
const authorizeFn = credentialsProvider.options.authorize;

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('NextAuth Configuration & Callbacks', () => {
  const mockPrisma = (globalThis as any).mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Credentials authorize', () => {
    it('should throw an error if email or password is missing', async () => {
      await expect(
        authorizeFn({ email: '', password: 'password123' })
      ).rejects.toThrow('Invalid credentials');

      await expect(
        authorizeFn({ email: 'test@example.com', password: '' })
      ).rejects.toThrow('Invalid credentials');

      await expect(
        authorizeFn(undefined)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw an error if the user is not found in the database', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authorizeFn({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should throw an error if the password comparison fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(
        authorizeFn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
    });

    it('should return user info (excluding password) if credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await authorizeFn({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('JWT Callback', () => {
    it('should append user id to token if user is present', async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      if (!jwtCallback) throw new Error('JWT callback not defined');

      const token = {};
      const user = { id: 'user-123', email: 'test@example.com' };

      const result = await jwtCallback({ token, user } as any);
      expect(result).toEqual({ id: 'user-123' });
    });

    it('should return token untouched if user is not present', async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      if (!jwtCallback) throw new Error('JWT callback not defined');

      const token = { id: 'user-123' };
      const result = await jwtCallback({ token } as any);
      expect(result).toEqual({ id: 'user-123' });
    });
  });

  describe('Session Callback', () => {
    it('should append user id from token to session user object', async () => {
      const sessionCallback = authOptions.callbacks?.session;
      if (!sessionCallback) throw new Error('Session callback not defined');

      const session = { user: { email: 'test@example.com' } };
      const token = { id: 'user-123' };

      const result = await sessionCallback({ session, token } as any);
      expect(result.user).toEqual({
        email: 'test@example.com',
        id: 'user-123',
      });
    });

    it('should return session untouched if user object is not present', async () => {
      const sessionCallback = authOptions.callbacks?.session;
      if (!sessionCallback) throw new Error('Session callback not defined');

      const session = {};
      const token = { id: 'user-123' };

      const result = await sessionCallback({ session, token } as any);
      expect(result).toEqual({});
    });
  });
});
