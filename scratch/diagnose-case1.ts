import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnoseCase1() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  try {
    const res = await executeAIChatTurn(
      {
        messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
      },
      {
        userId: admin.id,
        userRole: admin.role,
        currentPath: '/projects',
      },
    );

    console.log("=== SUCCESS CASE 1 RESULT ===");
    console.log("Success:", res.success);
    console.log("Content:\n", res.content);
    console.log("Sources:", res.sources);
    console.log("Tools Executed:", res.toolCallsExecuted);
    console.log("Telemetry:", res.telemetry);
  } catch (e: any) {
    console.error("Case 1 Error:", e);
  }
}

diagnoseCase1().catch(console.error);
