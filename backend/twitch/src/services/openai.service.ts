import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Olet satiirinen Wikipedia-toimittaja, joka kirjoittaa huvittavia, liioiteltuja ja absurdeja henkilökuvia Twitch-chatin vakiokävijöistä. Analysoit käyttäjän viestejä löytääksesi persoonallisuuspiirteitä, mutta ET KOSKAAN lainaa tai toista viestejä suoraan.

EHDOTTOMAT KIELLOT:
- ÄLÄ KOSKAAN lainaa käyttäjän viestejä (ei "*viesti*", ei "kuten hän sanoi")
- ÄLÄ listaa mitä käyttäjä on sanonut
- ÄLÄ käytä lainausmerkkejä viestien toistamiseen
- ÄLÄ kirjoita "hänen kommenttinsa kuten..." tai vastaavia
- ÄLÄ paljasta henkilökohtaisia tietoja

TYYLI:
- Satiirinen, liioiteltu Wikipedia-artikkeli
- Kuvittele käyttäjä legendaarisena hahmona chatin historiassa
- Käytä absurdia huumoria ja metaforia
- Keksi hauska "titteli" tai "rooli" käyttäjälle (esim. "Chatin virallinen skeptikko", "Emote-reaktioiden mestari")
- Kirjoita kuin käyttäjä olisi kuuluisa henkilö, josta kirjoitetaan jälkipolville

MITÄ ETSIÄ VIESTEISTÄ (mutta älä lainaa):
- Kirjoitustyyli: käyttääkö paljon emojeja, capslockkia, lyhyitä vai pitkiä viestejä?
- Persoonallisuus: optimisti, pessimisti, trollaaja, auttaja, lurkkari?
- Kiinnostuksen kohteet: pelit, anime, musiikki, draama?
- Suhtautuminen: miten reagoi streamiin, peleihin, muihin chattereihin?
- Toistuvat teemat: valittaako, kehuuko, kyseleekö, kommentoiko?

RAKENNE:
1. Avauslause: Kuka tämä legenda on? (hauska titteli/rooli)
2. Keskiosa: Persoonallisuuspiirteet ja käyttäytyminen chatissa (EI lainauksia)
3. Lopetus: Hauska yhteenveto tai "perintö" chatin historiassa

PITUUS: 2-4 lyhyttä kappaletta. Laatu > määrä.

PÄIVITYS: Jos saat olemassa olevan profiilin, säilytä parhaat osat ja rikasta uusilla havainnoilla. Älä toista samoja asioita.`;

/**
 * Generate or update an AI summary for a user based on their chat messages
 */
export async function generateOrUpdateAISummary(
  username: string,
  existingSummary: string | null,
  newMessages: Array<{ content: string; timestamp: Date }>
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[OpenAI] API key not found in environment variables");
    return null;
  }

  if (newMessages.length === 0) {
    console.log("[OpenAI] No new messages provided");
    return existingSummary;
  }

  try {
    // Prepare new messages for the prompt
    const newMessageTexts = newMessages.map((msg) => msg.content).join("\n");

    // Limit message content to avoid token limits (approximately 3000 tokens worth of messages)
    const truncatedMessages = newMessageTexts.length > 12000 ? newMessageTexts.substring(0, 12000) + "\n...(viestit katkaistu)" : newMessageTexts;

    console.log(
      `[OpenAI] ${existingSummary ? "Updating" : "Creating"} AI summary for ${username} with ${newMessages.length} new messages (${truncatedMessages.length} characters)`
    );

    // Build the user prompt
    let userPrompt = `KÄYTTÄJÄ: ${username}\n\n`;

    if (existingSummary) {
      userPrompt += `NYKYINEN PROFIILI (säilytä parhaat osat, älä toista):\n${existingSummary}\n\n`;
    }

    userPrompt += `ANALYSOITAVAT VIESTIT (älä lainaa näitä, vaan analysoi persoonallisuutta):\n${truncatedMessages}\n\n`;

    userPrompt += `MUISTUTUS: Kirjoita satiirinen henkilökuva. ÄLÄ lainaa viestejä. Keskity persoonallisuuteen ja hauskaan kuvaukseen.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 1000, // Concise but room for good content
      temperature: 0.7, // Creative but more consistent
    });

    const aiSummary = completion.choices[0]?.message?.content?.trim();

    if (!aiSummary) {
      console.error("[OpenAI] No content returned from OpenAI");
      return null;
    }

    console.log(`[OpenAI] Successfully ${existingSummary ? "updated" : "generated"} AI summary for ${username} (${aiSummary.length} characters)`);
    return aiSummary;
  } catch (error) {
    console.error("[OpenAI] Error generating AI summary:", error);

    // Handle rate limits gracefully
    if (error instanceof Error && error.message.includes("rate_limit")) {
      console.log("[OpenAI] Rate limit hit, will retry later");
      return null;
    }

    // Handle other API errors
    if (error instanceof Error && error.message.includes("quota")) {
      console.log("[OpenAI] Quota exceeded, AI summaries temporarily disabled");
      return null;
    }

    return null;
  }
}

/**
 * Test the OpenAI connection and API key
 */
export async function testOpenAIConnection(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[OpenAI] API key not found in environment variables");
    return false;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Test message",
        },
      ],
      max_tokens: 5,
    });

    console.log("[OpenAI] Connection test successful");
    return true;
  } catch (error) {
    console.error("[OpenAI] Connection test failed:", error);
    return false;
  }
}
