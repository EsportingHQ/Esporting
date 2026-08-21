const BASE_URL = process.env.PANDASCORE_BASE_URL ?? "https://api.pandascore.co";

export async function pandascoreFetch(path: string) {
  const API_KEY = process.env.PANDASCORE_API_KEY;

  if (!API_KEY) {
    throw new Error("Missing PANDASCORE_API_KEY in environment");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`PandaScore ${response.status}: ${await response.text()}`);
  }

  return response.json();
}
