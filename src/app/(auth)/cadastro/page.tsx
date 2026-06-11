"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    inviteCode: "",
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível criar a conta.");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const ready = Object.values(form).every((value) => value.trim().length > 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6 py-10">
      <Image src="/logo.png" alt="Bolão do 100c" width={100} height={100} priority />
      <h1 className="font-display mt-3 text-xl font-extrabold tracking-tight">
        Entrar no bolão
      </h1>

      <div className="mt-6 w-full space-y-3">
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="Código de convite"
          value={form.inviteCode}
          onChange={update("inviteCode")}
        />
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="Seu nome"
          autoComplete="name"
          value={form.displayName}
          onChange={update("displayName")}
        />
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="Username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={update("username")}
        />
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
          placeholder="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={update("email")}
        />
        <div className="relative">
          <input
            className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-sm focus:border-pitch focus:outline-none"
            placeholder="Senha (mínimo 6 caracteres)"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button
          onClick={submit}
          disabled={loading || !ready}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch py-3 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:bg-line disabled:text-ink/40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Criar conta
        </button>
        {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
      </div>

      <p className="mt-6 text-xs text-ink/55">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-pitch">
          Entrar
        </Link>
      </p>
    </main>
  );
}
