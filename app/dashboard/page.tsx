import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, MapPin, QrCode } from "lucide-react";
import LogoutButton from "./LogoutButton";

export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/auth/login");
  }

  const events = await db.event.findMany({
    where: { userId: session.user.id },
    include: {
      invitations: true,
    },
    orderBy: { dateTime: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#1F3D2B] p-2 rounded-lg text-[#F5E6D3]">
              <QrCode className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SwiftInvite</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{session.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome & Action banner */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl tracking-tight">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your events, view guest check-in ratios, and scan tickets.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <Link
              href="/events/new"
              className="ml-3 inline-flex items-center gap-2 rounded-lg bg-[#1F3D2B] px-4 py-2.5 text-sm font-semibold text-[#F5E6D3] shadow-sm hover:bg-[#152a1e] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3D2B]"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Event</span>
            </Link>
          </div>
        </div>

        {events.length === 0 ? (
          /* Empty state */
          <div className="text-center rounded-2xl bg-white border border-dashed border-gray-300 py-16 px-4">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first event invitations.</p>
            <div className="mt-6">
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1F3D2B] px-4 py-2 text-sm font-semibold text-[#F5E6D3] shadow-sm hover:bg-[#152a1e] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Event</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event: any) => {
              const totalGuests = event.invitations.length;
              const checkedInGuests = event.invitations.filter((i: any) => i.status === "checked_in").length;
              const checkInRatio = totalGuests > 0 ? (checkedInGuests / totalGuests) * 100 : 0;

              return (
                <div
                  key={event.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight line-clamp-1">
                        {event.title}
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-100">
                        {checkedInGuests}/{totalGuests} Checked In
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">{event.description}</p>
                    )}

                    <div className="space-y-2.5 mb-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{new Date(event.dateTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Check-in progress</span>
                        <span>{Math.round(checkInRatio)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1F3D2B] rounded-full transition-all duration-500"
                          style={{ width: `${checkInRatio}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        href={`/events/${event.id}/scan`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1F3D2B] py-2 px-3 text-sm font-semibold text-[#F5E6D3] hover:bg-[#152a1e] transition-colors"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Scan Tickets</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
