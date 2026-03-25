import { createPreferredChatCompletion, getPreferredAIModel } from './client';
import {
  ASSIGNMENT_SUGGESTION_PROMPT,
  createAssignmentUserPrompt,
} from './prompts/system-prompts';

export interface UserSkill {
  ten_ky_nang: string;
  trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nam_kinh_nghiem: number;
}

export interface AssignmentCandidate {
  id: string;
  ten: string;
  email: string;
  avatar_url?: string;
  skills: UserSkill[];
  ty_le_hoan_thanh: number;
  so_task_dang_lam: number;
  load_ratio?: number;
  load_status?: 'available' | 'balanced' | 'stretched' | 'overloaded';
  overloaded_warning?: string;
}

export interface TaskForSuggestion {
  ten: string;
  mo_ta?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
}

export interface SuggestionReason {
  chinh: string;
  ky_nang_phu_hop: string[];
  ty_le_hoan_thanh: string;
  khoi_luong_hien_tai: string;
}

export interface AssignmentSuggestion {
  nguoi_dung_id: string;
  diem_phu_hop: number;
  ly_do: SuggestionReason;
  user?: AssignmentCandidate;
}

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

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatCompletionRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCurrentLoad(candidate: AssignmentCandidate): string {
  if (candidate.overloaded_warning) {
    return `${candidate.overloaded_warning} • ${candidate.so_task_dang_lam} task`;
  }

  return `${candidate.so_task_dang_lam} task`;
}

function normalizeReason(
  reason: Partial<SuggestionReason> | null | undefined,
  candidate: AssignmentCandidate
): SuggestionReason {
  return {
    chinh:
      typeof reason?.chinh === 'string' && reason.chinh.trim()
        ? reason.chinh.trim()
        : `${candidate.ten} phù hợp với yêu cầu hiện tại của task.`,
    ky_nang_phu_hop: Array.isArray(reason?.ky_nang_phu_hop)
      ? reason.ky_nang_phu_hop.filter(
          (skill): skill is string => typeof skill === 'string' && skill.trim().length > 0
        )
      : [],
    ty_le_hoan_thanh:
      typeof reason?.ty_le_hoan_thanh === 'string' && reason.ty_le_hoan_thanh.trim()
        ? reason.ty_le_hoan_thanh.trim()
        : formatCompletionRate(candidate.ty_le_hoan_thanh),
    khoi_luong_hien_tai:
      typeof reason?.khoi_luong_hien_tai === 'string' && reason.khoi_luong_hien_tai.trim()
        ? reason.khoi_luong_hien_tai.trim()
        : formatCurrentLoad(candidate),
  };
}

function normalizeAiSuggestions(
  rawSuggestions: unknown,
  candidates: AssignmentCandidate[]
): AssignmentSuggestion[] {
  if (!Array.isArray(rawSuggestions)) {
    return [];
  }

  const suggestions: AssignmentSuggestion[] = [];
  const seen = new Set<string>();

  rawSuggestions.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const candidateId =
      typeof item.nguoi_dung_id === 'string'
        ? item.nguoi_dung_id
        : typeof item.id === 'string'
          ? item.id
          : null;

    if (!candidateId || seen.has(candidateId)) {
      return;
    }

    const candidate = candidates.find((entry) => entry.id === candidateId);
    if (!candidate) {
      return;
    }

    const rawScore =
      typeof item.diem_phu_hop === 'number'
        ? item.diem_phu_hop
        : typeof item.score === 'number'
          ? item.score
          : candidate.ty_le_hoan_thanh;

    suggestions.push({
      nguoi_dung_id: candidateId,
      diem_phu_hop: clampScore(rawScore),
      ly_do: normalizeReason(
        (item.ly_do as Partial<SuggestionReason> | null | undefined) ||
          (item.reason as Partial<SuggestionReason> | null | undefined),
        candidate
      ),
      user: candidate,
    });
    seen.add(candidateId);
  });

  return suggestions.slice(0, 3);
}

function createFallbackResult(
  task: TaskForSuggestion,
  candidates: AssignmentCandidate[],
  startTime: number,
  error: string
): SuggestionResult {
  return {
    suggestions: goiYPhanCongAI(task, candidates),
    latency_ms: Date.now() - startTime,
    model: 'fallback',
    error,
  };
}

export async function goiYPhanCong(
  task: TaskForSuggestion,
  candidates: AssignmentCandidate[]
): Promise<SuggestionResult> {
  const startTime = Date.now();
  const model = getPreferredAIModel();

  if (!candidates || candidates.length === 0) {
    return {
      suggestions: [],
      latency_ms: Date.now() - startTime,
      model,
      error: 'Không có thành viên nào để gợi ý',
    };
  }

  try {
    const userPrompt = createAssignmentUserPrompt({
      taskName: task.ten,
      taskDescription: task.mo_ta,
      taskPriority: getPriorityLabel(task.priority),
      taskDeadline: formatDeadline(task.deadline),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        ten: candidate.ten,
        email: candidate.email,
        skills: candidate.skills,
        ty_le_hoan_thanh: candidate.ty_le_hoan_thanh,
        so_task_dang_lam: candidate.so_task_dang_lam,
        load_ratio: candidate.load_ratio,
        load_status: candidate.load_status,
        overloaded_warning: candidate.overloaded_warning,
      })),
    });

    const completion = await createPreferredChatCompletion({
      messages: [
        { role: 'system', content: ASSIGNMENT_SUGGESTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: 'json_object',
    });

    const latencyMs = Date.now() - startTime;
    const content = completion.content;
    const actualModel = completion.model;

    console.log('[AI Assignment] Raw response:', {
      model: actualModel,
      latency_ms: latencyMs,
      provider: completion.provider,
      tokens: completion.usage,
      content_length: content?.length || 0,
      content_preview: content?.substring(0, 500) || 'null',
    });

    if (!content) {
      return createFallbackResult(
        task,
        candidates,
        startTime,
        'AI không trả về dữ liệu, đã chuyển sang gợi ý dự phòng.'
      );
    }

    try {
      const parsed = JSON.parse(content) as
        | { suggestions?: unknown; goi_y?: unknown }
        | unknown[];
      const rawSuggestions = Array.isArray(parsed)
        ? parsed
        : parsed.suggestions || parsed.goi_y || [];
      const suggestions = normalizeAiSuggestions(rawSuggestions, candidates);

      console.log('[AI Assignment] Parsed suggestions:', {
        count: suggestions.length,
        suggestions: suggestions.map((suggestion) => ({
          nguoi_dung_id: suggestion.nguoi_dung_id,
          diem_phu_hop: suggestion.diem_phu_hop,
          user_name: suggestion.user?.ten,
        })),
      });

      if (suggestions.length === 0) {
        return createFallbackResult(
          task,
          candidates,
          startTime,
          'AI trả về dữ liệu không hợp lệ, đã dùng gợi ý dự phòng.'
        );
      }

      return {
        suggestions,
        latency_ms: latencyMs,
        tokens_used: completion.usage
          ? {
              prompt: completion.usage.prompt,
              completion: completion.usage.completion,
              total: completion.usage.total,
            }
          : undefined,
        model: actualModel,
      };
    } catch (parseError) {
      console.error('[AI Assignment] Parse error:', {
        error: parseError,
        content_preview: content.substring(0, 500),
      });

      return createFallbackResult(
        task,
        candidates,
        startTime,
        'Không thể đọc phản hồi từ AI, đã chuyển sang gợi ý dự phòng.'
      );
    }
  } catch (error) {
    console.error('[AI Assignment] AI error:', error);

    if (error instanceof Error && error.message.includes('rate limit')) {
      return createFallbackResult(
        task,
        candidates,
        startTime,
        'AI đang bận, đã chuyển sang gợi ý dự phòng.'
      );
    }

    if (error instanceof Error && error.message.includes('timeout')) {
      return createFallbackResult(
        task,
        candidates,
        startTime,
        'AI phản hồi quá chậm, đã chuyển sang gợi ý dự phòng.'
      );
    }

    return createFallbackResult(
      task,
      candidates,
      startTime,
      'Không thể kết nối AI, đã dùng gợi ý dự phòng.'
    );
  }
}

export function goiYPhanCongAI(
  task: TaskForSuggestion,
  candidates: AssignmentCandidate[]
): AssignmentSuggestion[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  console.log('[AI Algorithm] Starting matching for task:', task.ten);

  const taskText = `${task.ten} ${task.mo_ta || ''}`.toLowerCase();
  const taskKeywords = extractKeywords(taskText);

  console.log('[AI Algorithm] Task keywords:', taskKeywords);

  const scored = candidates.map((candidate) => {
    let score = 0;
    const reasoning = {
      chinh: '',
      ky_nang_phu_hop: [] as string[],
      ty_le_hoan_thanh: `${candidate.ty_le_hoan_thanh.toFixed(1)}%`,
      khoi_luong_hien_tai: `${candidate.so_task_dang_lam} tasks`,
    };

    let skillScore = 0;
    const matchedSkills: string[] = [];

    candidate.skills.forEach((skill) => {
      const skillName = skill.ten_ky_nang.toLowerCase();
      const skillWords = skillName.split(/[\s\-_.]+/);

      const isMatch = taskKeywords.some((keyword) => {
        if (skillName.includes(keyword) || keyword.includes(skillName)) return true;
        if (skillWords.some((skillWord) => skillWord.includes(keyword) || keyword.includes(skillWord)))
          return true;
        if (keyword.length >= 3 && skillName.startsWith(keyword.substring(0, 3))) return true;
        if (skillName.length >= 3 && keyword.startsWith(skillName.substring(0, 3))) return true;

        return false;
      });

      if (isMatch) {
        matchedSkills.push(skill.ten_ky_nang);

        const proficiencyScore =
          {
            expert: 18,
            advanced: 14,
            intermediate: 10,
            beginner: 6,
          }[skill.trinh_do] || 6;

        const experienceBonus = Math.min(skill.nam_kinh_nghiem * 2, 12);
        skillScore += proficiencyScore + experienceBonus;
      }
    });

    skillScore = Math.min(skillScore, 50);
    score += skillScore;
    reasoning.ky_nang_phu_hop = matchedSkills;

    let completionScore = 0;
    if (candidate.ty_le_hoan_thanh >= 90) completionScore = 25;
    else if (candidate.ty_le_hoan_thanh >= 80) completionScore = 20;
    else if (candidate.ty_le_hoan_thanh >= 70) completionScore = 16;
    else if (candidate.ty_le_hoan_thanh >= 60) completionScore = 12;
    else if (candidate.ty_le_hoan_thanh >= 50) completionScore = 8;
    else completionScore = 4;

    score += completionScore;

    let workloadScore = 0;
    if (candidate.so_task_dang_lam === 0) workloadScore = 15;
    else if (candidate.so_task_dang_lam === 1) workloadScore = 13;
    else if (candidate.so_task_dang_lam === 2) workloadScore = 11;
    else if (candidate.so_task_dang_lam === 3) workloadScore = 9;
    else if (candidate.so_task_dang_lam === 4) workloadScore = 6;
    else if (candidate.so_task_dang_lam === 5) workloadScore = 3;
    else workloadScore = Math.max(0, 3 - (candidate.so_task_dang_lam - 5));

    score += workloadScore;

    let priorityScore = 0;
    if (task.priority === 'urgent') {
      if (candidate.ty_le_hoan_thanh >= 85 && candidate.so_task_dang_lam <= 2) {
        priorityScore = 10;
      }
    } else if (task.priority === 'low') {
      if (candidate.skills.some((skill) => skill.trinh_do === 'beginner')) {
        priorityScore = 5;
      }
    }
    score += priorityScore;

    const reasons: string[] = [];

    if (matchedSkills.length > 0) {
      reasons.push(`Có kỹ năng phù hợp: ${matchedSkills.slice(0, 3).join(', ')}`);
    } else {
      reasons.push('Chưa có kỹ năng cụ thể, nhưng có thể học');
    }

    if (candidate.ty_le_hoan_thanh >= 80) {
      reasons.push(`Tỷ lệ hoàn thành cao (${candidate.ty_le_hoan_thanh.toFixed(0)}%)`);
    }

    if (candidate.so_task_dang_lam <= 2) {
      reasons.push('Khối lượng công việc ít, còn thời gian');
    } else if (candidate.so_task_dang_lam >= 5) {
      reasons.push(`Đang có nhiều task (${candidate.so_task_dang_lam})`);
    }

    reasoning.chinh = reasons.join('. ');

    console.log('[AI Algorithm] Candidate scoring:', {
      name: candidate.ten,
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
      nguoi_dung_id: candidate.id,
      diem_phu_hop: Math.min(100, score),
      ly_do: reasoning,
      user: candidate,
    };
  });

  const topSuggestions = scored.sort((a, b) => b.diem_phu_hop - a.diem_phu_hop).slice(0, 3);

  console.log(
    '[AI Algorithm] Top 3 suggestions:',
    topSuggestions.map((suggestion) => ({
      name: suggestion.user?.ten,
      score: suggestion.diem_phu_hop,
      skills: suggestion.ly_do.ky_nang_phu_hop,
    }))
  );

  return topSuggestions;
}

function extractKeywords(text: string): string[] {
  const keywords =
    text.match(
      /\b[\wáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ.#+-]+\b/gi
    ) || [];

  const stopWords = new Set([
    'cho',
    'của',
    'và',
    'là',
    'có',
    'được',
    'này',
    'các',
    'một',
    'trong',
    'với',
    'để',
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'cần',
    'làm',
    'thực',
    'hiện',
    'công',
    'việc',
    'task',
    'tạo',
    'xây',
    'dựng',
    'phát',
    'triển',
    'cập',
    'nhật',
    'sửa',
    'lỗi',
    'fix',
    'bug',
    'feature',
    'implement',
  ]);

  const extractedKeywords = keywords
    .filter((keyword) => keyword.length > 1 && !stopWords.has(keyword.toLowerCase()))
    .map((keyword) => keyword.toLowerCase());

  const techSynonyms: Record<string, string[]> = {
    frontend: ['react', 'vue', 'angular', 'nextjs', 'next.js', 'html', 'css', 'javascript', 'typescript'],
    'giao diện': ['frontend', 'ui', 'ux', 'css', 'html'],
    ui: ['css', 'tailwind', 'figma', 'design'],
    ux: ['design', 'figma', 'ui'],
    react: ['frontend', 'javascript', 'typescript', 'next.js'],
    vue: ['frontend', 'javascript', 'vue.js'],
    angular: ['frontend', 'typescript'],
    backend: ['node', 'python', 'java', 'go', 'api', 'server', 'database'],
    server: ['backend', 'node', 'python', 'api'],
    api: ['backend', 'rest', 'graphql', 'node', 'python'],
    node: ['javascript', 'backend', 'express', 'node.js'],
    python: ['backend', 'fastapi', 'django', 'flask'],
    java: ['backend', 'spring', 'spring boot'],
    database: ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'supabase'],
    sql: ['database', 'postgresql', 'mysql'],
    nosql: ['mongodb', 'redis', 'database'],
    postgresql: ['sql', 'database', 'postgres'],
    mongodb: ['nosql', 'database'],
    devops: ['docker', 'kubernetes', 'ci/cd', 'aws', 'cloud', 'linux'],
    cloud: ['aws', 'azure', 'gcp', 'google cloud'],
    docker: ['devops', 'kubernetes', 'container'],
    deploy: ['devops', 'ci/cd', 'docker'],
    ai: ['machine learning', 'deep learning', 'python', 'tensorflow', 'pytorch', 'openai'],
    ml: ['machine learning', 'python', 'tensorflow', 'pytorch'],
    'machine learning': ['python', 'tensorflow', 'pytorch', 'ai'],
    chatbot: ['ai', 'nlp', 'openai', 'langchain'],
    mobile: ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
    ios: ['swift', 'mobile', 'apple'],
    android: ['kotlin', 'java', 'mobile'],
    test: ['testing', 'jest', 'cypress', 'unittest'],
    testing: ['jest', 'cypress', 'selenium', 'qa'],
    'bảo mật': ['security', 'authentication', 'authorization'],
    security: ['authentication', 'authorization', 'encryption'],
    'tối ưu': ['performance', 'optimization'],
    performance: ['optimization', 'caching', 'redis'],
  };

  const expandedKeywords = new Set(extractedKeywords);
  extractedKeywords.forEach((keyword) => {
    if (techSynonyms[keyword]) {
      techSynonyms[keyword].forEach((synonym) => expandedKeywords.add(synonym));
    }

    Object.entries(techSynonyms).forEach(([key, values]) => {
      if (keyword.includes(key) || key.includes(keyword)) {
        values.forEach((synonym) => expandedKeywords.add(synonym));
        expandedKeywords.add(key);
      }
    });
  });

  return Array.from(expandedKeywords);
}

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
