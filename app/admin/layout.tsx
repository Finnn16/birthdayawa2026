"use client";

import { AdminNavigation } from "./_components/AdminNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-purple-600">Admin</h1>
          <p className="text-xs text-gray-500 mt-1">BirthdayAwa2026</p>
        </div>
        <AdminNavigation />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
