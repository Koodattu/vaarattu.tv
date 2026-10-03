"use client";

import { useSyncExternalStore } from "react";

// The host is constant for a document; the empty server snapshot keeps hydration consistent.
const subscribe = () => () => {};
const getHostname = () => window.location.hostname;
const getServerHostname = () => "";

export function useHostname() {
  return useSyncExternalStore(subscribe, getHostname, getServerHostname);
}
