import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/server/database/pool";

type RatingRouteContext = {
  params: Promise<{ bookingId: string }>;
};

type BookingRatingRow = {
  booking_id: unknown;
  proctor_id: unknown;
  status_name: unknown;
};

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = Number(session.user.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function normalizeComment(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: RatingRouteContext) {
  const institutionUserId = await resolveSessionUserId();
  if (!institutionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId: bookingIdText } = await context.params;
  const bookingId = Number(bookingIdText);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rating = Number(body?.rating);
  const comment = normalizeComment(body?.comment);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5." }, { status: 400 });
  }

  try {
    const bookingResult = await pool.query<BookingRatingRow>(
      `
        SELECT
          b.id AS booking_id,
          b.user_id AS proctor_id,
          s.name AS status_name
        FROM bookings b
        JOIN statuses s
          ON s.id = b.status_id
        WHERE b.id = $1
        LIMIT 1
      `,
      [bookingId]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status_name !== "completed") {
      return NextResponse.json(
        { error: "Only completed bookings can be rated." },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO proctor_ratings (booking_id, proctor_id, institution_user_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (booking_id)
        DO UPDATE SET
          institution_user_id = EXCLUDED.institution_user_id,
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          created_at = NOW()
        RETURNING id, booking_id, proctor_id, institution_user_id, rating, comment, created_at
      `,
      [bookingId, booking.proctor_id, institutionUserId, rating, comment || null]
    );

    return NextResponse.json({ rating: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("create booking rating error:", error);
    return NextResponse.json({ error: "Unable to save rating." }, { status: 500 });
  }
}
