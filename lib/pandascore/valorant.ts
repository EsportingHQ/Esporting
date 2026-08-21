import { pandascoreFetch } from "./client";

export type PandaScoreMatch = {
  id: number;
  name: string;
  begin_at: string | null;
  status: string;
  opponents: {
    opponent: {
      name: string;
    } | null;
  }[];
};

export async function getUpcomingValorantMatches(limit = 10) {
  return pandascoreFetch(
    `/valorant/matches/upcoming?per_page=${limit}`,
  ) as Promise<PandaScoreMatch[]>;
}
