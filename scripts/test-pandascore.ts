import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import { pandascoreFetch } from "../lib/pandascore/client";

async function main() {
  const matches = await pandascoreFetch(
    "/valorant/matches/upcoming?per_page=3",
  );

  console.log("Upcoming Valorant matches:");
  for (const match of matches) {
    console.log("-", match.name, "|", match.begin_at);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
