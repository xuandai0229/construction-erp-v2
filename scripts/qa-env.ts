export function requireQaEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`PARTIAL: Set ${name} before running this QA script.`);
  }
  return value;
}
