"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LogOut, Trophy } from "lucide-react";

const items = [
  { href: "/", label: "Jogos", icon: Home },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/palpites", label: "Palpites", icon: ClipboardList },
] as const;

export function FooterNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-pitch" : "text-ink/55"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
        <form action="/api/auth/logout" method="post" className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink/55"
          >
            <LogOut size={20} strokeWidth={2} />
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
