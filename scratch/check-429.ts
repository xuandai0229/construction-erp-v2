import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check429Detail() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  
  const payload = {
    model: "gpt-5.6-terra",
    messages: [{ role: "user", content: "hello" }],
    reasoning_effort: "medium",
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json().catch(() => null);
  console.log("OpenAI API response payload:", JSON.stringify(data, null, 2));
}

check429Detail().catch(console.error);
