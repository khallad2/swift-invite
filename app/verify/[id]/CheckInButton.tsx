"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export default function CheckInButton({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCheckIn = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/verify/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to check in guest");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to check in");
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-4">
      {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1F3D2B] py-2.5 px-4 text-sm font-semibold text-[#F5E6D3] hover:bg-[#152a1e] transition-colors disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        <span>{loading ? "Checking In..." : "Check In Guest"}</span>
      </button>
    </div>
  );
}
