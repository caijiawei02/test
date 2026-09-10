"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  providers: Array<{
    provider: {
      id: string;
      bio: string | null;
      user: { name: string };
    };
  }>;
};

type Provider = Service["providers"][0]["provider"];

export default function BookPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Steps: 1=service, 2=provider, 3=date+slot, 4=confirm, 5=done
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedId, setConfirmedId] = useState("");

  // Load services
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setError("Failed to load services."));
  }, []);

  // Load slots when date/provider/service ready
  useEffect(() => {
    if (!selectedProvider || !selectedService || !selectedDate) {
      setSlots([]);
      return;
    }
    setLoading(true);
    fetch(
      `/api/slots?providerId=${selectedProvider.id}&serviceId=${selectedService.id}&date=${selectedDate}`
    )
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setError("Failed to load slots."))
      .finally(() => setLoading(false));
  }, [selectedProvider, selectedService, selectedDate]);

  async function handleBook() {
    if (!session) {
      router.push(`/login?callbackUrl=/book`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProvider!.id,
          serviceId: selectedService!.id,
          startsAt: selectedSlot,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Booking failed.");
        return;
      }
      const data = await res.json();
      setConfirmedId(data.id);
      setStep(5);
    } catch {
      setError("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Min date = today
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-sm">
        {["Service", "Provider", "Date & Time", "Confirm"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs
                ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={step === i + 1 ? "font-semibold text-gray-900" : "text-gray-400"}>
              {label}
            </span>
            {i < 3 && <span className="text-gray-300">›</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Step 1: Choose service */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-gray-800">Choose a Service</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => {
                  setSelectedService(svc);
                  setSelectedProvider(null);
                  setStep(2);
                }}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                  {svc.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">{svc.description}</div>
                <div className="text-xs text-blue-600 mt-2">{svc.durationMin} min</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Choose provider */}
      {step === 2 && selectedService && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-lg text-gray-800">
              Choose a Provider for <span className="text-blue-600">{selectedService.name}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedService.providers.map(({ provider }) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider);
                  setSelectedDate("");
                  setSlots([]);
                  setSelectedSlot("");
                  setStep(3);
                }}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                  {provider.user.name}
                </div>
                {provider.bio && (
                  <div className="text-sm text-gray-500 mt-1">{provider.bio}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Choose date and slot */}
      {step === 3 && selectedService && selectedProvider && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline">
              ← Back
            </button>
            <h2 className="font-semibold text-lg text-gray-800">
              Pick a Date &amp; Time
            </h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot("");
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Slots
                </label>
                {loading ? (
                  <p className="text-sm text-gray-400">Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No available slots on this date. Try another day.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => {
                      const time = new Date(slot).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      });
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                            ${selectedSlot === slot
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                            }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            disabled={!selectedSlot}
            onClick={() => setStep(4)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && selectedService && selectedProvider && selectedSlot && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(3)} className="text-sm text-blue-600 hover:underline">
              ← Back
            </button>
            <h2 className="font-semibold text-lg text-gray-800">Confirm Your Booking</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <Row label="Service" value={selectedService.name} />
            <Row label="Duration" value={`${selectedService.durationMin} min`} />
            <Row label="Provider" value={selectedProvider.user.name} />
            <Row
              label="Date & Time"
              value={new Date(selectedSlot).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "UTC",
              }) + " (UTC)"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special requests or information for your provider…"
            />
          </div>

          {!session && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
              You need to be signed in to book.{" "}
              <Link href="/login" className="font-semibold underline">
                Sign in
              </Link>{" "}
              or{" "}
              <Link href="/register" className="font-semibold underline">
                create an account
              </Link>
              .
            </div>
          )}

          <button
            disabled={loading || !session}
            onClick={handleBook}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-lg disabled:opacity-40 hover:bg-green-700 transition-colors"
          >
            {loading ? "Booking…" : "Confirm Booking"}
          </button>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && (
        <div className="text-center space-y-6 py-8">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h2>
          <p className="text-gray-500">
            A confirmation email has been sent. Booking ID:{" "}
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{confirmedId}</span>
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </Link>
            <button
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedProvider(null);
                setSelectedDate("");
                setSlots([]);
                setSelectedSlot("");
                setNotes("");
                setConfirmedId("");
                setError("");
              }}
              className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Book Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
