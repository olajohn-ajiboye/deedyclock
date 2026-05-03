import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setSubmitting(false);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/", { replace: true });
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
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

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

        <p className="text-xs text-muted-foreground text-center">
          Access is invite-only. Contact your admin if you need an account.
        </p>
      </div>
    </div>
  );
}
