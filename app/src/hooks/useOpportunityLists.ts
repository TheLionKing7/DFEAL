"use client";

import { useCallback, useEffect, useState } from "react";

export type ListType = "track" | "favorite";

export interface ListItem {
  opportunity_id: string;
  title?: string;
  agency_name?: string | null;
  response_deadline?: string | null;
  fit_score?: number | null;
}

const LS_KEY = "dfeal:opportunity-lists";

function readLocal(): Record<ListType, string[]> {
  if (typeof window === "undefined") return { track: [], favorite: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { track: [], favorite: [] };
    const parsed = JSON.parse(raw) as Record<ListType, string[]>;
    return { track: parsed.track ?? [], favorite: parsed.favorite ?? [] };
  } catch {
    return { track: [], favorite: [] };
  }
}

function writeLocal(data: Record<ListType, string[]>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function useOpportunityLists() {
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [trackItems, setTrackItems] = useState<ListItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [trackRes, favRes] = await Promise.all([
        fetch("/api/user-lists?type=track"),
        fetch("/api/user-lists?type=favorite"),
      ]);

      const trackJson = (await trackRes.json()) as { items?: ListItem[]; storage?: string };
      const favJson = (await favRes.json()) as { items?: ListItem[]; storage?: string };

      if (trackJson.storage === "database" && trackRes.ok) {
        setTrackItems(trackJson.items ?? []);
        setTrackIds((trackJson.items ?? []).map((i) => i.opportunity_id));
      } else {
        const local = readLocal();
        setTrackIds(local.track);
        setTrackItems(local.track.map((id) => ({ opportunity_id: id })));
      }

      if (favJson.storage === "database" && favRes.ok) {
        setFavoriteItems(favJson.items ?? []);
        setFavoriteIds((favJson.items ?? []).map((i) => i.opportunity_id));
      } else {
        const local = readLocal();
        setFavoriteIds(local.favorite);
        setFavoriteItems(local.favorite.map((id) => ({ opportunity_id: id })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleList = useCallback(
    async (opportunityId: string, listType: ListType) => {
      const ids = listType === "track" ? trackIds : favoriteIds;
      const isOn = ids.includes(opportunityId);

      if (isOn) {
        const res = await fetch(
          `/api/user-lists?opportunity_id=${encodeURIComponent(opportunityId)}&type=${listType}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const local = readLocal();
          local[listType] = local[listType].filter((id) => id !== opportunityId);
          writeLocal(local);
        }
      } else {
        const res = await fetch("/api/user-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunity_id: opportunityId, list_type: listType }),
        });
        if (!res.ok) {
          const local = readLocal();
          if (!local[listType].includes(opportunityId)) {
            local[listType].unshift(opportunityId);
            writeLocal(local);
          }
        }
      }
      await refresh();
    },
    [trackIds, favoriteIds, refresh],
  );

  const createPursuit = useCallback(async (opportunityId: string) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: opportunityId }),
    });
  }, []);

  return {
    trackIds,
    favoriteIds,
    trackItems,
    favoriteItems,
    loading,
    refresh,
    toggleList,
    createPursuit,
    isTracked: (id: string) => trackIds.includes(id),
    isFavorite: (id: string) => favoriteIds.includes(id),
  };
}
