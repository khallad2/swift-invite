"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, AlertOctagon, RefreshCw } from "lucide-react";

type ScanState = "scanning" | "checking" | "success" | "duplicate" | "invalid" | "error";

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [scannedEmail, setScannedEmail] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const scannerRef = useRef<any>(null);
  const stateRef = useRef<ScanState>("scanning");

  useEffect(() => {
    stateRef.current = scanState;
  }, [scanState]);

  useEffect(() => {
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const qrcodeId = "reader";
        html5QrCode = new Html5Qrcode(qrcodeId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width: number, height: number) => {
              const size = Math.min(width, height) * 0.70;
              return { width: size, height: size };
            },
          },
          onScanSuccess,
          onScanFailure
        );
        setCameraActive(true);
      } catch (err) {
        console.error("Camera start error:", err);
        setErrorMessage("Could not access camera. Please make sure camera permissions are granted and context is secure (HTTPS/localhost).");
        setScanState("error");
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => {
          console.error("Error stopping scanner:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (stateRef.current !== "scanning") return;

    try {
      setScanState("checking");

      let inviteId = "";
      if (decodedText.includes("/verify/")) {
        const parts = decodedText.split("/verify/");
        inviteId = parts[parts.length - 1]?.split(/[?#]/)[0];
      } else {
        inviteId = decodedText.trim();
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(inviteId)) {
        triggerFeedback("invalid", "INVALID TICKET - Not a valid ticket code.");
        return;
      }

      const res = await fetch(`/api/verify/${inviteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        triggerFeedback("error", "UNAUTHORIZED - Log in to scan tickets.");
        return;
      }

      if (res.status === 403) {
        triggerFeedback("error", "FORBIDDEN - You do not own this event.");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        triggerFeedback("invalid", data.error || "INVALID TICKET - Not on guest list.");
        return;
      }

      if (data.status === "INVALID") {
        triggerFeedback("invalid", data.message || "INVALID TICKET - Not on guest list.");
      } else if (data.status === "DUPLICATE") {
        setScannedEmail(data.guestEmail || "");
        triggerFeedback("duplicate", data.message || "DUPLICATE TICKET - Already scanned.");
      } else if (data.status === "SUCCESS") {
        setScannedEmail(data.guestEmail || "");
        triggerFeedback("success", data.message || "WELCOME! Checked in successfully.");
      } else {
        triggerFeedback("invalid", "INVALID TICKET - Not on guest list.");
      }

    } catch (err) {
      console.error("Scan processing error:", err);
      triggerFeedback("invalid", "INVALID TICKET - Code reading error.");
    }
  };

  const onScanFailure = () => {
    // Silent failure during continuous scan loop
  };

  const triggerFeedback = (state: ScanState, message: string) => {
    setScanState(state);
    setFeedbackMsg(message);

    if (state !== "error") {
      setTimeout(() => {
        setScanState("scanning");
        setFeedbackMsg("");
        setScannedEmail("");
      }, 2500);
    }
  };

  const getOverlayStyles = () => {
    switch (scanState) {
      case "success":
        return "bg-green-600 text-white z-50 opacity-100 scale-100";
      case "duplicate":
        return "bg-yellow-500 text-black z-50 opacity-100 scale-100";
      case "invalid":
        return "bg-red-600 text-white z-50 opacity-100 scale-100";
      case "checking":
        return "bg-black bg-opacity-75 text-white z-40";
      default:
        return "pointer-events-none opacity-0 scale-95 hidden";
    }
  };

  return (
    <div className="relative min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#1A1A1A] px-4 py-4 flex items-center gap-4 text-[#F5E6D3] z-10">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-[#F5E6D3] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Gate Scanner</h1>
          <p className="text-xs text-gray-400">Position ticket QR code inside screen target</p>
        </div>
      </header>

      {/* Camera feed / Scanner container */}
      <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden bg-black">
        {/* Scanner target frame */}
        {scanState === "scanning" && cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="relative w-64 h-64 border-2 border-dashed border-[#F5E6D3] rounded-2xl flex items-center justify-center opacity-70">
              <div className="absolute top-[-10px] left-[-10px] w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg pointer-events-none"></div>
              <div className="absolute top-[-10px] right-[-10px] w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg pointer-events-none"></div>
              <div className="absolute bottom-[-10px] left-[-10px] w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg pointer-events-none"></div>
              <div className="absolute bottom-[-10px] right-[-10px] w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg pointer-events-none"></div>
            </div>
          </div>
        )}

        {/* Live camera view */}
        <div id="reader" className="w-full h-full max-w-lg aspect-square overflow-hidden" />

        {/* Errors like permission denied */}
        {scanState === "error" && (
          <div className="absolute inset-0 bg-[#1A1A1A] flex flex-col items-center justify-center px-6 text-center text-[#F5E6D3] z-20">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold">Camera Access Error</h3>
            <p className="mt-2 text-sm text-gray-400 max-w-xs">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1F3D2B] px-4 py-2.5 text-sm font-semibold text-[#F5E6D3] hover:bg-[#152a1e] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Camera Access</span>
            </button>
          </div>
        )}

        {/* Checking spinner */}
        {scanState === "checking" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-40">
            <RefreshCw className="h-8 w-8 animate-spin text-[#F5E6D3] mb-4" />
            <p className="text-sm font-semibold tracking-wider">Verifying Ticket...</p>
          </div>
        )}

        {/* Fullscreen Feedback Overlays (GREEN/YELLOW/RED) */}
        {(scanState === "success" || scanState === "duplicate" || scanState === "invalid") && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 ${getOverlayStyles()}`}>
            {scanState === "success" && (
              <>
                <CheckCircle className="h-24 w-24 mb-6" />
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">WELCOME!</h2>
                <p className="mt-4 text-lg font-semibold max-w-md">{feedbackMsg}</p>
                {scannedEmail && <p className="mt-2 text-sm opacity-80">{scannedEmail}</p>}
              </>
            )}

            {scanState === "duplicate" && (
              <>
                <AlertOctagon className="h-24 w-24 mb-6" />
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">DUPLICATE TICKET</h2>
                <p className="mt-4 text-lg font-semibold max-w-md">{feedbackMsg}</p>
                {scannedEmail && <p className="mt-2 text-sm opacity-80">{scannedEmail}</p>}
              </>
            )}

            {scanState === "invalid" && (
              <>
                <AlertTriangle className="h-24 w-24 mb-6" />
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">INVALID TICKET</h2>
                <p className="mt-4 text-lg font-semibold max-w-md">{feedbackMsg}</p>
              </>
            )}

            <p className="absolute bottom-12 text-xs opacity-65 tracking-wider uppercase animate-pulse">
              Resetting scanner in 2.5s...
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="bg-[#1A1A1A] p-6 text-center text-gray-500 text-xs border-t border-[#2a2a2a] z-10">
        SwiftInvite Gate Check-in System • Locked database updates enabled.
      </footer>
    </div>
  );
}
