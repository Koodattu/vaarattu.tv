import { TwitchStreamEmbed, TwitchChatEmbed } from "@/components/twitch";
import { RecentVods } from "@/components/home/RecentVods";
import { LeaderboardTeaser } from "@/components/home/LeaderboardTeaser";
import { ClipsTeaser } from "@/components/home/ClipsTeaser";
import { FeaturedViewers } from "@/components/home/FeaturedViewers";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section: Stream + Chat */}
      <section className="bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-4" style={{ height: "calc(100vh - 200px)", minHeight: "500px", maxHeight: "720px" }}>
            {/* Stream Embed */}
            <div className="flex-1 min-w-0">
              <TwitchStreamEmbed channel="vaarattu" />
            </div>

            {/* Chat Embed */}
            <div className="lg:w-80 xl:w-96 h-64 lg:h-auto">
              <TwitchChatEmbed channel="vaarattu" />
            </div>
          </div>
        </div>
      </section>

      {/* Recent VODs Section */}
      <section className="bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <RecentVods />
        </div>
      </section>

      {/* Teasers Section */}
      <section className="bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <LeaderboardTeaser />
            <ClipsTeaser />
          </div>
        </div>
      </section>

      {/* Featured Viewers Section */}
      <section className="bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <FeaturedViewers />
        </div>
      </section>
    </div>
  );
}
