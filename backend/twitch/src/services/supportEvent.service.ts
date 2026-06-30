import { EventSubChannelCheerEvent, EventSubChannelSubscriptionGiftEvent } from "@twurple/eventsub-base";
import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";

async function getEventUserId(userName: string | null, eventName: string): Promise<number | null> {
  if (!userName) return null;

  const user = await upsertUserFromTwitch(userName);
  if (!user) {
    console.warn(`[${eventName}] User not found, storing event without a user relation: ${userName}`);
    return null;
  }

  return user.id;
}

export async function processSubscriptionGiftEvent(event: EventSubChannelSubscriptionGiftEvent) {
  const userId = event.isAnonymous ? null : await getEventUserId(event.gifterName, "SubscriptionGift");

  await prisma.subscriptionGift.create({
    data: {
      userId,
      amount: event.amount,
      cumulativeAmount: event.cumulativeAmount,
      tier: event.tier,
      isAnonymous: event.isAnonymous,
      timestamp: new Date(),
    },
  });

  const gifter = event.gifterName ?? "anonymous";
  console.log(`[SubscriptionGift] Processed ${event.amount} gifted sub(s) from ${gifter}: Tier ${event.tier}`);
}

export async function processCheerEvent(event: EventSubChannelCheerEvent) {
  const userId = event.isAnonymous ? null : await getEventUserId(event.userName, "Cheer");

  await prisma.cheer.create({
    data: {
      userId,
      bits: event.bits,
      message: event.message || null,
      isAnonymous: event.isAnonymous,
      timestamp: new Date(),
    },
  });

  const userName = event.userName ?? "anonymous";
  console.log(`[Cheer] Processed ${event.bits} bits from ${userName}`);
}
