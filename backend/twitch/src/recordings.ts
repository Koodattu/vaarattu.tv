import dotenv from "dotenv";
dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : "../.env", quiet: true });
import { readFile } from "node:fs/promises";
import prisma from "./prismaClient";
import { recordingReport, setRecordingParts, syncYoutubeCatalog } from "./services/youtube.service";

async function main() {
  const [command, id, file] = process.argv.slice(2);
  if (command === "sync" && (id === undefined || id === "--catalog-only") && file === undefined) {
    console.log(JSON.stringify(await syncYoutubeCatalog(id !== "--catalog-only"), null, 2));
  } else if (command === "report" && (id === undefined || /^[1-9]\d*$/.test(id)) && file === undefined) {
    const report = await recordingReport();
    console.log(JSON.stringify(id ? report.filter((item) => item.streamId === Number(id)) : report, null, 2));
  } else if (command === "set" && id && file) {
    await setRecordingParts(Number(id), JSON.parse(await readFile(file, "utf8")));
    console.log(`Saved recording parts for stream ${id}. Future automatic matches are locked for this stream.`);
  } else {
    throw new Error("Usage: recordings sync [--catalog-only] | report [streamId] | set <streamId> <parts.json>. Use [] to remove and block a stream's current matches.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Recording command failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
