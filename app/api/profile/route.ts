import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  copyDefaultShippingAddressToBilling,
  deleteAddress,
  getProfile,
  getUserIdByEmail,
  saveAddress,
  saveMeasurement,
  updateAddress,
} from "@/lib/server/profileStore";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateMeasurementRange(label: string, value: number | null, min: number, max: number) {
  if (value == null) {
    return null;
  }

  if (value < min || value > max) {
    return `${label} is outside the allowed range.`;
  }

  return null;
}

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session, userId: null };
  }

  if (session.user.id) {
    return { session, userId: Number(session.user.id) };
  }

  if (session.user.email) {
    const userId = await getUserIdByEmail(session.user.email);
    return { session, userId };
  }

  return { session, userId: null };
}

export async function GET() {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("profile get error:", error);
    const message = error instanceof Error ? error.message : "Unable to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return badRequest("Invalid request body.");
  }

  try {
    if (payload.section === "measurement") {
      const heightCm = toOptionalNumber(payload.measurement?.heightCm);
      const chestCm = toOptionalNumber(payload.measurement?.chestCm);
      const shoulderWidthCm = toOptionalNumber(payload.measurement?.shoulderWidthCm);
      const sleeveLengthCm = toOptionalNumber(payload.measurement?.sleeveLengthCm);
      const waistCm = toOptionalNumber(payload.measurement?.waistCm);
      const hipCm = toOptionalNumber(payload.measurement?.hipCm);
      const inseamCm = toOptionalNumber(payload.measurement?.inseamCm);

      const hasInvalidValue = [heightCm, chestCm, shoulderWidthCm, sleeveLengthCm, waistCm, hipCm, inseamCm].some(
        (value) => value !== null && value <= 0
      );
      if (hasInvalidValue) {
        return badRequest("Measurement values must be greater than zero when provided.");
      }

      const rangeError =
        validateMeasurementRange("Height", heightCm, 91.4, 243.8) ??
        validateMeasurementRange("Chest", chestCm, 50.8, 203.2) ??
        validateMeasurementRange("Shoulder width", shoulderWidthCm, 25.4, 76.2) ??
        validateMeasurementRange("Arm length", sleeveLengthCm, 38.1, 114.3) ??
        validateMeasurementRange("Waist", waistCm, 45, 200) ??
        validateMeasurementRange("Hip", hipCm, 60, 220) ??
        validateMeasurementRange("Inseam", inseamCm, 40, 120);

      if (rangeError) {
        return badRequest(rangeError);
      }

      await saveMeasurement(userId, {
        heightCm,
        chestCm,
        shoulderWidthCm,
        sleeveLengthCm,
        waistCm,
        hipCm,
        inseamCm,
      });
    } else if (payload.section === "address") {
      const addressType = payload.addressType === "billing" ? "billing" : "shipping";
      const addressId = Number(payload.addressId);
      const name = typeof payload.address?.name === "string" ? payload.address.name.trim() : "";
      const street = typeof payload.address?.street === "string" ? payload.address.street.trim() : "";
      const city = typeof payload.address?.city === "string" ? payload.address.city.trim() : "";
      const state = typeof payload.address?.state === "string" ? payload.address.state.trim().toUpperCase() : "";
      const zipCode = typeof payload.address?.zipCode === "string" ? payload.address.zipCode.trim() : "";
      const country = typeof payload.address?.country === "string" ? payload.address.country.trim() : "";
      const phone = typeof payload.address?.phone === "string" ? payload.address.phone.trim() : "";

      if (!name || !street || !city || !state || !zipCode || !country || !phone) {
        return badRequest("All address fields are required.");
      }

      const normalizedAddress = { name, street, city, state, zipCode, country, phone };

      if (addressId > 0) {
        await updateAddress(userId, addressId, normalizedAddress);
      } else {
        await saveAddress(userId, addressType, normalizedAddress);
      }
    } else if (payload.section === "billing-from-shipping") {
      await copyDefaultShippingAddressToBilling(userId);
    } else {
      return badRequest("Unsupported profile update.");
    }

    const profile = await getProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("profile save error:", error);
    const message = error instanceof Error ? error.message : "Unable to save profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const addressId = Number(payload?.addressId);
  if (!addressId) {
    return badRequest("Address id is required.");
  }

  try {
    await deleteAddress(userId, addressId);
    const profile = await getProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("profile delete error:", error);
    const message = error instanceof Error ? error.message : "Unable to delete address.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
