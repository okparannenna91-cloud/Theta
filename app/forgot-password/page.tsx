"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        setSuccess("If an account exists with this email, you will receive a reset code.");
        setTimeout(() => router.push("/reset-password"), 2000);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email address and we&apos;ll send you a reset code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-500 bg-green-50 dark:bg-green-950/50 p-3 rounded-lg">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <a href="/sign-in" className="text-primary hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
