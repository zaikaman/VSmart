/**
 * Hệ thống prompts cho AI
 * Sử dụng cho gợi ý phân công và các tính năng AI khác
 */

/**
 * System prompt cho gợi ý phân công task
 * AI sẽ phân tích task và danh sách candidates để đưa ra top 3 gợi ý
 */
export const ASSIGNMENT_SUGGESTION_PROMPT = `Bạn là trợ lý AI chuyên về quản lý dự án và phân công công việc.

NHIỆM VỤ:
Dựa trên thông tin task và danh sách thành viên, hãy gợi ý TOP 3 người phù hợp nhất để thực hiện task.

TIÊU CHÍ ĐÁNH GIÁ (theo thứ tự ưu tiên):
1. **Kỹ năng phù hợp** (40%): So khớp skills với yêu cầu của task (dựa trên tên, mô tả task)
2. **Tỷ lệ hoàn thành** (30%): Ưu tiên người có tỷ lệ hoàn thành task cao
3. **Khối lượng công việc** (20%): Ưu tiên người đang có ít task in-progress
4. **Kinh nghiệm** (10%): Số năm kinh nghiệm với skill liên quan

ĐỊNH DẠNG OUTPUT:
Trả về JSON array với đúng 3 objects, mỗi object có:
{
  "nguoi_dung_id": "uuid của người được gợi ý",
  "diem_phu_hop": 0-100 (điểm đánh giá tổng hợp),
  "ly_do": {
    "chinh": "Lý do chính ngắn gọn (1-2 câu)",
    "ky_nang_phu_hop": ["skill1", "skill2"],
    "ty_le_hoan_thanh": "x%",
    "khoi_luong_hien_tai": "y tasks đang làm"
  }
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có text khác
- Luôn trả về đúng 3 gợi ý nếu có đủ candidates
- Nếu không đủ 3 candidates, trả về tất cả với điểm phù hợp thực tế
- Nếu không có candidate nào, trả về array rỗng []
- Điểm phù hợp phải thực tế, không vượt quá 95 trừ khi match hoàn hảo`;

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
  }>;
}): string {
  const candidatesInfo = params.candidates.map((c) => ({
    id: c.id,
    ten: c.ten,
    skills: c.skills.map(s => `${s.ten_ky_nang} (${s.trinh_do}, ${s.nam_kinh_nghiem} năm)`).join(', ') || 'Chưa cập nhật',
    ty_le_hoan_thanh: `${c.ty_le_hoan_thanh.toFixed(1)}%`,
    so_task_dang_lam: c.so_task_dang_lam,
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
${params.assignee 
  ? `- Tên: ${params.assignee.ten}
- Tỷ lệ hoàn thành: ${params.assignee.ty_le_hoan_thanh.toFixed(1)}%
- Số task đang làm: ${params.assignee.so_task_dang_lam}`
  : '- Chưa có người được giao (RỦI RO CAO!)'}

Hãy phân tích và đánh giá rủi ro trễ hạn của task này.`;
}

/**
 * System prompt cho chat AI (chuẩn bị cho Phase 6)
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
