import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

// GET /api/slots?providerId=&serviceId=&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const providerId = searchParams.get("providerId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!providerId || !serviceId || !date) {
    return NextResponse.json(
      { error: "providerId, serviceId, and date are required" },
      { status: 400 }
    );
  }

  const slots = await getAvailableSlots(providerId, serviceId, date);
  return NextResponse.json({ slots });
}
