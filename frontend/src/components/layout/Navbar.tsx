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
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Home */}
          <Link href="/" className="text-xl font-bold text-purple-400 hover:text-purple-300 transition-colors">
            Vaarattu.tv
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
