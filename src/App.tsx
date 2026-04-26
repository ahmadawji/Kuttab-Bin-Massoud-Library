import React, { useState, useEffect } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { SetupScreen } from "./components/SetupScreen";
import { LibraryManager } from "./components/LibraryManager";

export default function App() {
  const [configStatus, setConfigStatus] = useState<
    "checking" | "configured" | "unconfigured"
  >("checking");
  const [user, setUser] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(
    false || localStorage.getItem("guestMode") === "true",
  );
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
        setIsGuestMode(false);
        setIsLoadingAuth(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoadingAuth(false);
      });
  }, []);

  const handleLogin = async () => {
    let popup: Window | null = null;
    let popupCheckTimer: number | null = null;

    const cleanup = () => {
      if (popupCheckTimer !== null) {
        window.clearInterval(popupCheckTimer);
        popupCheckTimer = null;
      }
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };

    const completeLogin = () => {
      fetch("/api/auth/me")
        .then((r) => {
          if (!r.ok) throw new Error("Not logged in");
          return r.json();
        })
        .then((u) => {
          setUser(u);
          setIsGuestMode(false);
          localStorage.removeItem("guestMode");
          if (popup && !popup.closed) {
            popup.close();
          }
        })
        .finally(cleanup);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (popup && event.source !== popup) return;
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        completeLogin();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "oauth_auth_success" &&
        event.newValue &&
        document.visibilityState === "visible"
      ) {
        completeLogin();
      }
    };

    try {
      const res = await fetch(
        `/api/auth/url?origin=${encodeURIComponent(window.location.origin)}`,
      );
      const { url } = await res.json();
      popup = window.open(url, "google_login", "width=500,height=600");

      if (!popup) {
        throw new Error("Popup blocked");
      }

      window.addEventListener("message", handleMessage);
      window.addEventListener("storage", handleStorage);

      // If postMessage doesn't reach the opener, detect popup close and refresh auth state.
      popupCheckTimer = window.setInterval(() => {
        if (popup && popup.closed) {
          completeLogin();
        }
      }, 700);
    } catch (e) {
      cleanup();
      alert("فشل في بدء تسجيل الدخول");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setIsGuestMode(false);
  };

  const handleContinueAsGuest = () => {
    setUser(null);
    setIsGuestMode(true);
    localStorage.setItem("guestMode", "true");
  };

  let content: React.ReactNode;

  if (configStatus === "checking" || isLoadingAuth) {
    content = (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  } else if (configStatus === "unconfigured") {
    content = <SetupScreen />;
  } else if (!user && !isGuestMode) {
    content = (
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
          <button
            onClick={handleContinueAsGuest}
            className="w-full border border-amber-200 text-[var(--brand-muted)] rounded-xl py-3 px-4 font-semibold hover:bg-amber-50 transition"
          >
            المتابعة كزائر (عرض فقط)
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <LibraryManager
        user={user}
        onLogout={handleLogout}
        onLogin={handleLogin}
        isReadOnly={!user}
      />
    );
  }

  return <>{content}</>;
}
