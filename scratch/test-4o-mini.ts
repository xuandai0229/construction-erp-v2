import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check4oMini() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    }),
  });

  console.log("gpt-4o-mini status:", res.status);
  const data = await res.json().catch(() => null);
  console.log("Details:", data);
}

check4oMini().catch(console.error);
