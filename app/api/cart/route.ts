import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/server/profileStore";
import { getCart, saveCart } from "@/lib/server/cartStore";

type SaveCartPayload = {
  items: Array<{
    id: string;
    qty: number;
    sessionHours?: number | null;
    startIso?: string | null;
    endIso?: string | null;
    bookingAddressStreet?: string | null;
    bookingAddressCity?: string | null;
    bookingAddressState?: string | null;
    bookingAddressZip?: string | null;
    size?: string | null;
  }>;
  shippingAddressId?: number | null;
  billingAddressId?: number | null;
  shippingId?: number | null;
};

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  if (typeof session.user.id === "string" && session.user.id.trim()) {
    const userId = Number(session.user.id);
    return Number.isNaN(userId) ? null : userId;
  }

  if (typeof session.user.email === "string" && session.user.email.trim()) {
    return getUserIdByEmail(session.user.email);
  }

  return null;
}

function isValidPayload(payload: unknown): payload is SaveCartPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) {
    return false;
  }

  return candidate.items.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const typedItem = item as Record<string, unknown>;
    return (
      typeof typedItem.id === "string" &&
      typedItem.id.trim().length > 0 &&
      Number.isInteger(Number(typedItem.qty)) &&
      Number(typedItem.qty) > 0 &&
      (typedItem.sessionHours == null || (Number.isFinite(Number(typedItem.sessionHours)) && Number(typedItem.sessionHours) > 0)) &&
      (typedItem.startIso == null || typeof typedItem.startIso === "string") &&
      (typedItem.endIso == null || typeof typedItem.endIso === "string") &&
      (typedItem.bookingAddressStreet == null || typeof typedItem.bookingAddressStreet === "string") &&
      (typedItem.bookingAddressCity == null || typeof typedItem.bookingAddressCity === "string") &&
      (typedItem.bookingAddressState == null || typeof typedItem.bookingAddressState === "string") &&
      (typedItem.bookingAddressZip == null || typeof typedItem.bookingAddressZip === "string") &&
      (typedItem.size == null || typeof typedItem.size === "string")
    );
  });
}

function isValidSelectionId(value: unknown) {
  return value == null || (Number.isInteger(Number(value)) && Number(value) > 0);
}

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cart = await getCart(userId);
    return NextResponse.json(cart);
  } catch (error) {
    console.error("cart get error:", error);
    return NextResponse.json({ error: "Unable to load cart." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  if (
    !isValidSelectionId(payload.shippingAddressId) ||
    !isValidSelectionId(payload.billingAddressId) ||
    !isValidSelectionId(payload.shippingId)
  ) {
    return NextResponse.json({ error: "Invalid cart selections." }, { status: 400 });
  }

  try {
    const currentCart = await getCart(userId);
    await saveCart(userId, payload.items, {
      shippingAddressId:
        payload.shippingAddressId !== undefined ? payload.shippingAddressId : currentCart.shippingAddressId,
      billingAddressId:
        payload.billingAddressId !== undefined ? payload.billingAddressId : currentCart.billingAddressId,
      shippingId: payload.shippingId !== undefined ? payload.shippingId : currentCart.shippingId,
    });
    const cart = await getCart(userId);
    return NextResponse.json(cart);
  } catch (error) {
    console.error("cart save error:", error);
    const message = error instanceof Error ? error.message : "Unable to save cart.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
