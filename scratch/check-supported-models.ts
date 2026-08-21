import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSupportedModels() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  
  const generateModels = data.models?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
  console.log('Models supporting generateContent:');
  for (const m of generateModels?.slice(0, 15) || []) {
    console.log(`  - Name: "${m.name}" | Display: "${m.displayName}"`);
  }
}

checkSupportedModels().catch(console.error);
