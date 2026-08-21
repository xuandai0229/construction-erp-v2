import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.development' });

const key = process.env.OPENAI_API_KEY;
console.log('System & Dotenv Check:');
console.log('OPENAI_API_KEY is present:', Boolean(key && key.trim().length > 0));
console.log('OPENAI_API_KEY length:', key ? key.trim().length : 0);
