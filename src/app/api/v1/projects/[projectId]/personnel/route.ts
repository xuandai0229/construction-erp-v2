import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId } = await params;
    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const assignments = await prisma.employeeProjectAssignment.findMany({
      where: {
        projectId,
        status: 'ACTIVE',
      },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            personalEmail: true,
            phoneNumber: true,
          },
        },
        projectPersonnelRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const items = assignments.map((a) => ({
      assignmentId: a.id,
      employeeId: a.employeeId,
      employeeCode: a.employee?.code,
      fullName: a.employee?.fullName,
      email: a.employee?.personalEmail,
      phone: a.employee?.phoneNumber,
      roleName: a.projectPersonnelRole?.name || 'Cán bộ công trường',
      allocationPercentage: a.allocationPercentage,
      startDate: a.startDate,
      expectedEndDate: a.expectedEndDate,
      assignmentDecisionNo: a.assignmentDecisionNo,
    }));

    return apiList(items);
  } catch (error: any) {
    console.error('[API V1 Project Personnel Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách nhân sự công trình.', 500);
  }
}
