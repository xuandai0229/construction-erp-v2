import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import { generateHrExcelReportBuffer, HrReportFilters } from "@/lib/hr/reporting-service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập hệ thống." }, { status: 401 });
  }

  // Check read/export permission
  const permCheck = await checkHrPermission("hr:project_assignment:read");
  if (!permCheck.allowed) {
    return NextResponse.json(
      { error: permCheck.reason || "Bạn không có quyền truy cập hoặc xuất báo cáo nhân sự." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filters: HrReportFilters = {
    dateStart: searchParams.get("dateStart") || undefined,
    dateEnd: searchParams.get("dateEnd") || undefined,
    orgUnitId: searchParams.get("orgUnitId") || undefined,
    projectId: searchParams.get("projectId") || undefined,
    projectRoleId: searchParams.get("projectRoleId") || undefined,
    employeeStatus: searchParams.get("employeeStatus") || undefined,
    assignmentStatus: searchParams.get("assignmentStatus") || undefined,
    searchQuery: searchParams.get("searchQuery") || undefined,
    kpiFilter: searchParams.get("kpiFilter") || undefined,
  };

  try {
    const buffer = await generateHrExcelReportBuffer(permCheck.context, permCheck.scope, filters);

    const timestamp = Date.now();
    const dateTag = filters.dateStart ? filters.dateStart.replace(/-/g, "") : "Toan_bo";
    const filename = `Bao_cao_nhan_su_${dateTag}_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[HR Report Export Route Error]", error);
    return NextResponse.json(
      { error: "Lỗi xuất báo cáo Excel: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
