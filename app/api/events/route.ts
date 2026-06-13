import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, location, dateTime, emails } = await req.json();

    if (!title || !location || !dateTime || !emails) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedEmails = Array.from(
      new Set(
        emails
          .split(/[\n,;]+/)
          .map((e: string) => e.trim())
          .filter((e: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(e);
          })
      )
    ) as string[];

    if (parsedEmails.length === 0) {
      return NextResponse.json({ error: "No valid guest emails provided" }, { status: 400 });
    }

    const eventDate = new Date(dateTime);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx: any) => {
      const event = await tx.event.create({
        data: {
          title,
          description,
          location,
          dateTime: eventDate,
          userId: session.user.id,
        },
      });

      const invitationsData = parsedEmails.map((email) => ({
        eventId: event.id,
        guestEmail: email,
      }));

      await tx.invitation.createMany({
        data: invitationsData,
        skipDuplicates: true,
      });

      const createdInvitations = await tx.invitation.findMany({
        where: {
          eventId: event.id,
          guestEmail: { in: parsedEmails },
        },
      });

      return { event, createdInvitations };
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const domainUrl = `${protocol}://${host}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || domainUrl;

    const emailPromises = result.createdInvitations.map(async (invite: any) => {
      const inviteUrl = `${appUrl}/verify/${invite.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
            <div style="background-color: #1F3D2B; padding: 30px; text-align: center;">
              <h1 style="color: #F5E6D3; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">You're invited to ${title}!</h1>
            </div>
            <div style="padding: 30px; color: #1a1a1a;">
              <p style="font-size: 16px; line-height: 24px; margin-top: 0;">Hi,</p>
              <p style="font-size: 16px; line-height: 24px;">You have been invited to an event hosted on SwiftInvite.</p>
              
              <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 24px 0;">
                <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #1F3D2B;">Event Details</h2>
                <p style="margin: 5px 0; font-size: 15px;"><strong>When:</strong> ${eventDate.toLocaleString()}</p>
                <p style="margin: 5px 0; font-size: 15px;"><strong>Where:</strong> ${location}</p>
                ${description ? `<p style="margin: 10px 0 0 0; font-size: 15px; border-top: 1px solid #e5e7eb; padding-top: 10px; color: #4b5563; font-style: italic;">${description}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p style="font-weight: 600; margin-bottom: 15px; font-size: 15px;">Scan this QR code at the entrance to check in:</p>
                <img src="${qrCodeUrl}" alt="Invitation QR Code" width="200" height="200" style="display: block; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; background: white;" />
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #1F3D2B; color: #F5E6D3; font-weight: 600; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px;">View Ticket Page</a>
                <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">
                  Can't see the QR code? <a href="${inviteUrl}" style="color: #1F3D2B; text-decoration: underline;">Click here to view your ticket.</a>
                </p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              Sent via SwiftInvite • Zero-configuration Event Inviter
            </div>
          </div>
        </body>
        </html>
      `;

      if (resend) {
        try {
          await resend.emails.send({
            from: "SwiftInvite <onboarding@resend.dev>",
            to: invite.guestEmail,
            subject: `You're invited to ${title}!`,
            html: emailHtml,
          });
        } catch (err) {
          console.error(`Error sending email to ${invite.guestEmail} via Resend:`, err);
        }
      } else {
        console.log(`
=========================================
[Resend Email Mock]
To: ${invite.guestEmail}
Subject: You're invited to ${title}!
Verification URL: ${inviteUrl}
=========================================
        `);
      }
    });

    await Promise.all(emailPromises);

    return NextResponse.json({
      message: "Event and invitations created successfully",
      eventId: result.event.id,
      guestCount: result.createdInvitations.length,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Event creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
