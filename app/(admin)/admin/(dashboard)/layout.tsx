import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[hsl(var(--surface))]">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1800px] px-6 py-6 lg:px-10 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
