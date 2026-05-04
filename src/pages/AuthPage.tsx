import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

function readRecoveryFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  const fromHash = new URLSearchParams(hash).get("type") === "recovery";
  const fromSearch = new URLSearchParams(window.location.search).get("type") === "recovery";
  return fromHash || fromSearch;
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** After “forgot password” email link — must set a new password before entering the app. */
  const [recoveryMode, setRecoveryMode] = useState(readRecoveryFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (user && !recoveryMode) return <Navigate to="/" replace />;

  if (recoveryMode && !user) {
    return (
      <div className="min-h-screen grid place-items-center px-5 py-10 bg-background">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-[var(--shadow-elevated)] p-8 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Ask your admin for a new invite, or request
            another reset from the sign-in page.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              setRecoveryMode(false);
              window.history.replaceState(null, "", "/auth");
            }}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters for your password.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You’re signed in.");
    setRecoveryMode(false);
    navigate("/", { replace: true });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a password reset link.");
    setForgotOpen(false);
    setForgotEmail("");
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/", { replace: true });
  }

  async function handleGoogle() {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10 bg-background">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-[var(--shadow-elevated)] p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center text-primary-foreground font-display font-semibold text-xl"
            style={{ background: "var(--gradient-primary)" }}
          >
            DD
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Deedy Clock</h1>
            <p className="text-xs text-muted-foreground">
              {recoveryMode ? "Choose a new password" : "Sign in to continue"}
            </p>
          </div>
        </div>

        {recoveryMode ? (
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 mt-1.5"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
              {submitting ? "Saving…" : "Save password and continue"}
            </Button>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 mt-1.5"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {!forgotOpen ? (
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => setForgotOpen(true)}
              >
                Forgot password?
              </button>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  Enter the email your admin used for your account. We’ll send a reset link (if that user
                  exists).
                </p>
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-11 mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForgotOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    Send reset link
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              onClick={handleGoogle}
              disabled={submitting}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              Continue with Google
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Invite-only: no self-registration. (Ask your admin for an invite).
        </p>
      </div>
    </div>
  );
}
