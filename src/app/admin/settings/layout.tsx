'use client';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1180px]">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1.5">Manage site-wide configuration, branding, reading behavior, typography and custom code.</p>
      </div>
      {children}
    </div>
  );
}
