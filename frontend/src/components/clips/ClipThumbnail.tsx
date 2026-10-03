"use client";

import Image from "next/image";
import { useState } from "react";

export function ClipThumbnail({ src, eager = false }: { src: string | null; eager?: boolean }) {
  const [failed, setFailed] = useState<string>();
  return src && failed !== src ? <Image src={src} alt="" fill unoptimized loading={eager ? "eager" : "lazy"} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover" onError={() => setFailed(src)} />
    : <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg></div>;
}
