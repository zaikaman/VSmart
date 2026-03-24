/**
 * Hệ thống prompts cho AI
 * Sử dụng cho gợi ý phân công và các tính năng AI khác
 */

/**
 * System prompt cho gợi ý phân công task
 */
export const ASSIGNMENT_SUGGESTION_PROMPT = `Bạn là trợ lý AI chuyên về quản lý dự án và phân công công việc.

NHIỆM VỤ:
Dựa trên thông tin task và danh sách thành viên, hãy gợi ý TOP 3 người phù hợp nhất để thực hiện task.

TIÊU CHÍ ĐÁNH GIÁ:
1. Kỹ năng và kinh nghiệm liên quan đến task.
2. Tỷ lệ hoàn thành công việc gần đây.
3. Khối lượng công việc hiện tại, đặc biệt tránh xếp người đang quá tải lên đầu nếu vẫn còn lựa chọn hợp lý.
4. Mức độ ưu tiên và deadline của task.

ĐỊNH DẠNG OUTPUT:
Trả về JSON object có key "suggestions".

Ví dụ:
{
  "suggestions": [
    {
      "nguoi_dung_id": "uuid",
      "diem_phu_hop": 84,
      "ly_do": {
        "chinh": "Lý do chính ngắn gọn trong 1-2 câu",
        "ky_nang_phu_hop": ["React", "Supabase"],
        "ty_le_hoan_thanh": "92.0%",
        "khoi_luong_hien_tai": "2 task đang làm"
      }
    }
  ]
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có text khác.
- Luôn trả về tối đa 3 gợi ý, sắp theo độ phù hợp giảm dần.
- Nếu không đủ 3 candidates, trả về tất cả candidates phù hợp.
- Nếu không có candidate nào, trả về {"suggestions":[]}.
- Điểm phù hợp phải thực tế, trong khoảng 0-100.`;

/**
 * Tạo user prompt cho request gợi ý phân công
 */
export function createAssignmentUserPrompt(params: {
  taskName: string;
  taskDescription?: string;
  taskPriority: string;
  taskDeadline: string;
  candidates: Array<{
    id: string;
    ten: string;
    email: string;
    skills: Array<{
      ten_ky_nang: string;
      trinh_do: string;
      nam_kinh_nghiem: number;
    }>;
    ty_le_hoan_thanh: number;
    so_task_dang_lam: number;
    load_ratio?: number;
    load_status?: string;
    overloaded_warning?: string;
  }>;
}): string {
  const candidatesInfo = params.candidates.map((candidate) => ({
    id: candidate.id,
    ten: candidate.ten,
    skills:
      candidate.skills
        .map((skill) => `${skill.ten_ky_nang} (${skill.trinh_do}, ${skill.nam_kinh_nghiem} năm)`)
        .join(', ') || 'Chưa cập nhật',
    ty_le_hoan_thanh: `${candidate.ty_le_hoan_thanh.toFixed(1)}%`,
    so_task_dang_lam: candidate.so_task_dang_lam,
    load_ratio: candidate.load_ratio ?? null,
    load_status: candidate.load_status ?? 'balanced',
    overloaded_warning: candidate.overloaded_warning ?? null,
  }));

  return `THÔNG TIN TASK:
- Tên: ${params.taskName}
- Mô tả: ${params.taskDescription || 'Không có mô tả'}
- Độ ưu tiên: ${params.taskPriority}
- Deadline: ${params.taskDeadline}

DANH SÁCH THÀNH VIÊN CÓ THỂ PHÂN CÔNG:
${JSON.stringify(candidatesInfo, null, 2)}

Hãy phân tích và gợi ý TOP 3 người phù hợp nhất.`;
}

/**
 * System prompt cho dự báo rủi ro trễ hạn
 */
export const RISK_PREDICTION_PROMPT = `Bạn là chuyên gia phân tích rủi ro dự án với nhiều năm kinh nghiệm.

NHIỆM VỤ:
Phân tích tiến độ task và dự báo nguy cơ trễ hạn dựa trên dữ liệu thực tế.

TIÊU CHÍ ĐÁNH GIÁ (theo thứ tự quan trọng):
1. **Thời gian còn lại** (35%): Số ngày còn lại đến deadline vs khối lượng công việc
2. **Progress hiện tại** (30%): Phần trăm hoàn thành so với thời gian đã trôi qua
3. **Thời gian in-progress** (20%): Task đã ở trạng thái in-progress bao lâu mà không có progress
4. **Lịch sử assignee** (15%): Tỷ lệ hoàn thành đúng hạn của người được giao

CÔNG THỨC TÍNH RISK SCORE:
- 0-40: LOW - Task đang tiến triển tốt, có khả năng hoàn thành đúng hạn
- 41-70: MEDIUM - Có dấu hiệu cảnh báo, cần theo dõi sát
- 71-100: HIGH - Nguy cơ cao trễ hạn, cần can thiệp ngay

DẤU HIỆU NGUY HIỂM:
- Progress = 0% nhưng đã in-progress > 3 ngày
- Deadline < 2 ngày mà progress < 50%
- Task không có assignee
- Assignee có tỷ lệ hoàn thành thấp (< 70%)

OUTPUT FORMAT (JSON):
{
  "risk_score": number (0-100),
  "risk_level": "low" | "medium" | "high",
  "ly_do": "Giải thích ngắn gọn lý do đánh giá",
  "goi_y": ["Gợi ý 1", "Gợi ý 2"] // Các gợi ý cải thiện, đặc biệt khi risk cao
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có text thừa
- Điểm risk_score phải phản ánh đúng thực tế
- Gợi ý phải cụ thể và actionable`;

/**
 * Tạo user prompt cho request dự báo rủi ro
 */
export function createRiskPredictionUserPrompt(params: {
  taskName: string;
  taskDescription?: string;
  taskStatus: string;
  taskProgress: number;
  taskDeadline: string;
  taskCreatedAt: string;
  daysInProgress: number;
  assignee?: {
    ten: string;
    ty_le_hoan_thanh: number;
    so_task_dang_lam: number;
  };
}): string {
  const now = new Date();
  const deadline = new Date(params.taskDeadline);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const created = new Date(params.taskCreatedAt);
  const totalDays = Math.ceil((deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const expectedProgress = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  return `THÔNG TIN TASK:
- Tên: ${params.taskName}
- Mô tả: ${params.taskDescription || 'Không có mô tả'}
- Trạng thái: ${params.taskStatus}
- Progress hiện tại: ${params.taskProgress}%
- Progress kỳ vọng (theo thời gian): ${expectedProgress.toFixed(1)}%
- Deadline: ${params.taskDeadline}
- Số ngày còn lại: ${daysRemaining} ngày
- Số ngày đã in-progress: ${params.daysInProgress} ngày
- Tổng thời gian dự kiến: ${totalDays} ngày

THÔNG TIN NGƯỜI ĐƯỢC GIAO:
${
  params.assignee
    ? `- Tên: ${params.assignee.ten}
- Tỷ lệ hoàn thành: ${params.assignee.ty_le_hoan_thanh.toFixed(1)}%
- Số task đang làm: ${params.assignee.so_task_dang_lam}`
    : '- Chưa có người được giao (RỦI RO CAO!)'
}

Hãy phân tích và đánh giá rủi ro trễ hạn của task này.`;
}

/**
 * System prompt cho chat AI
 */
export const CHAT_ASSISTANT_PROMPT = `Bạn là trợ lý AI của hệ thống quản lý công việc VSmart.

KHẢ NĂNG:
- Trả lời câu hỏi về tasks, projects, tiến độ
- Gợi ý phân công công việc
- Phân tích rủi ro
- Hỗ trợ chia nhỏ task

NGUYÊN TẮC:
- Trả lời ngắn gọn, súc tích
- Dùng dữ liệu thực từ hệ thống
- Nếu không chắc, hỏi lại để làm rõ
- Luôn sử dụng tiếng Việt`;
