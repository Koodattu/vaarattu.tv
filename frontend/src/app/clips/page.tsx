import Link from "next/link";

export default function ClipsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Clips</h1>
        <p className="text-gray-400">Watch the best moments from Vaarattu&apos;s streams</p>
      </div>

      {/* Placeholder content */}
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6">The clips page is under construction. Check back soon!</p>
        <Link href="/" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
