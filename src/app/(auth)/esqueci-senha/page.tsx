"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível enviar o e-mail.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6">
      <Image src="/logo.png" alt="Bolão do 100c" width={100} height={100} priority />
      <h1 className="font-display mt-4 text-xl font-extrabold tracking-tight">
        Esqueci minha senha
      </h1>

      {sent ? (
        <div className="mt-6 w-full rounded-2xl bg-white p-5 ring-1 ring-line text-center">
          <p className="text-sm font-semibold text-pitch">E-mail enviado!</p>
          <p className="mt-1 text-xs text-ink/60">
            Se esse endereço estiver cadastrado, você receberá um link para redefinir sua senha.
            Verifique também a caixa de spam.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-xs font-semibold text-pitch"
          >
            Voltar para o login
          </Link>
        </div>
      ) : (
        <div className="mt-6 w-full space-y-3">
          <p className="text-center text-xs text-ink/60">
            Informe seu e-mail cadastrado e enviaremos um link de redefinição.
          </p>
          <input
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-pitch focus:outline-none"
            placeholder="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            onClick={submit}
            disabled={loading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch py-3 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:bg-line disabled:text-ink/40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Enviar link
          </button>
          {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
        </div>
      )}

      <p className="mt-6 text-xs text-ink/55">
        <Link href="/login" className="font-semibold text-pitch">
          Voltar para o login
        </Link>
      </p>
    </main>
  );
}
