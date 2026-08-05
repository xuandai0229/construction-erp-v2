"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { deactivateOrgUnitAction } from "@/app/hr/organization/actions/organization-actions";

export default function TestIdorClient() {
  const searchParams = useSearchParams();
  const unitId = searchParams.get("unitId");
  const [result, setResult] = useState<any>(null);

  const handleDeactivate = async () => {
    if (!unitId) return;
    try {
      const res = await deactivateOrgUnitAction(unitId);
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }
  };

  return (
    <div>
      <p>Target Unit ID: {unitId}</p>
      <button
        id="deactivate-btn"
        onClick={handleDeactivate}
        className="px-4 py-2 bg-red-600 text-white rounded mt-4"
      >
        Vô hiệu hóa (Deactivate)
      </button>

      {result && (
        <div id="result-box" className="mt-4 p-4 border rounded">
          {JSON.stringify(result)}
        </div>
      )}
    </div>
  );
}
