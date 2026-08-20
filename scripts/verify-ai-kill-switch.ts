import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true, override: false });
process.env.AI_READ_ONLY_ENABLED = "true";

async function main() {
  const [{ default: prisma }, { evaluateAIGuards, resetAIGuardRateLimits }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/lib/ai/controller/ai-guard"),
  ]);
  const original = await prisma.systemSetting.findUniqueOrThrow({
    where: { singletonKey: "DEFAULT_SETTINGS" },
    select: { aiReadOnlyEnabled: true },
  });

  try {
    await prisma.systemSetting.update({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      data: { aiReadOnlyEnabled: true },
    });
    resetAIGuardRateLimits();
    const onBefore = await evaluateAIGuards("kill_switch_verification");

    await prisma.systemSetting.update({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      data: { aiReadOnlyEnabled: false },
    });
    resetAIGuardRateLimits();
    const off = await evaluateAIGuards("kill_switch_verification");

    await prisma.systemSetting.update({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      data: { aiReadOnlyEnabled: true },
    });
    resetAIGuardRateLimits();
    const onAfter = await evaluateAIGuards("kill_switch_verification");

    process.stdout.write(JSON.stringify({
      sameProcess: true,
      onBefore: onBefore.allowed,
      off: off.allowed,
      offCode: off.code,
      onAfter: onAfter.allowed,
      passed: onBefore.allowed && !off.allowed && off.code === "FEATURE_DISABLED" && onAfter.allowed,
    }, null, 2));
  } finally {
    await prisma.systemSetting.update({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      data: { aiReadOnlyEnabled: original.aiReadOnlyEnabled },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`Kill-switch verification failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
