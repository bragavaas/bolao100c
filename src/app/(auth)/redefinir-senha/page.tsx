"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit() {
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível redefinir a senha.");
        return;
      }
      router.replace("/login?reset=ok");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-6 text-center text-sm text-red-600">
        Link inválido. Solicite um novo na página de{" "}
        <Link href="/esqueci-senha" className="font-semibold underline">
          esqueci minha senha
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mt-6 w-full space-y-3">
      <div className="relative">
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-sm focus:border-pitch focus:outline-none"
          placeholder="Nova senha (mínimo 6 caracteres)"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
      <div className="relative">
        <input
          className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-sm focus:border-pitch focus:outline-none"
          placeholder="Confirmar nova senha"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          onClick={() => setShowConfirm(!showConfirm)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
          aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
        >
          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        onClick={submit}
        disabled={loading || !password || !confirm}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch py-3 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:bg-line disabled:text-ink/40"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Redefinir senha
      </button>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6">
      <Image src="/logo.png" alt="Bolão do 100c" width={100} height={100} priority />
      <h1 className="font-display mt-4 text-xl font-extrabold tracking-tight">
        Redefinir senha
      </h1>
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="mt-6 text-xs text-ink/55">
        <Link href="/login" className="font-semibold text-pitch">
          Voltar para o login
        </Link>
      </p>
    </main>
  );
}
