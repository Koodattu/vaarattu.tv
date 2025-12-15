import Link from "next/link";

interface VodDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VodDetailPage({ params }: VodDetailPageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/vods" className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to VODs
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">VOD #{id}</h1>
        <p className="text-gray-400">Stream details and viewer timeline</p>
      </div>

      {/* Placeholder content */}
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">📺</div>
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6">VOD details page is under construction. Check back soon!</p>
        <Link href="/vods" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
          Back to VODs
        </Link>
      </div>
    </div>
  );
}
