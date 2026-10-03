"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/vods", label: "VODs" },
  { href: "/clips", label: "Clips" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/profiles", label: "Profiles" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:min-h-16">
          {/* Logo / Home */}
          <Link href="/" className="inline-flex min-h-11 items-center text-xl font-bold text-purple-400 hover:text-purple-300 transition-colors">
            Vaarattu.tv
          </Link>

          {/* Navigation Items */}
          <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center justify-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "bg-purple-600 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
