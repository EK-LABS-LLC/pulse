import { useState, type FormEvent } from "react";
import { useTheme } from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authClient } from "../lib/auth-client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  if (!authLoading && isAuthenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    if (isSignUp && !name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (isSignUp && !projectName.trim()) {
      setError("Please enter your project name");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const response = await fetch("/dashboard/api/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            name: name.trim(),
            projectName: projectName.trim(),
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          let message = "Sign up failed";
          try {
            const data = JSON.parse(text);
            message = data.error || data.message || message;
          } catch {
            if (text) message = text;
          }
          setError(message);
          return;
        }

        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message || "Sign in after sign up failed");
          return;
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message || "Invalid email or password");
          return;
        }
      }
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const field =
    "w-full rounded-lg px-3 py-2 text-sm transition-colors outline-none disabled:opacity-50";
  const fieldStyle = {
    background: "var(--surface-3)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{
          background:
            "linear-gradient(150deg, var(--surface-2) 0%, var(--surface-3) 55%, var(--bg) 100%)",
          borderRight: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            P
          </span>
          <span className="text-lg font-semibold tracking-tight">Pulse</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Find out why the run failed.
          </h2>
          <p className="mt-4 text-sm" style={{ color: "var(--text-4)" }}>
            Pulse traces agent and LLM workflows span by span, so a failure
            points at the step and the service that caused it.
          </p>

          <div
            className="mt-10 flex flex-col gap-2.5 rounded-xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
            }}
            aria-hidden="true"
          >
            {[
              { w: "88%", l: "0%", c: "var(--neutral-soft)" },
              { w: "34%", l: "6%", c: "var(--blue)" },
              { w: "22%", l: "42%", c: "var(--teal)" },
              { w: "17%", l: "58%", c: "var(--purple)" },
              { w: "26%", l: "70%", c: "var(--red)" },
            ].map((bar, index) => (
              <div key={index} className="relative h-1.5">
                <span
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: bar.l,
                    width: bar.w,
                    background: bar.c,
                    opacity: 0.9,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--faint)" }}>
          OpenTelemetry-compatible ingest
        </p>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <span className="flex items-center gap-2 lg:hidden">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold"
                style={{ background: "var(--blue)", color: "#fff" }}
              >
                P
              </span>
              <span className="font-semibold tracking-tight">Pulse</span>
            </span>
            <span className="hidden lg:block" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0"
              style={{ background: "var(--fill)", color: "var(--text-3)" }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d={
                    theme === "dark"
                      ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      : "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  }
                />
              </svg>
            </button>
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            {isSignUp ? "Create your account" : "Sign in"}
          </h1>
          <p className="mt-1.5 mb-8 text-sm" style={{ color: "var(--dim)" }}>
            {isSignUp
              ? "Set up a project and start sending traces."
              : "Welcome back."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm" style={{ color: "var(--text-4)" }}>
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className={field}
                  style={fieldStyle}
                  placeholder="Ada Lovelace"
                />
              </label>
            )}

            {isSignUp && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm" style={{ color: "var(--text-4)" }}>
                  Project name
                </span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isLoading}
                  className={field}
                  style={fieldStyle}
                  placeholder="My first project"
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm" style={{ color: "var(--text-4)" }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={field}
                style={fieldStyle}
                placeholder="you@example.com"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm" style={{ color: "var(--text-4)" }}>
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={field}
                style={fieldStyle}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  color: "var(--red-text)",
                  background: "var(--red-tint)",
                  border: "1px solid var(--red-border)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 w-full cursor-pointer rounded-lg border-0 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {isLoading
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setProjectName("");
            }}
            className="mt-6 w-full cursor-pointer border-0 bg-transparent text-center text-sm"
            style={{ color: "var(--dim)" }}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </main>
    </div>
  );
}
