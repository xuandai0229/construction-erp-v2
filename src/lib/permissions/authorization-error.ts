import { PermissionDeniedError } from "./permission-resolver";

export type ClientAuthorizationError = {
  code: "FORBIDDEN" | "UNAUTHORIZED";
  message: string;
};

/** Never serialize policy, membership, project, or permission metadata to a client. */
export function mapAuthorizationErrorForClient(error: unknown): ClientAuthorizationError | null {
  if (error instanceof PermissionDeniedError) {
    return { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này." };
  }
  if (error instanceof Error && /unauthenticated|unauthorized|chưa đăng nhập/i.test(error.message)) {
    return { code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." };
  }
  return null;
}
