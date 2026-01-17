/**
 * Risk Utils - Các hàm tiện ích cho tính toán rủi ro
 */

export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Xác định risk level dựa trên risk score
 * - 0-40: low (xanh lá)
 * - 41-70: medium (vàng)
 * - 71-100: high (đỏ)
 */
export function calculateRiskLevel(riskScore: number): RiskLevel {
  if (riskScore > 70) return 'high';
  if (riskScore > 40) return 'medium';
  return 'low';
}

/**
 * Màu sắc cho từng mức rủi ro
 */
export const RISK_COLORS = {
  low: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    icon: 'text-green-600',
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    icon: 'text-yellow-600',
  },
  high: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: 'text-red-600',
  },
} as const;

/**
 * Label cho từng mức rủi ro
 */
export const RISK_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
} as const;

/**
 * Icon cho từng mức rủi ro (Lucide icon names)
 */
export const RISK_ICONS = {
  low: 'CheckCircle',
  medium: 'AlertTriangle',
  high: 'AlertOctagon',
} as const;

/**
 * Kiểm tra xem task có phải là stale không
 * Task được coi là stale khi:
 * - Trạng thái là in-progress
 * - Không có cập nhật trong 7 ngày
 * - Hoặc progress = 0 và in-progress > 5 ngày
 */
export function isTaskStale(task: {
  trang_thai: string;
  progress: number;
  cap_nhat_cuoi: string;
  ngay_tao: string;
}): boolean {
  if (task.trang_thai !== 'in-progress') return false;
  
  const now = new Date();
  const lastUpdated = new Date(task.cap_nhat_cuoi);
  const daysSinceUpdate = Math.ceil(
    (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Không cập nhật trong 7 ngày
  if (daysSinceUpdate >= 7) return true;
  
  // Progress = 0 và in-progress > 5 ngày
  if (task.progress === 0) {
    const created = new Date(task.ngay_tao);
    const daysInProgress = Math.ceil(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysInProgress > 5) return true;
  }
  
  return false;
}

/**
 * Tính số ngày còn lại đến deadline
 * Trả về số âm nếu đã quá hạn
 */
export function getDaysUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format deadline status text
 */
export function formatDeadlineStatus(deadline: string): string {
  const days = getDaysUntilDeadline(deadline);
  
  if (days < 0) {
    return `Quá hạn ${Math.abs(days)} ngày`;
  } else if (days === 0) {
    return 'Hết hạn hôm nay';
  } else if (days === 1) {
    return 'Còn 1 ngày';
  } else if (days <= 3) {
    return `Còn ${days} ngày`;
  } else {
    return `Còn ${days} ngày`;
  }
}

/**
 * Xác định urgency level dựa trên deadline và progress
 */
export function getUrgencyLevel(deadline: string, progress: number): 'critical' | 'urgent' | 'normal' {
  const days = getDaysUntilDeadline(deadline);
  
  if (days < 0) return 'critical';
  if (days <= 2 && progress < 80) return 'critical';
  if (days <= 5 && progress < 50) return 'urgent';
  
  return 'normal';
}

/**
 * Tạo message thông báo dựa trên risk level
 */
export function createRiskAlertMessage(
  taskName: string,
  riskScore: number,
  riskLevel: RiskLevel
): string {
  switch (riskLevel) {
    case 'high':
      return `⚠️ Task "${taskName}" có ${riskScore}% nguy cơ trễ hạn - Cần xem xét ngay!`;
    case 'medium':
      return `⚡ Task "${taskName}" có ${riskScore}% nguy cơ trễ hạn - Cần theo dõi`;
    case 'low':
    default:
      return `✅ Task "${taskName}" đang tiến triển tốt`;
  }
}

/**
 * Tạo message thông báo cho stale task
 */
export function createStaleTaskMessage(taskName: string, daysSinceUpdate: number): string {
  return `🔔 Task "${taskName}" không có cập nhật trong ${daysSinceUpdate} ngày - Vui lòng cập nhật tiến độ`;
}
