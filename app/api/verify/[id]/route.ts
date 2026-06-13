import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx: any) => {
      // 1. Fetch invitation and lock the row to prevent concurrent scan race conditions
      const invites = await tx.$queryRaw<any[]>`
        SELECT * FROM Invitation WHERE id = ${id} LIMIT 1 FOR UPDATE
      `;

      if (!invites || invites.length === 0) {
        return { status: "INVALID", message: "INVALID TICKET - Not on guest list." };
      }

      const invitation = invites[0];

      // 2. Fetch event to verify the user owns the event
      const event = await tx.event.findUnique({
        where: { id: invitation.eventId },
      });

      if (!event || event.userId !== session.user.id) {
        return { status: "FORBIDDEN", message: "FORBIDDEN - You do not own this event." };
      }

      if (invitation.status === "checked_in") {
        const localScannedAt = invitation.scannedAt 
          ? new Date(invitation.scannedAt).toLocaleTimeString() 
          : "unknown time";
        return {
          status: "DUPLICATE",
          message: `DUPLICATE TICKET - Already scanned at ${localScannedAt}!`,
          guestEmail: invitation.guestEmail,
        };
      }

      // 3. Update the invitation status to checked_in
      const now = new Date();
      await tx.$executeRaw`
        UPDATE Invitation 
        SET status = 'checked_in', scannedAt = ${now} 
        WHERE id = ${id}
      `;

      return {
        status: "SUCCESS",
        message: `WELCOME! - ${invitation.guestEmail} checked in successfully.`,
        guestEmail: invitation.guestEmail,
      };
    });

    if (result.status === "FORBIDDEN") {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
