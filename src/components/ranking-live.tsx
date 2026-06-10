"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export interface RankingEntry {
  id: string;
  username: string;
  display_name: string;
  total_points: number;
}

const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export function RankingLive({
  initial,
  currentUserId,
}: {
  initial: RankingEntry[];
  currentUserId: string;
}) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("ranking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          // Recarrega a lista inteira: simples e sempre consistente.
          supabase
            .from("users")
            .select("id, username, display_name, total_points")
            .order("total_points", { ascending: false })
            .order("username", { ascending: true })
            .then(({ data }) => {
              if (data) setEntries(data as RankingEntry[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink/60 ring-1 ring-line">
        O ranking aparece aqui quando os primeiros pontos forem distribuídos.
      </p>
    );
  }

  // Empates compartilham posição (1, 1, 3...)
  let lastPoints = Number.POSITIVE_INFINITY;
  let lastPosition = 0;

  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => {
        const position = entry.total_points === lastPoints ? lastPosition : index + 1;
        lastPoints = entry.total_points;
        lastPosition = position;
        const isMe = entry.id === currentUserId;
        return (
          <li
            key={entry.id}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ${
              isMe ? "ring-pitch" : "ring-line"
            }`}
          >
            <span className="font-display w-8 text-center text-lg font-extrabold text-ink/70">
              {position <= 3 ? medals[position - 1] : `${position}º`}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">
                {entry.display_name}
                {isMe ? <span className="ml-1.5 text-xs font-medium text-pitch">você</span> : null}
              </p>
              <p className="truncate text-xs text-ink/50">@{entry.username}</p>
            </div>
            <span className="font-display tabular text-base font-extrabold">
              {entry.total_points}
              <span className="ml-1 text-xs font-medium text-ink/50">pts</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
