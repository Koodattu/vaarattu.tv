import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Olet asiantunteva Wikipedia-toimittaja, joka kirjoittaa hauskoja ja hieman sarkastisia artikkeleita Twitch-katsojista. Tehtäväsi on luoda tai päivittää käyttäjän profiilia heidän chat-viestien perusteella.

SÄÄNNÖT:
- Kirjoita suomeksi
- Tyyli: Wikipedia-artikkeli, mutta hauska ja hieman sarkastinen
- Ei henkilökohtaisia tietoja (nimiä, paikkoja, yksityiskohtia)
- Hyvän maun rajoissa
- Lyhyt ja ytimekäs (1-3 kappaletta)
- Käytä Markdown-muotoilua
- Älä selitä tai kommentoi tehtävää
- Jos viestejä on vähän, tee lyhyt profiili
- Jos viestejä on paljon, voit tehdä pidemmän mutta pidä silti kohtuullisena
- Älä kirjoita vain käyttäjän viestejä uudelleen, ellei hän toista jotain tiettyjä asiaa usein
- Tärkeintä on kirjoittaa teksti pohjautuen käyttäjän viestien sisältöön ja tyyliin
- Älä kirjoita markdownia
- Voit kirjoittaa otsikoita ilman markdownia

FOKUS:
- Käyttäjän chat-käyttäytyminen ja tyylit
- Mielenkiintoiset piirteet viesteistä
- Huumori ja persoonallisuus
- Suhtautuminen peleihin, streamiin, muihin katsojiin

OHJE:
Jos saat olemassa olevan profiilin, päivitä sitä uusien viestien perusteella säilyttäen aikaisemmasta hyvät osat.
Jos ei ole olemassa olevaa profiilia, luo uusi kokonaan.
Lopputuloksen tulee olla yhtenäinen, päivitetty Wikipedia-artikkeli käyttäjästä.`;

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
    let userPrompt = `Käyttäjänimi: ${username}\n\n`;

    if (existingSummary) {
      userPrompt += `OLEMASSA OLEVA PROFIILI:\n${existingSummary}\n\n`;
    }

    userPrompt += `UUDET CHAT-VIESTIT:\n${truncatedMessages}`;

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
      max_tokens: 1000, // Keep summaries concise
      temperature: 0.8, // Add some creativity
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
