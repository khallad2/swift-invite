import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/verify/[id]/route';
import { getServerSession } from 'next-auth/next';

describe('POST /api/verify/[id]', () => {
  const mockPrisma = (globalThis as any).mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user session is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const res = await POST(req, { params: { id: 'invite-123' } });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if invitation id parameter is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123' },
    });

    const req = new Request('http://localhost/api/verify/', { method: 'POST' });
    const res = await POST(req, { params: { id: '' } });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing invitation ID');
  });

  it('should return INVALID ticket status if invitation is not found in database', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123' },
    });

    // Mock queryRaw to return empty list
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const res = await POST(req, { params: { id: 'invite-123' } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      status: 'INVALID',
      message: 'INVALID TICKET - Not on guest list.',
    });
  });

  it('should return 403 FORBIDDEN if the logged-in user does not own the event', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'other-host-id' },
    });

    const mockInvite = {
      id: 'invite-123',
      eventId: 'event-456',
      guestEmail: 'guest@example.com',
      status: 'pending',
    };
    mockPrisma.$queryRaw.mockResolvedValueOnce([mockInvite]);

    // Event belongs to 'host-123'
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      id: 'event-456',
      userId: 'host-123',
    });

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const res = await POST(req, { params: { id: 'invite-123' } });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN - You do not own this event.');
  });

  it('should return DUPLICATE status if the ticket is already checked in', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123' },
    });

    const mockInvite = {
      id: 'invite-123',
      eventId: 'event-456',
      guestEmail: 'guest@example.com',
      status: 'checked_in',
      scannedAt: '2026-06-27T12:00:00.000Z',
    };
    mockPrisma.$queryRaw.mockResolvedValueOnce([mockInvite]);

    mockPrisma.event.findUnique.mockResolvedValueOnce({
      id: 'event-456',
      userId: 'host-123',
    });

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const res = await POST(req, { params: { id: 'invite-123' } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('DUPLICATE');
    expect(data.message).toContain('DUPLICATE TICKET - Already scanned');
    expect(data.guestEmail).toBe('guest@example.com');
  });

  it('should perform status update and return SUCCESS on valid pending check-in', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123' },
    });

    const mockInvite = {
      id: 'invite-123',
      eventId: 'event-456',
      guestEmail: 'guest@example.com',
      status: 'pending',
    };
    mockPrisma.$queryRaw.mockResolvedValueOnce([mockInvite]);

    mockPrisma.event.findUnique.mockResolvedValueOnce({
      id: 'event-456',
      userId: 'host-123',
    });

    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const res = await POST(req, { params: { id: 'invite-123' } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('SUCCESS');
    expect(data.message).toContain('WELCOME!');
    expect(data.guestEmail).toBe('guest@example.com');

    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it('should return 500 if database execution throws an error', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123' },
    });

    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection failure'));

    const req = new Request('http://localhost/api/verify/invite-123', { method: 'POST' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(req, { params: { id: 'invite-123' } });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');

    consoleSpy.mockRestore();
  });
});
