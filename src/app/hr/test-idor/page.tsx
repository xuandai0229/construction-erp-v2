import { notFound } from "next/navigation";
import { Suspense } from "react";
import TestIdorClient from "./test-idor-client";

export const dynamic = "force-dynamic";

export default function TestIdorPage() {
  if (process.env.ENABLE_QA_ROUTES !== "true") {
    notFound();
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">QA IDOR Test Harness</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <TestIdorClient />
      </Suspense>
    </div>
  );
}
