import Link from "next/link";
import { QrCode, Mail, Zap, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5E6D3] flex flex-col justify-between">
      {/* Navbar */}
      <nav className="border-b border-[#2a2a2a] py-5 px-6 sm:px-12 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#1F3D2B] p-2 rounded-lg text-[#F5E6D3] border border-[#2a2a2a]">
            <QrCode className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SwiftInvite</span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="text-sm font-semibold hover:text-[#c4b5a2] transition-colors self-center px-4"
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className="bg-[#1F3D2B] border border-[#2e593f] rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#152a1e] transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto w-full px-6 py-20 text-center flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1F3D2B]/40 border border-[#1F3D2B] px-4 py-1.5 text-xs font-semibold text-[#F5E6D3] mb-8 mx-auto">
          <Zap className="h-3.5 w-3.5 text-yellow-400" />
          <span>Frictionless Event Invitations</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Create invitations.<br />
          Scan at the door.
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          SwiftInvite is a lightweight, zero-configuration gate check-in system. Create events, batch-paste guest emails, send automated QR tickets, and check-in guests instantly on your phone.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1F3D2B] text-[#F5E6D3] border border-[#2e593f] font-bold px-8 py-4 rounded-xl hover:bg-[#152a1e] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Get Started Free</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto flex items-center justify-center bg-transparent border border-[#3a3a3a] text-gray-300 font-bold px-8 py-4 rounded-xl hover:bg-[#2a2a2a] hover:text-white transition-all"
          >
            Organizer Portal
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 rounded-2xl bg-[#222] border border-[#2d2d2d]">
            <div className="h-10 w-10 bg-[#1F3D2B]/60 text-[#F5E6D3] rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Instant Batch Emailing</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Paste guest emails in bulk. SwiftInvite instantly generates tickets and delivers formatted QR ticket pages to guests.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#222] border border-[#2d2d2d]">
            <div className="h-10 w-10 bg-[#1F3D2B]/60 text-[#F5E6D3] rounded-lg flex items-center justify-center mb-4">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Web-Native Scanner</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              No app store downloads required. Use your phone's built-in browser camera to scan tickets instantly at the gate.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#222] border border-[#2d2d2d]">
            <div className="h-10 w-10 bg-[#1F3D2B]/60 text-[#F5E6D3] rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Double-Scan Protection</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Secured with row-level transaction database locks to completely block duplicate scans and ticket sharing.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] py-6 px-6 text-center text-xs text-gray-500 max-w-7xl mx-auto w-full">
        SwiftInvite © {new Date().getFullYear()} • Zero-configuration Docker Package.
      </footer>
    </div>
  );
}
