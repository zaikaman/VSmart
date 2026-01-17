/**
 * Dự báo rủi ro trễ hạn bằng AI
 * Phân tích task và assignee để đánh giá nguy cơ trễ hạn
 */

import { getOpenAIClient, getOpenAIModel } from './client';
import {
  RISK_PREDICTION_PROMPT,
  createRiskPredictionUserPrompt,
} from './prompts/system-prompts';

/**
 * Thông tin assignee cho phân tích rủi ro
 */
export interface RiskAssigneeInfo {
  ten: string;
  ty_le_hoan_thanh: number;
  so_task_dang_lam: number;
}

/**
 * Thông tin task để phân tích rủi ro
 */
export interface TaskForRiskAnalysis {
  id: string;
  ten: string;
  mo_ta?: string;
  trang_thai: string;
  progress: number;
  deadline: string;
  ngay_tao: string;
  assignee?: RiskAssigneeInfo;
}

/**
 * Kết quả dự báo rủi ro
 */
export interface RiskPredictionResult {
  task_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  ly_do: string;
  goi_y: string[];
}

/**
 * Response từ hàm duBaoRuiRo
 */
export interface RiskPredictionResponse {
  result: RiskPredictionResult | null;
  latency_ms: number;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  error?: string;
}

/**
 * Tính số ngày task đã ở trạng thái in-progress
 */
function calculateDaysInProgress(task: TaskForRiskAnalysis): number {
  if (task.trang_thai !== 'in-progress') return 0;
  
  // Ước lượng: dựa trên ngày tạo task
  const created = new Date(task.ngay_tao);
  const now = new Date();
  const days = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Tính toán risk score cơ bản (không dùng AI) - dùng làm fallback
 */
export function calculateBasicRiskScore(task: TaskForRiskAnalysis): RiskPredictionResult {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const created = new Date(task.ngay_tao);
  
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  
  let riskScore = 0;
  const reasons: string[] = [];
  const suggestions: string[] = [];
  
  // Factor 1: Thời gian còn lại vs progress (35%)
  if (totalDays > 0) {
    const expectedProgress = (daysElapsed / totalDays) * 100;
    const progressGap = expectedProgress - task.progress;
    
    if (progressGap > 30) {
      riskScore += 35;
      reasons.push('Progress chậm hơn kỳ vọng đáng kể');
      suggestions.push('Cần tăng tốc hoặc phân bổ thêm nguồn lực');
    } else if (progressGap > 15) {
      riskScore += 20;
      reasons.push('Progress chậm hơn kỳ vọng');
    } else if (progressGap > 0) {
      riskScore += 10;
    }
  }
  
  // Factor 2: Deadline gần (30%)
  if (daysRemaining <= 0) {
    riskScore += 30;
    reasons.push('Đã quá hạn');
    suggestions.push('Cần gia hạn deadline hoặc đánh giá lại phạm vi công việc');
  } else if (daysRemaining <= 2 && task.progress < 80) {
    riskScore += 25;
    reasons.push('Deadline gấp, progress chưa đủ');
    suggestions.push('Ưu tiên tối đa cho task này');
  } else if (daysRemaining <= 5 && task.progress < 50) {
    riskScore += 18;
    reasons.push('Deadline còn ít ngày');
  }
  
  // Factor 3: Task in-progress nhưng không có progress (20%)
  const daysInProgress = calculateDaysInProgress(task);
  if (task.trang_thai === 'in-progress' && task.progress === 0 && daysInProgress > 3) {
    riskScore += 20;
    reasons.push(`In-progress ${daysInProgress} ngày mà chưa có progress`);
    suggestions.push('Kiểm tra xem có blockers không và hỗ trợ assignee');
  } else if (task.trang_thai === 'in-progress' && task.progress < 20 && daysInProgress > 5) {
    riskScore += 12;
    reasons.push('Progress rất chậm');
  }
  
  // Factor 4: Không có assignee (15%)
  if (!task.assignee) {
    riskScore += 15;
    reasons.push('Chưa có người được giao');
    suggestions.push('Phân công ngay cho thành viên phù hợp');
  } else if (task.assignee.ty_le_hoan_thanh < 70) {
    riskScore += 8;
    reasons.push('Assignee có tỷ lệ hoàn thành thấp');
    suggestions.push('Cân nhắc hỗ trợ hoặc phân công lại');
  }
  
  // Factor 5: Task đã done thì không có risk
  if (task.trang_thai === 'done') {
    riskScore = 0;
  }
  
  // Giới hạn score
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // Xác định risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (riskScore > 70) {
    riskLevel = 'high';
  } else if (riskScore > 40) {
    riskLevel = 'medium';
  }
  
  return {
    task_id: task.id,
    risk_score: riskScore,
    risk_level: riskLevel,
    ly_do: reasons.length > 0 ? reasons.join('. ') : 'Task đang tiến triển tốt',
    goi_y: suggestions,
  };
}

/**
 * Dự báo rủi ro trễ hạn bằng AI
 * 
 * @param task - Thông tin task cần phân tích
 * @returns Kết quả dự báo rủi ro
 */
export async function duBaoRuiRo(
  task: TaskForRiskAnalysis
): Promise<RiskPredictionResponse> {
  const startTime = Date.now();
  const model = getOpenAIModel();
  
  // Task đã done không cần phân tích
  if (task.trang_thai === 'done') {
    return {
      result: {
        task_id: task.id,
        risk_score: 0,
        risk_level: 'low',
        ly_do: 'Task đã hoàn thành',
        goi_y: [],
      },
      latency_ms: Date.now() - startTime,
      model,
    };
  }
  
  try {
    const client = getOpenAIClient();
    const daysInProgress = calculateDaysInProgress(task);
    
    const userPrompt = createRiskPredictionUserPrompt({
      taskName: task.ten,
      taskDescription: task.mo_ta,
      taskStatus: task.trang_thai,
      taskProgress: task.progress,
      taskDeadline: task.deadline,
      taskCreatedAt: task.ngay_tao,
      daysInProgress,
      assignee: task.assignee,
    });
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: RISK_PREDICTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      // Fallback to basic calculation
      const basicResult = calculateBasicRiskScore(task);
      return {
        result: basicResult,
        latency_ms: Date.now() - startTime,
        model,
        error: 'AI không trả về kết quả, sử dụng tính toán cơ bản',
      };
    }
    
    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Validate và normalize
    const riskScore = Math.min(100, Math.max(0, parseInt(parsed.risk_score) || 0));
    let riskLevel: 'low' | 'medium' | 'high' = parsed.risk_level;
    
    // Đảm bảo risk_level khớp với risk_score
    if (riskScore > 70) {
      riskLevel = 'high';
    } else if (riskScore > 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    const result: RiskPredictionResult = {
      task_id: task.id,
      risk_score: riskScore,
      risk_level: riskLevel,
      ly_do: parsed.ly_do || 'Không có lý do',
      goi_y: Array.isArray(parsed.goi_y) ? parsed.goi_y : (parsed.goi_y ? [parsed.goi_y] : []),
    };
    
    return {
      result,
      latency_ms: Date.now() - startTime,
      tokens_used: response.usage ? {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      } : undefined,
      model,
    };
    
  } catch (error) {
    console.error('Lỗi khi dự báo rủi ro bằng AI:', error);
    
    // Fallback to basic calculation
    const basicResult = calculateBasicRiskScore(task);
    
    return {
      result: basicResult,
      latency_ms: Date.now() - startTime,
      model,
      error: `Lỗi AI: ${error instanceof Error ? error.message : 'Unknown error'}. Sử dụng tính toán cơ bản.`,
    };
  }
}

/**
 * Dự báo rủi ro cho nhiều tasks cùng lúc (batch)
 * Sử dụng basic calculation để tránh rate limit
 */
export function duBaoRuiRoBatch(
  tasks: TaskForRiskAnalysis[]
): RiskPredictionResult[] {
  return tasks.map(task => calculateBasicRiskScore(task));
}
