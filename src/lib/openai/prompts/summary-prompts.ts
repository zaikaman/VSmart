import type { InsightDataset } from '../insight-context';

function compactDataset(dataset: InsightDataset) {
  return {
    generated_at: dataset.generated_at,
    summary: dataset.summary,
    top_risks: dataset.high_risk_tasks.slice(0, 5).map((task) => ({
      id: task.id,
      ten: task.ten,
      deadline: task.deadline,
      risk_score: task.risk_score,
      progress: task.progress,
      assignee_name: task.assignee_name,
      project_name: task.project_name,
    })),
    overloaded_members: dataset.workload.members
      .filter((member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched')
      .slice(0, 5)
      .map((member) => ({
        userId: member.userId,
        ten: member.ten,
        loadStatus: member.loadStatus,
        loadRatio: member.loadRatio,
        activeTasks: member.activeTasks,
        overdueTasks: member.overdueTasks,
        dueSoonTasks: member.dueSoonTasks,
      })),
    risky_projects: dataset.forecasts.slice(0, 5).map((project) => ({
      id: project.project.id,
      ten: project.project.ten,
      forecastStatus: project.forecastStatus,
      slipProbability: project.slipProbability,
      projectedDelayDays: project.projectedDelayDays,
      reasons: project.reasons.slice(0, 3),
    })),
    recently_completed_tasks: dataset.recently_completed_tasks.slice(0, 6).map((task) => ({
      id: task.id,
      ten: task.ten,
      project_name: task.project_name,
      completed_at: task.cap_nhat_cuoi,
    })),
    due_soon_tasks: dataset.due_soon_tasks.slice(0, 6).map((task) => ({
      id: task.id,
      ten: task.ten,
      deadline: task.deadline,
      priority: task.priority,
      assignee_name: task.assignee_name,
      project_name: task.project_name,
    })),
  };
}

export const DAILY_SUMMARY_PROMPT = `Bạn là lớp điều phối AI của VSmart.

Nhiệm vụ:
- Tóm tắt tình hình trong ngày cho quản lý hoặc trưởng nhóm.
- Chỉ ra 3-5 điểm đáng chú ý nhất.
- Nhấn vào rủi ro, quá tải, blockers và hành động nên làm ngay.

Định dạng JSON:
{
  "headline": "Câu mở ngắn gọn, giàu tín hiệu",
  "tone": "on-track | watch | critical",
  "summary": "2-3 câu tóm tắt toàn cảnh",
  "top_risks": [
    {
      "title": "Tên task hoặc tín hiệu",
      "detail": "Vì sao cần chú ý",
      "severity": "low | medium | high"
    }
  ],
  "workload_alerts": [
    {
      "member_name": "Tên thành viên",
      "detail": "Tình trạng tải",
      "severity": "medium | high"
    }
  ],
  "recommended_actions": ["Hành động 1", "Hành động 2"],
  "executive_brief": ["Ý 1", "Ý 2", "Ý 3"]
}

Nguyên tắc:
- Chỉ trả về JSON hợp lệ.
- Không viết kiểu báo cáo nội bộ.
- Viết ngắn, rõ, dùng tiếng Việt tự nhiên.`;

export const WEEKLY_SUMMARY_PROMPT = `Bạn đang tạo bản tóm tắt tuần cho VSmart.

Định dạng JSON:
{
  "headline": "Nhịp độ của tuần",
  "summary": "2-3 câu tổng quan",
  "wins": ["Điểm tích cực 1", "Điểm tích cực 2"],
  "watchouts": ["Điểm cần theo dõi 1", "Điểm cần theo dõi 2"],
  "next_focus": ["Ưu tiên tuần tới 1", "Ưu tiên tuần tới 2", "Ưu tiên tuần tới 3"]
}

Nguyên tắc:
- Chỉ trả về JSON hợp lệ.
- Cân bằng giữa tiến độ đạt được và các tín hiệu trễ nhịp.
- Dùng tiếng Việt tự nhiên, không vòng vo.`;

export const REBALANCE_PROMPT = `Bạn là trợ lý điều phối nguồn lực cho VSmart.

Nhiệm vụ:
- Đề xuất chuyển task từ người đang quá tải sang người còn sức chứa tốt hơn.
- Chỉ gợi ý khi có lợi thực sự.
- Ưu tiên giảm rủi ro trễ và giảm dồn tải.

Định dạng JSON:
{
  "overview": "1-2 câu mô tả tình trạng tải hiện tại",
  "suggestions": [
    {
      "task_id": "uuid",
      "task_name": "Tên task",
      "from_user_id": "uuid",
      "from_user_name": "Tên người giao lại",
      "to_user_id": "uuid",
      "to_user_name": "Tên người nhận",
      "reason": "Lý do điều phối",
      "impact": "Tác động dự kiến",
      "confidence": 0-100
    }
  ]
}

Nguyên tắc:
- Chỉ trả về JSON hợp lệ.
- Không đề xuất chuyển task đã done.
- Không đề xuất chuyển task nếu người nhận đang quá tải ngang hoặc nặng hơn người giao.`;

export const DEADLINE_REVIEW_PROMPT = `Bạn là trợ lý lập kế hoạch của VSmart.

Nhiệm vụ:
- Đánh giá deadline có hợp lý hay không.
- Nếu deadline quá gắt, đề xuất ngày hợp lý hơn.

Định dạng JSON:
{
  "is_reasonable": true,
  "warning_level": "none | watch | high",
  "ly_do": "Giải thích ngắn gọn",
  "goi_y": ["Gợi ý 1", "Gợi ý 2"],
  "suggested_deadline": "ISO date hoặc null"
}

Nguyên tắc:
- Chỉ trả về JSON hợp lệ.
- Cân nhắc độ ưu tiên, độ phức tạp ẩn trong tên/mô tả và thời gian còn lại.`;

export const MEETING_SUMMARY_PROMPT = `Bạn là thư ký AI cho VSmart.

Nhiệm vụ:
- Tóm tắt nhanh nội dung họp hoặc standup.
- Tách rõ quyết định, blockers và việc cần làm tiếp.

Định dạng JSON:
{
  "summary": "2-3 câu tóm tắt",
  "decisions": ["Quyết định 1"],
  "blockers": ["Blocker 1"],
  "action_items": [
    {
      "title": "Việc cần làm",
      "owner": "Người phụ trách hoặc null",
      "due_hint": "Mốc thời gian nếu có hoặc null"
    }
  ],
  "follow_ups": ["Điểm cần theo tiếp 1"]
}

Nguyên tắc:
- Chỉ trả về JSON hợp lệ.
- Giữ văn phong rõ, gọn, có thể dùng ngay sau cuộc họp.`;

export function createDailySummaryUserPrompt(dataset: InsightDataset) {
  return `Dữ liệu hiện tại:
${JSON.stringify(compactDataset(dataset), null, 2)}

Hãy tạo bản tóm tắt đầu ngày cho người quản lý.`;
}

export function createWeeklySummaryUserPrompt(dataset: InsightDataset) {
  return `Dữ liệu tổng hợp của tuần:
${JSON.stringify(compactDataset(dataset), null, 2)}

Hãy tạo bản tóm tắt tuần có cả điểm tốt, điểm cần theo dõi và trọng tâm tuần tới.`;
}

export function createRebalanceUserPrompt(dataset: InsightDataset) {
  return `Dữ liệu tải hiện tại:
${JSON.stringify(
    {
      summary: dataset.summary,
      workload: dataset.workload.members.slice(0, 8).map((member) => ({
        userId: member.userId,
        ten: member.ten,
        loadStatus: member.loadStatus,
        loadRatio: member.loadRatio,
        activeTasks: member.activeTasks,
        tasks: member.tasks.slice(0, 6).map((task) => ({
          id: task.id,
          ten: task.ten,
          deadline: task.deadline,
          priority: task.priority,
          progress: task.progress,
          risk_score: task.risk_score,
        })),
      })),
      dueSoonTasks: dataset.due_soon_tasks.slice(0, 8),
      highRiskTasks: dataset.high_risk_tasks.slice(0, 8),
    },
    null,
    2
  )}

Hãy đề xuất rebalance thực tế, ít nhưng đáng giá.`;
}

export function createDeadlineReviewUserPrompt(params: {
  ten: string;
  mo_ta?: string;
  priority: string;
  deadline: string;
  projectName?: string | null;
}) {
  return `Task:
${JSON.stringify(params, null, 2)}

Hãy đánh giá deadline này có quá gắt hay không và đề xuất ngày hợp lý hơn nếu cần.`;
}

export function createMeetingSummaryUserPrompt(params: {
  notes: string;
  projectName?: string | null;
  context?: InsightDataset | null;
}) {
  return `Ngữ cảnh:
${JSON.stringify(
    {
      projectName: params.projectName || null,
      summary: params.context?.summary || null,
      topRisks:
        params.context?.high_risk_tasks.slice(0, 3).map((task) => ({
          ten: task.ten,
          project_name: task.project_name,
          risk_score: task.risk_score,
        })) || [],
    },
    null,
    2
  )}

Ghi chú cuộc họp:
${params.notes}`;
}
