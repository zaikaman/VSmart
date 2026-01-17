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

    // 1. SKILL MATCHING (0-50 điểm) - tăng trọng số vì skills rất quan trọng
    let skillScore = 0;
    const matchedSkills: string[] = [];
    
    c.skills.forEach((skill) => {
      const skillName = skill.ten_ky_nang.toLowerCase();
      const skillWords = skillName.split(/[\s\-_.]+/); // Split skill name thành từng word
      
      // Check match với nhiều cách
      const isMatch = taskKeywords.some(keyword => {
        // Exact or partial match
        if (skillName.includes(keyword) || keyword.includes(skillName)) return true;
        
        // Word-level match
        if (skillWords.some(sw => sw.includes(keyword) || keyword.includes(sw))) return true;
        
        // Fuzzy match - check if first 3+ chars match
        if (keyword.length >= 3 && skillName.startsWith(keyword.substring(0, 3))) return true;
        if (skillName.length >= 3 && keyword.startsWith(skillName.substring(0, 3))) return true;
        
        return false;
      });
      
      if (isMatch) {
        matchedSkills.push(skill.ten_ky_nang);
        // Điểm dựa trên trình độ
        const proficiencyScore = {
          expert: 18,
          advanced: 14,
          intermediate: 10,
          beginner: 6,
        }[skill.trinh_do] || 6;
        
        // Bonus cho kinh nghiệm (max 12 điểm)
        const experienceBonus = Math.min(skill.nam_kinh_nghiem * 2, 12);
        
        skillScore += proficiencyScore + experienceBonus;
      }
    });

    // Cap skill score at 50
    skillScore = Math.min(skillScore, 50);
    score += skillScore;
    reasoning.ky_nang_phu_hop = matchedSkills;

    // 2. COMPLETION RATE (0-25 điểm)
    let completionScore = 0;
    if (c.ty_le_hoan_thanh >= 90) completionScore = 25;
    else if (c.ty_le_hoan_thanh >= 80) completionScore = 20;
    else if (c.ty_le_hoan_thanh >= 70) completionScore = 16;
    else if (c.ty_le_hoan_thanh >= 60) completionScore = 12;
    else if (c.ty_le_hoan_thanh >= 50) completionScore = 8;
    else completionScore = 4;
    
    score += completionScore;

    // 3. WORKLOAD (0-15 điểm - càng ít task càng cao điểm)
    let workloadScore = 0;
    if (c.so_task_dang_lam === 0) workloadScore = 15;
    else if (c.so_task_dang_lam === 1) workloadScore = 13;
    else if (c.so_task_dang_lam === 2) workloadScore = 11;
    else if (c.so_task_dang_lam === 3) workloadScore = 9;
    else if (c.so_task_dang_lam === 4) workloadScore = 6;
    else if (c.so_task_dang_lam === 5) workloadScore = 3;
    else workloadScore = Math.max(0, 3 - (c.so_task_dang_lam - 5));
    
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
 * Cải thiện với tech keywords phổ biến và synonyms
 */
function extractKeywords(text: string): string[] {
  // Common tech keywords và variations
  const keywords = text.match(/\b[\wáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ.#+-]+\b/gi) || [];
  
  // Filter out common words
  const stopWords = new Set([
    'cho', 'của', 'và', 'là', 'có', 'được', 'này', 'các', 'một', 'trong', 'với',
    'để', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'cần', 'làm', 'thực', 'hiện', 'công', 'việc', 'task', 'tạo', 'xây', 'dựng',
    'phát', 'triển', 'cập', 'nhật', 'sửa', 'lỗi', 'fix', 'bug', 'feature', 'implement',
  ]);
  
  const extractedKeywords = keywords
    .filter(k => k.length > 1 && !stopWords.has(k.toLowerCase()))
    .map(k => k.toLowerCase());

  // Thêm các synonyms và categories
  const techSynonyms: Record<string, string[]> = {
    // Frontend
    'frontend': ['react', 'vue', 'angular', 'nextjs', 'next.js', 'html', 'css', 'javascript', 'typescript'],
    'giao diện': ['frontend', 'ui', 'ux', 'css', 'html'],
    'ui': ['css', 'tailwind', 'figma', 'design'],
    'ux': ['design', 'figma', 'ui'],
    'react': ['frontend', 'javascript', 'typescript', 'next.js'],
    'vue': ['frontend', 'javascript', 'vue.js'],
    'angular': ['frontend', 'typescript'],
    
    // Backend
    'backend': ['node', 'python', 'java', 'go', 'api', 'server', 'database'],
    'server': ['backend', 'node', 'python', 'api'],
    'api': ['backend', 'rest', 'graphql', 'node', 'python'],
    'node': ['javascript', 'backend', 'express', 'node.js'],
    'python': ['backend', 'fastapi', 'django', 'flask'],
    'java': ['backend', 'spring', 'spring boot'],
    
    // Database
    'database': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'supabase'],
    'sql': ['database', 'postgresql', 'mysql'],
    'nosql': ['mongodb', 'redis', 'database'],
    'postgresql': ['sql', 'database', 'postgres'],
    'mongodb': ['nosql', 'database'],
    
    // DevOps
    'devops': ['docker', 'kubernetes', 'ci/cd', 'aws', 'cloud', 'linux'],
    'cloud': ['aws', 'azure', 'gcp', 'google cloud'],
    'docker': ['devops', 'kubernetes', 'container'],
    'deploy': ['devops', 'ci/cd', 'docker'],
    
    // AI/ML
    'ai': ['machine learning', 'deep learning', 'python', 'tensorflow', 'pytorch', 'openai'],
    'ml': ['machine learning', 'python', 'tensorflow', 'pytorch'],
    'machine learning': ['python', 'tensorflow', 'pytorch', 'ai'],
    'chatbot': ['ai', 'nlp', 'openai', 'langchain'],
    
    // Mobile
    'mobile': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
    'ios': ['swift', 'mobile', 'apple'],
    'android': ['kotlin', 'java', 'mobile'],
    
    // Testing
    'test': ['testing', 'jest', 'cypress', 'unittest'],
    'testing': ['jest', 'cypress', 'selenium', 'qa'],
    
    // Security
    'bảo mật': ['security', 'authentication', 'authorization'],
    'security': ['authentication', 'authorization', 'encryption'],
    
    // Performance
    'tối ưu': ['performance', 'optimization'],
    'performance': ['optimization', 'caching', 'redis'],
  };

  // Expand keywords với synonyms
  const expandedKeywords = new Set(extractedKeywords);
  extractedKeywords.forEach(keyword => {
    // Check direct match
    if (techSynonyms[keyword]) {
      techSynonyms[keyword].forEach(syn => expandedKeywords.add(syn));
    }
    
    // Check partial match
    Object.entries(techSynonyms).forEach(([key, values]) => {
      if (keyword.includes(key) || key.includes(keyword)) {
        values.forEach(syn => expandedKeywords.add(syn));
        expandedKeywords.add(key);
      }
    });
  });

  return Array.from(expandedKeywords);
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
