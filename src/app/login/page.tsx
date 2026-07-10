"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { loginAction, signupAction, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res: AuthResult =
      mode === "login"
        ? await loginAction(formData)
        : await signupAction(formData);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    if (mode === "login") {
      router.push("/");
      router.refresh();
    } else {
      setError(null);
      setMode("login");
      setLoading(false);
      // Supabase email confirmation may be required; show a gentle note.
      setError(
        "Account created. Check your email to confirm, then sign in."
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-ink">Briefly</span>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">
            {mode === "login" ? "Welcome back, Sanjib" : "Create your workspace"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "login"
              ? "Sign in to your private freelancing workspace."
              : "Set up Briefly for your freelancing work."}
          </p>

          <form action={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Your name" htmlFor="full_name">
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue="Sanjib"
                  placeholder="Sanjib"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
              />
            </Field>

            {mode === "login" && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
                />
                Keep me signed in on this device
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              {mode === "login" ? "Sign in" : "Create workspace"}
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-border pt-4 text-center text-sm">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                New here? Create a workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Your data is private. Sessions are stored in secure httpOnly cookies.
        </p>
      </div>
    </div>
  );
}
