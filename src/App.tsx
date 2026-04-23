import React, { useState, useEffect } from "react";
import { BookOpen, LogIn, Loader2 } from "lucide-react";
import { SetupScreen } from "./components/SetupScreen";
import { LibraryManager } from "./components/LibraryManager";

export default function App() {
  const [configStatus, setConfigStatus] = useState<
    "checking" | "configured" | "unconfigured"
  >("checking");
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const kottabLogo = new URL(
    "../src/lib/images/Kottab Logo.jpg",
    import.meta.url,
  ).href;

  // Check backend configuration
  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setConfigStatus(data.configured ? "configured" : "unconfigured");
      })
      .catch(() => setConfigStatus("unconfigured"));

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setIsLoadingAuth(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoadingAuth(false);
      });
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(
        `/api/auth/url?origin=${encodeURIComponent(window.location.origin)}`,
      );
      const { url } = await res.json();
      const popup = window.open(url, "google_login", "width=500,height=600");

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          // Reload user
          fetch("/api/auth/me")
            .then((r) => r.json())
            .then((u) => setUser(u));
        }
      };
      window.addEventListener("message", handleMessage);
    } catch (e) {
      alert("فشل في بدء تسجيل الدخول");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  if (configStatus === "checking" || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (configStatus === "unconfigured") {
    return <SetupScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-6">
        <div className="max-w-md w-full bg-[var(--brand-surface)] border border-amber-100 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <img
            src={kottabLogo}
            alt="شعار كُتّاب"
            className="w-20 h-20 bg-emerald-100 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-100"
          />
          <h1 className="text-2xl font-bold text-[var(--brand-ink)]">
            إدارة المكتبة
          </h1>
          <p className="text-[var(--brand-muted)] leading-relaxed">
            قم بتسجيل الدخول بحساب Google للوصول إلى جداول البيانات الخاصة بك
            وإدارة كتبك بسهولة.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-[var(--brand-primary)] to-[var(--brand-primary-strong)] text-white rounded-xl py-3 px-4 font-semibold hover:brightness-105 transition"
          >
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول باستخدام Google</span>
          </button>
        </div>
      </div>
    );
  }

  return <LibraryManager user={user} onLogout={handleLogout} />;
}
