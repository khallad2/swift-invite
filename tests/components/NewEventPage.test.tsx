import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewEventPage from '@/app/events/new/page';
import { useRouter } from 'next/navigation';

describe('NewEventPage Component', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const router = useRouter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form input fields and buttons', () => {
    render(<NewEventPage />);

    expect(screen.getByLabelText(/Event Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter Guest Emails/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Create Event & Send Invites/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toHaveAttribute('href', '/dashboard');
  });

  it('submits the form data and handles redirect on success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ eventId: 'event-123' }),
    } as any);

    render(<NewEventPage />);

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Event Title/i), { target: { value: 'My Party' } });
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: '2026-07-01T20:00' } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'My House' } });
    fireEvent.change(screen.getByLabelText(/Description \(Optional\)/i), { target: { value: 'BYOB' } });
    fireEvent.change(screen.getByLabelText(/Enter Guest Emails/i), { target: { value: 'guest1@example.com, guest2@example.com' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Create Event & Send Invites/i });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Creating & Inviting.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Party',
          description: 'BYOB',
          location: 'My House',
          dateTime: '2026-07-01T20:00',
          emails: 'guest1@example.com, guest2@example.com',
        }),
      });
      expect(router.push).toHaveBeenCalledWith('/dashboard');
      expect(router.refresh).toHaveBeenCalled();
    });
  });

  it('displays an error alert banner on event creation failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unable to connect to Resend API' }),
    } as any);

    render(<NewEventPage />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Event Title/i), { target: { value: 'My Party' } });
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: '2026-07-01T20:00' } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'My House' } });
    fireEvent.change(screen.getByLabelText(/Enter Guest Emails/i), { target: { value: 'guest1@example.com' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Create Event & Send Invites/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to Resend API')).toBeInTheDocument();
    });

    expect(submitBtn).not.toBeDisabled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
