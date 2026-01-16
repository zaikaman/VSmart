/**
 * Calculate Progress Utilities
 * Auto-calculate phan_tram_hoan_thanh cho PhanDuAn và DuAn
 */

interface Task {
  id: string;
  trangThai: string;
  progress: number;
}

interface PhanDuAn {
  id: string;
  tasks?: Task[];
}

interface DuAn {
  id: string;
  phan_du_an?: PhanDuAn[];
}

/**
 * Tính phần trăm hoàn thành của một Phần Dự Án dựa trên tasks
 * - Tasks "done" = 100%
 * - Tasks "in-progress" = progress%
 * - Tasks "todo" = 0%
 * 
 * @param tasks - Danh sách tasks trong phần dự án
 * @returns Phần trăm hoàn thành (0-100)
 */
export function calculatePhanDuAnProgress(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const totalProgress = tasks.reduce((sum, task) => {
    switch (task.trangThai) {
      case 'done':
        return sum + 100;
      case 'in-progress':
        return sum + (task.progress || 0);
      case 'todo':
      default:
        return sum + 0;
    }
  }, 0);

  return Math.round((totalProgress / tasks.length) * 100) / 100;
}

/**
 * Tính phần trăm hoàn thành của Dự Án dựa trên các phần dự án
 * - Trung bình của phan_tram_hoan_thanh của tất cả phần dự án
 * 
 * @param phanDuAn - Danh sách phần dự án với progress của chúng
 * @returns Phần trăm hoàn thành (0-100)
 */
export function calculateDuAnProgress(phanDuAn: Array<{ phanTramHoanThanh: number }>): number {
  if (!phanDuAn || phanDuAn.length === 0) return 0;

  const totalProgress = phanDuAn.reduce(
    (sum, part) => sum + (part.phanTramHoanThanh || 0),
    0
  );

  return Math.round((totalProgress / phanDuAn.length) * 100) / 100;
}

/**
 * Format progress thành chuỗi hiển thị
 * 
 * @param progress - Phần trăm hoàn thành (0-100)
 * @returns Chuỗi format "XX.XX%"
 */
export function formatProgress(progress: number): string {
  return `${progress.toFixed(2)}%`;
}

/**
 * Xác định trạng thái màu dựa trên progress và deadline
 * 
 * @param progress - Phần trăm hoàn thành
 * @param deadline - Ngày hết hạn
 * @returns Màu sắc: 'green' | 'yellow' | 'red'
 */
export function getProgressColor(progress: number, deadline?: Date | string): string {
  if (progress >= 100) return 'green';

  if (deadline) {
    const now = new Date();
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline < 0) {
      // Quá hạn
      return 'red';
    } else if (daysUntilDeadline <= 3 && progress < 80) {
      // Gần hạn nhưng progress thấp
      return 'red';
    } else if (daysUntilDeadline <= 7 && progress < 50) {
      // 1 tuần nữa hết hạn, progress < 50%
      return 'yellow';
    }
  }

  if (progress >= 70) return 'green';
  if (progress >= 30) return 'yellow';
  return 'red';
}

/**
 * Tính expected progress dựa trên deadline
 * - Nếu hôm nay là 50% thời gian → expected progress = 50%
 * 
 * @param startDate - Ngày bắt đầu
 * @param deadline - Ngày hết hạn
 * @returns Expected progress (0-100)
 */
export function calculateExpectedProgress(
  startDate: Date | string,
  deadline: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;

  return Math.round((elapsed / totalDuration) * 100);
}
