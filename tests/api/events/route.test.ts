import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/events/route';
import { getServerSession } from 'next-auth/next';

describe('POST /api/events', () => {
  const mockPrisma = (globalThis as any).mockPrisma;
  const mockEmailsSend = (globalThis as any).mockEmailsSend;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 401 if the user session is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if required fields are missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123', email: 'host@example.com' },
    });

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: '',
        location: 'Hall A',
        dateTime: '2026-07-01T18:00',
        emails: 'guest@example.com',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if date format is invalid', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123', email: 'host@example.com' },
    });

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Event',
        location: 'Hall A',
        dateTime: 'invalid-date',
        emails: 'guest@example.com',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid date format');
  });

  it('should return 400 if no valid guest emails are provided', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123', email: 'host@example.com' },
    });

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Event',
        location: 'Hall A',
        dateTime: '2026-07-01T18:00',
        emails: 'invalid-email-1, invalid-email-2',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No valid guest emails provided');
  });

  it('should create event, create invitations, send emails and return 201 on success', async () => {
    // Set RESEND_API_KEY to test the Resend email path
    process.env.RESEND_API_KEY = 're_123';
    process.env.NEXT_PUBLIC_APP_URL = 'https://swifinvite.example.com';

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123', email: 'host@example.com' },
    });

    const mockEvent = { id: 'event-456', title: 'Test Event' };
    const mockInvitations = [
      { id: 'invite-1', guestEmail: 'guest1@example.com', eventId: 'event-456' },
      { id: 'invite-2', guestEmail: 'guest2@example.com', eventId: 'event-456' },
    ];

    mockPrisma.event.create.mockResolvedValueOnce(mockEvent);
    mockPrisma.invitation.createMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.invitation.findMany.mockResolvedValueOnce(mockInvitations);

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Event',
        description: 'Testing event description',
        location: 'Rooftop Bar',
        dateTime: '2026-07-01T18:00:00.000Z',
        emails: 'guest1@example.com, guest2@example.com; guest1@example.com\nguest2@example.com, invalid@email',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({
      message: 'Event and invitations created successfully',
      eventId: 'event-456',
      guestCount: 2,
    });

    // Check Prisma mocks
    expect(mockPrisma.event.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Event',
        description: 'Testing event description',
        location: 'Rooftop Bar',
        dateTime: new Date('2026-07-01T18:00:00.000Z'),
        userId: 'host-123',
      },
    });

    expect(mockPrisma.invitation.createMany).toHaveBeenCalledWith({
      data: [
        { eventId: 'event-456', guestEmail: 'guest1@example.com' },
        { eventId: 'event-456', guestEmail: 'guest2@example.com' },
      ],
      skipDuplicates: true,
    });

    // Check Resend email sending (should send to both unique guests)
    expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    expect(mockEmailsSend).toHaveBeenNthCalledWith(1, {
      from: 'SwiftInvite <onboarding@resend.dev>',
      to: 'guest1@example.com',
      subject: "You're invited to Test Event!",
      html: expect.stringContaining('https://swifinvite.example.com/verify/invite-1'),
    });
  });

  it('should return 500 if the transaction fails', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'host-123', email: 'host@example.com' },
    });

    mockPrisma.event.create.mockRejectedValueOnce(new Error('Transaction timeout'));

    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Timeout Event',
        location: 'Hall A',
        dateTime: '2026-07-01T18:00:00.000Z',
        emails: 'guest@example.com',
      }),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');

    consoleSpy.mockRestore();
  });
});
