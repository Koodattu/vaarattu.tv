import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Copyright */}
          <div className="text-center md:text-left">
            <Link href="/" className="text-lg font-bold text-purple-400 hover:text-purple-300 transition-colors">
              Vaarattu.tv
            </Link>
            <p className="text-gray-500 text-sm mt-1">© {currentYear} Vaarattu. All rights reserved.</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="https://twitch.tv/vaarattu" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">
              Twitch
            </a>
            <a href="https://twitter.com/vaarattu" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">
              Twitter
            </a>
            <a href="https://discord.gg/vaarattu" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
