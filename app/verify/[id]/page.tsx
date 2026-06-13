import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Calendar, MapPin, CheckCircle, Clock, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import CheckInButton from "./CheckInButton";

export const revalidate = 0;

export default async function VerifyTicketPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const checkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!checkUuid.test(id)) {
    notFound();
  }

  const invitation = await db.invitation.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1A1A1A] p-4 text-[#F5E6D3]">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl text-gray-800">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Ticket Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">
            We couldn't find an invitation matching this ticket code. Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const { event } = invitation;

  const session = await getServerSession(authOptions);
  const isOwner = session?.user && event.userId === session.user.id;

  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const domainUrl = `${protocol}://${host}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || domainUrl;
  const inviteUrl = `${appUrl}/verify/${invitation.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`;

  const isPending = invitation.status === "pending";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1A1A1A] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-150">
        
        {/* Ticket Header Banner */}
        <div className={`p-6 text-center text-[#F5E6D3] ${isPending ? "bg-[#1F3D2B]" : "bg-gray-800"}`}>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="h-5 w-5 text-[#F5E6D3] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase">
              SwiftInvite Ticket
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight line-clamp-2">
            {event.title}
          </h1>
        </div>

        {/* Ticket Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Event Details Card */}
          <div className="space-y-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 border border-gray-200">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-800 block">Date & Time</span>
                <span>{new Date(event.dateTime).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-800 block">Location</span>
                <span>{event.location}</span>
              </div>
            </div>
            {event.description && (
              <div className="border-t border-gray-250 pt-3 text-xs italic text-gray-500">
                {event.description}
              </div>
            )}
          </div>

          {/* Guest Info */}
          <div className="text-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider block">Invited Guest</span>
            <span className="text-base font-bold text-gray-900">{invitation.guestEmail}</span>
          </div>

          {/* Ticket Status Indicator */}
          <div className="border-t border-gray-100 pt-6 flex flex-col items-center">
            {isPending ? (
              // Active Pending Ticket
              <div className="w-full text-center space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-bold text-green-700 border border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>VALID TICKET • Ready for Entry</span>
                </div>
                
                <div className="mx-auto border border-gray-200 rounded-xl p-3 bg-white max-w-[200px] shadow-sm">
                  <img
                    src={qrCodeUrl}
                    alt="Ticket QR Code"
                    width={176}
                    height={176}
                    className="block"
                  />
                </div>
                <p className="text-xs text-gray-400 px-4">
                  Present this QR code to the event bouncer at the door.
                </p>

                {isOwner && (
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <p className="text-xs text-gray-500 font-semibold mb-2">Organizer Actions:</p>
                    <CheckInButton invitationId={invitation.id} />
                  </div>
                )}
              </div>
            ) : (
              // Checked In Ticket
              <div className="w-full text-center space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-1.5 text-sm font-bold text-yellow-700 border border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
                  <span>ALREADY CHECKED IN</span>
                </div>
                
                <div className="mx-auto border border-gray-200 rounded-xl p-3 bg-gray-50 max-w-[200px] opacity-40 select-none">
                  <img
                    src={qrCodeUrl}
                    alt="Ticket QR Code"
                    width={176}
                    height={176}
                    className="block grayscale"
                  />
                </div>
                
                <div className="text-xs text-gray-500 rounded-lg bg-yellow-50 p-3 border border-yellow-100">
                  Scanned and verified on{" "}
                  <strong>
                    {invitation.scannedAt
                      ? new Date(invitation.scannedAt).toLocaleDateString() + " " + new Date(invitation.scannedAt).toLocaleTimeString()
                      : "unknown time"}
                  </strong>.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Ticket Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center text-xs text-gray-400 border-t border-gray-100">
          Powered by SwiftInvite • Zero-configuration gate entry.
        </div>

      </div>
    </div>
  );
}
