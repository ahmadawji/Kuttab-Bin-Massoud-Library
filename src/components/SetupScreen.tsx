import React from 'react';
import { Settings } from 'lucide-react';

export function SetupScreen() {
  return (
    <div className="min-h-screen bg-transparent p-8 flex items-center justify-center">
      <div className="max-w-2xl bg-[var(--brand-surface)] border border-amber-100 p-8 rounded-2xl shadow-lg space-y-6">
        <div className="flex items-center gap-4 text-[var(--brand-primary)] mb-2">
          <Settings className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-[var(--brand-ink)]">إعداد التطبيق مطلوب</h1>
        </div>
        <p className="text-[var(--brand-muted)] text-lg">
          لاستخدام هذا التطبيق، يجب إعداد بيانات اعتماد <strong>Google OAuth</strong> في المتغيرات البيئية <span className="dir-ltr text-sm inline-block bg-amber-50 px-2 py-1 rounded font-mono border border-amber-100">.env</span> (في قائمة Settings).
        </p>
        <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-5 mt-4 space-y-4">
          <h3 className="font-semibold text-[var(--brand-ink)]">الخطوات:</h3>
          <ol className="list-decimal list-inside space-y-3 text-[var(--brand-muted)] leading-relaxed">
            <li>اذهب إلى <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-[var(--brand-primary)] font-medium hover:underline">Google Cloud Console</a>.</li>
            <li>قم بإنشاء مشروع جديد وفعل <strong>Google Sheets API</strong>.</li>
            <li>اذهب إلى Credentials وأنشئ <strong>OAuth Client ID</strong> من نوع Web Application.</li>
            <li>أضف رابط التحويل (Redirect URI): <br/><code className="bg-white px-2 py-1 rounded text-sm dir-ltr inline-block mt-1 border border-amber-100">{window.location.origin}/auth/callback</code></li>
            <li>انسخ المعرف (Client ID) والسر (Client Secret) وضعهم في <code className="bg-white px-2 py-1 rounded text-sm dir-ltr inline-block border border-amber-100">OAUTH_CLIENT_ID</code> و <code className="bg-white px-2 py-1 rounded text-sm dir-ltr inline-block border border-amber-100">OAUTH_CLIENT_SECRET</code>.</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-to-l from-[var(--brand-primary)] to-[var(--brand-primary-strong)] text-white rounded-xl py-3 font-semibold hover:brightness-105 transition"
        >
          لقد قمت بإضافة المتغيرات (تحديث)
        </button>
      </div>
    </div>
  );
}
