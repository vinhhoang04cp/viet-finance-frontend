import { Lock } from "lucide-react";

/** Hiển thị khi vai trò hiện tại (vd VIEWER) không có quyền dùng trang/chức năng này. */
export function AccessDenied({
  message = "Bạn chỉ có quyền xem. Chức năng này dành cho Chủ sở hữu hoặc Kế toán.",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
