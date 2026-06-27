import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckInButton from '@/app/verify/[id]/CheckInButton';
import { useRouter } from 'next/navigation';

describe('CheckInButton Component', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const router = useRouter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default state', () => {
    render(<CheckInButton invitationId="invite-123" />);

    const button = screen.getByRole('button', { name: /Check In Guest/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.queryByText(/Checking In.../i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument();
  });

  it('disables the button and shows loading state on click', async () => {
    // Return a slow promise to keep loading state active during assertion
    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    fetchSpy.mockImplementationOnce(() => fetchPromise as any);

    render(<CheckInButton invitationId="invite-123" />);

    const button = screen.getByRole('button', { name: /Check In Guest/i });
    fireEvent.click(button);

    // Assert loading state
    expect(button).toBeDisabled();
    expect(screen.getByText(/Checking In.../i)).toBeInTheDocument();

    // Clean up promise
    resolveFetch({
      ok: true,
      json: async () => ({ status: 'SUCCESS' }),
    });
  });

  it('displays error message if the fetch fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database constraint failed' }),
    } as any);

    render(<CheckInButton invitationId="invite-123" />);

    const button = screen.getByRole('button', { name: /Check In Guest/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Database constraint failed')).toBeInTheDocument();
    });

    expect(button).not.toBeDisabled();
    expect(screen.getByText(/Check In Guest/i)).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('triggers router refresh and resets loading state on check-in success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'SUCCESS' }),
    } as any);

    render(<CheckInButton invitationId="invite-123" />);

    const button = screen.getByRole('button', { name: /Check In Guest/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/verify/invite-123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(router.refresh).toHaveBeenCalled();
    });

    expect(button).not.toBeDisabled();
    expect(screen.queryByText(/Checking In.../i)).not.toBeInTheDocument();
  });
});
