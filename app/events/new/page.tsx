"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, AlignLeft, Users, AlertCircle, Sparkles } from "lucide-react";

export default function NewEventPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          dateTime,
          emails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save event");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create Event</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6 text-gray-500">
            <Sparkles className="h-5 w-5 text-[#1F3D2B]" />
            <span className="text-sm font-semibold tracking-wider uppercase text-[#1F3D2B]">
              New Event
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Event Title */}
              <div>
                <label htmlFor="title" className="text-sm font-semibold text-gray-700 block mb-1">Event Title</label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 px-4 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                  placeholder="e.g. Summer Networking Dinner"
                />
              </div>

              {/* Date & Time and Location in a Grid */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="dateTime" className="text-sm font-semibold text-gray-700 block mb-1">Date & Time</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="dateTime"
                      type="datetime-local"
                      required
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="text-sm font-semibold text-gray-700 block mb-1">Location</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="location"
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                      placeholder="e.g. Green Room, 4th Floor"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="text-sm font-semibold text-gray-700 block mb-1">Description (Optional)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3">
                    <AlignLeft className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                    placeholder="Provide details guests should know (attire, parking, etc.)"
                  />
                </div>
              </div>

              {/* Guest Emails */}
              <div>
                <label htmlFor="emails" className="text-sm font-semibold text-gray-700 block mb-1">
                  Enter Guest Emails (one email per line or separated by commas)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    id="emails"
                    required
                    rows={6}
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm font-mono"
                    placeholder="guest1@example.com&#10;guest2@example.com&#10;guest3@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 py-3 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1F3D2B] py-3 px-6 text-sm font-semibold text-[#F5E6D3] shadow-sm hover:bg-[#152a1e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3D2B] focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? "Creating & Inviting..." : "Create Event & Send Invites"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
