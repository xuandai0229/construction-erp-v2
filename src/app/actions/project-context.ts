"use server";

import { cookies } from 'next/headers';

export async function setProjectContextCookie(projectId: string | null) {
  const cookieStore = await cookies();
  
  if (projectId && projectId !== 'all') {
    cookieStore.set('selectedProjectId', projectId, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
    });
  } else {
    cookieStore.delete('selectedProjectId');
  }
}
