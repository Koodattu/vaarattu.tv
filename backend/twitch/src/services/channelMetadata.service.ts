import { syncChannelPointRewards } from "./channelReward.service";
import { updateAvailableBadges } from "./twitchBadge.service";
import { initializeEmotes } from "./emote.service";
import { runBackgroundTask } from "./backgroundTask";

export function refreshChannelMetadata(): void {
  runBackgroundTask("Channel rewards", syncChannelPointRewards);
  runBackgroundTask("Badges", updateAvailableBadges);
  runBackgroundTask("Emotes", initializeEmotes);
}
