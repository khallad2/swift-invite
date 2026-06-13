"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, LogIn, AlertCircle, CheckCircle } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered")) {
      setSuccess("Account created successfully! Please log in.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        throw new Error("Invalid email or password");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1F3D2B] text-[#F5E6D3]">
          <LogIn className="h-6 w-6" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
          Organizer Log In
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Log in to manage your events and scan guest tickets
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-100">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-[#1F3D2B] py-3 px-4 text-sm font-semibold text-[#F5E6D3] hover:bg-[#152a1e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3D2B] focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
            {!loading && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <ArrowRight className="h-5 w-5 text-[#F5E6D3]" />
              </span>
            )}
          </button>
        </div>
      </form>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/auth/register" className="font-semibold text-[#1F3D2B] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1A1A] px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-[#F5E6D3]">Loading form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
