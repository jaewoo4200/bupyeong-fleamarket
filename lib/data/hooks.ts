"use client";

import { useSyncExternalStore } from "react";
import { getStore } from "./store";
import type { AppData, EventConfig, Seller } from "./types";

export function useStore() {
  return getStore();
}

export function useAppData(): AppData {
  const store = getStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useCurrentEvent(): EventConfig | undefined {
  const data = useAppData();
  return data.events.find((e) => e.id === data.currentEventId) ?? data.events[0];
}

export function useSellers(eventId: string | undefined): Seller[] {
  const data = useAppData();
  if (!eventId) return [];
  return data.sellers.filter((s) => s.eventId === eventId).sort((a, b) => a.seq - b.seq);
}
