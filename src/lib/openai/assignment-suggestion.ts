/**
 * Gợi ý phân công task tự động bằng AI
 * Phân tích task và danh sách candidates để gợi ý top 3 người phù hợp nhất
 */

import { getOpenAIClient, getOpenAIModel } from './client';
import {
  ASSIGNMENT_SUGGESTION_PROMPT,
  createAssignmentUserPrompt,
} from './prompts/system-prompts';

/**
 * Thông tin kỹ năng người dùng
 */
export interface UserSkill {
  ten_ky_nang: string;
  trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nam_kinh_nghiem: number;
}

/**
 * Thông tin candidate cho gợi ý phân công
 */
export interface AssignmentCandidate {
  id: string;
  ten: string;
  email: string;
  avatar_url?: string;
  skills: UserSkill[];
  ty_le_hoan_thanh: number;
  so_task_dang_lam: number;
}

/**
 * Thông tin task để phân tích
 */
export interface TaskForSuggestion {
  ten: string;
  mo_ta?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
}

/**
 * Lý do gợi ý phân công
 */
export interface SuggestionReason {
  chinh: string;
  ky_nang_phu_hop: string[];
  ty_le_hoan_thanh: string;
  khoi_luong_hien_tai: string;
}

/**
 * Kết quả gợi ý phân công từ AI
 */
export interface AssignmentSuggestion {
  nguoi_dung_id: string;
  diem_phu_hop: number;
  ly_do: SuggestionReason;
  // Thêm info user để UI hiển thị
  user?: AssignmentCandidate;
}

/**
 * Response từ hàm goiYPhanCong
 */
export interface SuggestionResult {
  suggestions: AssignmentSuggestion[];
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
 * Gợi ý phân công task bằng AI
 * 
 * @param task - Thông tin task cần phân công
 * @param candidates - Danh sách thành viên có thể phân công
 * @returns Top 3 gợi ý người phù hợp nhất
 */
export async function goiYPhanCong(
  task: TaskForSuggestion,
  candidates: AssignmentCandidate[]
): Promise<SuggestionResult> {
  const startTime = Date.now();
  const model = getOpenAIModel();

  // Nếu không có candidates, return empty
  if (!candidates || candidates.length === 0) {
    return {
      suggestions: [],
      latency_ms: Date.now() - startTime,
      model,
      error: 'Không có thành viên nào để gợi ý',
    };
  }

  try {
    const openai = getOpenAIClient();

    // Tạo user prompt với context
    const userPrompt = createAssignmentUserPrompt({
      taskName: task.ten,
      taskDescription: task.mo_ta,
      taskPriority: getPriorityLabel(task.priority),
      taskDeadline: formatDeadline(task.deadline),
      candidates: candidates.map((c) => ({
        id: c.id,
        ten: c.ten,
        email: c.email,
        skills: c.skills,
        ty_le_hoan_thanh: c.ty_le_hoan_thanh,
        so_task_dang_lam: c.so_task_dang_lam,
      })),
    });

    // Gọi OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ASSIGNMENT_SUGGESTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const latencyMs = Date.now() - startTime;
    const content = completion.choices[0]?.message?.content;

    console.log('[AI Assignment] Raw response:', {
      model,
      latency_ms: latencyMs,
      tokens: completion.usage,
      content_length: content?.length || 0,
      content_preview: content?.substring(0, 500) || 'null',
    });

    if (!content) {
      console.error('[AI Assignment] AI không trả về kết quả');
      return {
        suggestions: [],
        latency_ms: latencyMs,
        model,
        error: 'AI không trả về kết quả',
      };
    }

    // Parse JSON response
    let suggestions: AssignmentSuggestion[];
    let parsed: any;
    try {
      parsed = JSON.parse(content);
      console.log('[AI Assignment] Parsed JSON structure:', {
        type: Array.isArray(parsed) ? 'array' : typeof parsed,
        keys: typeof parsed === 'object' ? Object.keys(parsed) : [],
        is_array: Array.isArray(parsed),
        has_suggestions: !!(parsed.suggestions || parsed.goi_y),
        full_parsed: JSON.stringify(parsed, null, 2).substring(0, 1000),
      });
      
      // AI có thể trả về { suggestions: [...] } hoặc trực tiếp array
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.goi_y || []);
      
      console.log('[AI Assignment] Extracted suggestions:', {
        count: suggestions.length,
        suggestions_preview: suggestions.slice(0, 2),
      });
    } catch (parseError) {
      console.error('[AI Assignment] Lỗi parse AI response:', {
        error: parseError,
        content_preview: content.substring(0, 500),
        full_content: content,
      });
      return {
        suggestions: [],
        latency_ms: latencyMs,
        model,
        error: 'Không thể parse kết quả từ AI',
      };
    }

    // Enrich với user info
    const enrichedSuggestions = suggestions.map((s) => {
      const matchedCandidate = candidates.find((c) => c.id === s.nguoi_dung_id);
      console.log('[AI Assignment] Enriching suggestion:', {
        nguoi_dung_id: s.nguoi_dung_id,
        found_candidate: !!matchedCandidate,
        candidate_name: matchedCandidate?.ten,
      });
      return {
        ...s,
        user: matchedCandidate,
      };
    });

    console.log('[AI Assignment] Final enriched suggestions:', {
      count: enrichedSuggestions.length,
      suggestions: enrichedSuggestions.map(s => ({
        nguoi_dung_id: s.nguoi_dung_id,
        diem_phu_hop: s.diem_phu_hop,
        has_user: !!s.user,
        user_name: s.user?.ten,
      })),
    });

    return {
      suggestions: enrichedSuggestions,
      latency_ms: latencyMs,
      tokens_used: completion.usage
        ? {
            prompt: completion.usage.prompt_tokens,
            completion: completion.usage.completion_tokens,
            total: completion.usage.total_tokens,
          }
        : undefined,
      model,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('Lỗi gọi OpenAI API:', error);

    // Xử lý các loại lỗi cụ thể
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return {
          suggestions: [],
          latency_ms: latencyMs,
          model,
          error: 'Đã vượt giới hạn request. Vui lòng thử lại sau.',
        };
      }
      if (error.message.includes('timeout')) {
        return {
          suggestions: [],
          latency_ms: latencyMs,
          model,
          error: 'Request timeout. Vui lòng thử lại.',
        };
      }
    }

    return {
      suggestions: [],
      latency_ms: latencyMs,
      model,
      error: 'Lỗi kết nối AI. Vui lòng thử lại sau.',
    };
  }
}

/**
 * Thuật toán AI matching thông minh
 * Phân tích kỹ năng, workload, và lịch sử để gợi ý người phù hợp
 */
export function goiYPhanCongAI(
  task: TaskForSuggestion,
  candidates: AssignmentCandidate[]
): AssignmentSuggestion[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  console.log('[AI Algorithm] Starting matching for task:', task.ten);

  // Extract keywords từ task name và description
  const taskText = `${task.ten} ${task.mo_ta || ''}`.toLowerCase();
  const taskKeywords = extractKeywords(taskText);
  
  console.log('[AI Algorithm] Task keywords:', taskKeywords);

  // Tính điểm cho mỗi candidate
  const scored = candidates.map((c) => {
    let score = 0;
    const reasoning = {
      chinh: '',
      ky_nang_phu_hop: [] as string[],
      ty_le_hoan_thanh: `${c.ty_le_hoan_thanh.toFixed(1)}%`,
      khoi_luong_hien_tai: `${c.so_task_dang_lam} tasks`,
    };

    // 1. SKILL MATCHING (0-40 điểm)
    let skillScore = 0;
    const matchedSkills: string[] = [];
    
    c.skills.forEach((skill) => {
      const skillName = skill.ten_ky_nang.toLowerCase();
      const isMatch = taskKeywords.some(keyword => 
        skillName.includes(keyword) || keyword.includes(skillName)
      );
      
      if (isMatch) {
        matchedSkills.push(skill.ten_ky_nang);
        // Điểm dựa trên trình độ
        const proficiencyScore = {
          expert: 15,
          advanced: 12,
          intermediate: 8,
          beginner: 5,
        }[skill.trinh_do] || 5;
        
        // Bonus cho kinh nghiệm
        const experienceBonus = Math.min(skill.nam_kinh_nghiem * 2, 10);
        
        skillScore += proficiencyScore + experienceBonus;
      }
    });

    // Cap skill score at 40
    skillScore = Math.min(skillScore, 40);
    score += skillScore;
    reasoning.ky_nang_phu_hop = matchedSkills;

    // 2. COMPLETION RATE (0-30 điểm)
    let completionScore = 0;
    if (c.ty_le_hoan_thanh >= 90) completionScore = 30;
    else if (c.ty_le_hoan_thanh >= 80) completionScore = 25;
    else if (c.ty_le_hoan_thanh >= 70) completionScore = 20;
    else if (c.ty_le_hoan_thanh >= 60) completionScore = 15;
    else if (c.ty_le_hoan_thanh >= 50) completionScore = 10;
    else completionScore = 5;
    
    score += completionScore;

    // 3. WORKLOAD (0-20 điểm - càng ít task càng cao điểm)
    let workloadScore = 0;
    if (c.so_task_dang_lam === 0) workloadScore = 20;
    else if (c.so_task_dang_lam === 1) workloadScore = 18;
    else if (c.so_task_dang_lam === 2) workloadScore = 15;
    else if (c.so_task_dang_lam === 3) workloadScore = 12;
    else if (c.so_task_dang_lam === 4) workloadScore = 8;
    else if (c.so_task_dang_lam === 5) workloadScore = 5;
    else workloadScore = Math.max(0, 5 - (c.so_task_dang_lam - 5) * 2);
    
    score += workloadScore;

    // 4. PRIORITY ADJUSTMENT (0-10 điểm)
    let priorityScore = 0;
    if (task.priority === 'urgent') {
      // Ưu tiên người có completion rate cao và ít task
      if (c.ty_le_hoan_thanh >= 85 && c.so_task_dang_lam <= 2) {
        priorityScore = 10;
      }
    } else if (task.priority === 'low') {
      // Có thể assign cho người đang học hoặc có nhiều task hơn
      if (c.skills.some(s => s.trinh_do === 'beginner')) {
        priorityScore = 5; // Cơ hội học hỏi
      }
    }
    score += priorityScore;

    // Tạo reasoning message
    const reasons: string[] = [];
    
    if (matchedSkills.length > 0) {
      reasons.push(`Có kỹ năng phù hợp: ${matchedSkills.slice(0, 3).join(', ')}`);
    } else {
      reasons.push('Chưa có kỹ năng cụ thể, nhưng có thể học');
    }
    
    if (c.ty_le_hoan_thanh >= 80) {
      reasons.push(`Tỷ lệ hoàn thành cao (${c.ty_le_hoan_thanh.toFixed(0)}%)`);
    }
    
    if (c.so_task_dang_lam <= 2) {
      reasons.push('Khối lượng công việc ít, có thời gian');
    } else if (c.so_task_dang_lam >= 5) {
      reasons.push(`Đang có nhiều task (${c.so_task_dang_lam})`);
    }

    reasoning.chinh = reasons.join('. ');

    console.log('[AI Algorithm] Candidate scoring:', {
      name: c.ten,
      total_score: score,
      breakdown: {
        skill: skillScore,
        completion: completionScore,
        workload: workloadScore,
        priority: priorityScore,
      },
      matched_skills: matchedSkills,
    });

    return {
      nguoi_dung_id: c.id,
      diem_phu_hop: Math.min(100, score), // Cap at 100
      ly_do: reasoning,
      user: c,
    };
  });

  // Sắp xếp theo điểm và lấy top 3
  const topSuggestions = scored
    .sort((a, b) => b.diem_phu_hop - a.diem_phu_hop)
    .slice(0, 3);

  console.log('[AI Algorithm] Top 3 suggestions:', 
    topSuggestions.map(s => ({
      name: s.user?.ten,
      score: s.diem_phu_hop,
      skills: s.ly_do.ky_nang_phu_hop,
    }))
  );

  return topSuggestions;
}

/**
 * Extract keywords từ text để matching skills
 */
function extractKeywords(text: string): string[] {
  // Common tech keywords và variations
  const keywords = text.match(/\b[\wáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]+\b/gi) || [];
  
  // Filter out common words
  const stopWords = new Set([
    'cho', 'của', 'và', 'là', 'có', 'được', 'này', 'các', 'một', 'trong', 'với',
    'để', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  ]);
  
  return keywords
    .filter(k => k.length > 2 && !stopWords.has(k.toLowerCase()))
    .map(k => k.toLowerCase());
}

// Helper functions
function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    urgent: 'Khẩn cấp',
  };
  return labels[priority] || priority;
}

function formatDeadline(deadline: string): string {
  try {
    return new Date(deadline).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return deadline;
  }
}
