import type { Metadata } from "next";
import { NotificationsList } from "@/components/shared/notifications-list";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 pt-5 sm:px-6 md:pt-7">
      <h1 className="mt-0 mb-[18px] text-[30px] font-bold md:text-[40px]">Notificações</h1>
      <NotificationsList />
    </div>
  );
}
