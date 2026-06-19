function requireQaEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`PARTIAL: Set ${name} before running this QA script.`);
  }
  return value;
}

module.exports = { requireQaEnv };
