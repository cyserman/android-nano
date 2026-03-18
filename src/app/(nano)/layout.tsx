import { BottomNav } from "@/components/layout/BottomNav";

export default function NanoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="pb-[80px]">{children}</div>
      <BottomNav />
    </div>
  );
}
