"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6">
      <Image src="/logo.png" alt="Bolão do 100c" width={140} height={140} priority />
      <h1 className="font-display mt-4 text-2xl font-extrabold tracking-tight">
        Bolão do 100c
      </h1>
      <p className="mt-1 text-sm text-ink/60">Copa do Mundo 2026 • Fase de grupos</p>

      <div className="mt-8 w-full space-y-3">
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="Username"
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          disabled={loading || !username || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch py-3 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:bg-line disabled:text-ink/40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Entrar
        </button>
        {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
      </div>

      <p className="mt-6 text-xs text-ink/55">
        Ainda não participa?{" "}
        <Link href="/cadastro" className="font-semibold text-pitch">
          Use seu código de convite
        </Link>
      </p>
    </main>
  );
}
