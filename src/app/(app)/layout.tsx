import Image from "next/image";
import { FooterNav } from "@/components/footer-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <Image src="/logo.png" alt="Bolão do 100c" width={44} height={44} priority />
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold tracking-tight">
            Bolão do 100c
          </p>
          <p className="text-xs text-ink/60">Copa do Mundo 2026 • Fase de grupos</p>
        </div>
      </header>
      <main className="flex-1 px-4 pb-28">{children}</main>
      <FooterNav />
    </div>
  );
}
