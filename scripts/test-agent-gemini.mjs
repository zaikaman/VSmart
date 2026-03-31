import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  const envPath = path.resolve('.env');
  const raw = await fs.readFile(envPath, 'utf8');
  return { ...parseEnvFile(raw), ...process.env };
}

function normalizeGeminiBaseUrls(baseUrl, model) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) {
    return [
      `${trimmed.replace(/\/v1$/, '/v1beta')}/models/${model}:generateContent`,
      `${trimmed}/models/${model}:generateContent`,
    ];
  }
  return [`${trimmed}/models/${model}:generateContent`];
}

function buildGeminiNativeBody({ prompt, includeTools }) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  if (includeTools) {
    body.tools = [
      {
        functionDeclarations: [
          {
            name: 'tao_du_an',
            description: 'Tạo một dự án mới',
            parameters: {
              type: 'OBJECT',
              properties: {
                ten: { type: 'STRING' },
                deadline: { type: 'STRING' },
              },
              required: ['ten', 'deadline'],
            },
          },
        ],
      },
    ];
    body.toolConfig = {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    };
  }

  return body;
}

function buildOpenAICompatibleBody({ prompt, includeTools, model }) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  };

  if (includeTools) {
    body.tools = [
      {
        type: 'function',
        function: {
          name: 'tao_du_an',
          description: 'Tạo một dự án mới',
          parameters: {
            type: 'object',
            properties: {
              ten: { type: 'string' },
              deadline: { type: 'string' },
            },
            required: ['ten', 'deadline'],
          },
        },
      },
    ];
    body.tool_choice = 'auto';
  }

  return body;
}

async function fetchJsonText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: text,
  };
}

async function probeGeminiEndpoint(env) {
  const prompt = 'Chỉ trả lời OK.';
  const tests = [];
  const authVariants = [
    {
      name: 'bearer',
      headers: {
        Authorization: `Bearer ${env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'x_api_key',
      headers: {
        'x-goog-api-key': env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'api_key_header',
      headers: {
        'api-key': env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
    },
  ];

  for (const url of normalizeGeminiBaseUrls(env.GEMINI_BASE_URL, env.GEMINI_MODEL)) {
    for (const authVariant of authVariants) {
      tests.push({
        name: `native_no_tools_${authVariant.name}`,
        url,
        body: buildGeminiNativeBody({ prompt, includeTools: false }),
        headers: authVariant.headers,
      });

      tests.push({
        name: `native_with_tools_${authVariant.name}`,
        url,
        body: buildGeminiNativeBody({ prompt, includeTools: true }),
        headers: authVariant.headers,
      });
    }
  }

  const openAiCompatUrl = `${env.GEMINI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  for (const authVariant of authVariants) {
    tests.push({
      name: `openai_compat_no_tools_${authVariant.name}`,
      url: openAiCompatUrl,
      body: buildOpenAICompatibleBody({
        prompt,
        includeTools: false,
        model: env.GEMINI_MODEL,
      }),
      headers: authVariant.headers,
    });

    tests.push({
      name: `openai_compat_with_tools_${authVariant.name}`,
      url: openAiCompatUrl,
      body: buildOpenAICompatibleBody({
        prompt,
        includeTools: true,
        model: env.GEMINI_MODEL,
      }),
      headers: authVariant.headers,
    });
  }

  tests.push({
    name: 'list_models_bearer',
    url: `${env.GEMINI_BASE_URL.replace(/\/+$/, '')}/models`,
    method: 'GET',
    body: undefined,
    headers: {
      Authorization: `Bearer ${env.GEMINI_API_KEY}`,
    },
  });

  tests.push({
    name: 'list_models_x_api_key',
    url: `${env.GEMINI_BASE_URL.replace(/\/+$/, '')}/models`,
    method: 'GET',
    body: undefined,
    headers: {
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
  });

  const results = [];

  for (const test of tests) {
    try {
      const response = await fetchJsonText(test.url, {
        method: test.method || 'POST',
        headers: test.headers,
        body: test.body ? JSON.stringify(test.body) : undefined,
      });

      results.push({
        name: test.name,
        url: test.url,
        status: response.status,
        ok: response.ok,
        responsePreview: response.body.slice(0, 1200),
      });
    } catch (error) {
      results.push({
        name: test.name,
        url: test.url,
        ok: false,
        status: 0,
        responsePreview: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function getTodayIsoPlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function createExecutorContext(env) {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: user, error } = await supabase
    .from('nguoi_dung')
    .select('id, ten, email, vai_tro, to_chuc_id, phong_ban_id')
    .not('to_chuc_id', 'is', null)
    .order('ngay_tao', { ascending: true })
    .limit(1)
    .single();

  if (error || !user) {
    throw new Error(`Không tìm thấy user để chạy test agent: ${error?.message || 'unknown'}`);
  }

  return { supabase, user };
}

async function taoDuAn(supabase, user, params) {
  const { data, error } = await supabase
    .from('du_an')
    .insert([
      {
        ten: params.ten,
        mo_ta: params.mo_ta,
        deadline: params.deadline,
        nguoi_tao_id: user.id,
        to_chuc_id: user.to_chuc_id,
        trang_thai: 'todo',
        phan_tram_hoan_thanh: 0,
      },
    ])
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await supabase.from('thanh_vien_du_an').insert([
    {
      du_an_id: data.id,
      nguoi_dung_id: user.id,
      email: user.email,
      vai_tro: 'owner',
      trang_thai: 'active',
      nguoi_moi_id: user.id,
      ngay_tham_gia: new Date().toISOString(),
    },
  ]);

  return {
    success: true,
    data: {
      message: `Đã tạo dự án "${params.ten}" thành công`,
      project: data,
    },
  };
}

async function taoPhanDuAn(supabase, user, params) {
  const phongBanId = params.phong_ban_id || user.phong_ban_id;

  if (!phongBanId) {
    return { success: false, error: 'Thiếu phòng ban phụ trách cho phần dự án này' };
  }

  const { data, error } = await supabase
    .from('phan_du_an')
    .insert([
      {
        ten: params.ten,
        mo_ta: params.mo_ta,
        deadline: params.deadline,
        du_an_id: params.du_an_id,
        phong_ban_id: phongBanId,
      },
    ])
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      message: `Đã tạo phần dự án "${params.ten}" thành công`,
      part: data,
    },
  };
}

async function taoTask(supabase, user, params) {
  const { data, error } = await supabase
    .from('task')
    .insert([
      {
        ten: params.ten,
        mo_ta: params.mo_ta,
        deadline: params.deadline,
        phan_du_an_id: params.phan_du_an_id,
        assignee_id: params.assignee_id || null,
        priority: params.priority || 'medium',
        trang_thai: 'todo',
        progress: 0,
      },
    ])
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      message: `Đã tạo task "${params.ten}" thành công`,
      task: data,
    },
  };
}

async function callOpenAICompatible(baseUrl, apiKey, body) {
  return fetchJsonText(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function callGeminiNativeJsonAgent(env, messages, availableTools) {
  const [url] = normalizeGeminiBaseUrls(env.GEMINI_BASE_URL, env.GEMINI_MODEL);
  const toolSpecs = availableTools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));

  const systemInstruction = [
    'Bạn là VSmart AI Agent.',
    'Không dùng function calling native.',
    'Hãy trả về đúng 1 JSON object hợp lệ với cấu trúc:',
    '{"reply":"string","actions":[{"tool_name":"string","arguments":{}}]}',
    'Quy tắc:',
    '- Nếu cần thao tác dữ liệu thật thì điền actions.',
    '- Nếu đã đủ thông tin sau khi có kết quả thực thi thì xác nhận trong reply và để actions là [].',
    '- arguments phải là object JSON hợp lệ.',
    `Danh sách tool hiện có: ${JSON.stringify(toolSpecs)}`,
  ].join('\n');

  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  return fetchJsonText(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
}

function parseGeminiAgentPayload(responseBody) {
  const envelope = JSON.parse(responseBody);
  const text = envelope?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '{}';
  return JSON.parse(text);
}

function buildAgentMessages(previous, userContent) {
  return [
    {
      role: 'system',
      content:
        'Bạn là VSmart AI Agent. Hãy dùng tool khi cần thao tác dữ liệu thật. Trả lời bằng tiếng Việt ngắn gọn.',
    },
    ...previous,
    {
      role: 'user',
      content: userContent,
    },
  ];
}

async function agentTurn({ env, previousMessages, userContent, availableTools, executeTool }) {
  const transcript = [];
  const messages = buildAgentMessages(previousMessages, userContent);
  const firstResponse = await callGeminiNativeJsonAgent(env, messages, availableTools);
  transcript.push({
    step: 'model_initial',
    status: firstResponse.status,
    bodyPreview: firstResponse.body.slice(0, 1200),
  });

  if (!firstResponse.ok) {
    return {
      transcript,
      messagesAfterTurn: previousMessages,
      failure: `Model lỗi ngay lượt đầu: ${firstResponse.status}`,
    };
  }

  const parsed = parseGeminiAgentPayload(firstResponse.body);
  const assistantContent = parsed.reply || '';
  const toolCalls = (parsed.actions || []).map((action, index) => ({
    id: `json-agent-${Date.now()}-${index}`,
    type: 'function',
    function: {
      name: action.tool_name,
      arguments: JSON.stringify(action.arguments || {}),
    },
  }));

  const nextMessages = [
    ...previousMessages,
    {
      role: 'user',
      content: userContent,
    },
    {
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls,
    },
  ];

  transcript.push({
    step: 'assistant_message',
    assistantContent,
    toolCalls,
  });

  if (!toolCalls.length) {
    return {
      transcript,
      messagesAfterTurn: nextMessages,
    };
  }

  const toolResults = [];

  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments || '{}');
    const result = await executeTool(toolCall.function.name, args);
    toolResults.push({
      tool_call_id: toolCall.id,
      tool_name: toolCall.function.name,
      result,
    });

    nextMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  transcript.push({
    step: 'tool_results',
    toolResults,
  });

  const followupMessages = [
    ...nextMessages,
    {
      role: 'user',
      content: 'Dựa trên kết quả thực thi ở trên, hãy xác nhận ngắn gọn bằng tiếng Việt.',
    },
  ];

  const finalResponse = await callGeminiNativeJsonAgent(env, followupMessages, []);
  transcript.push({
    step: 'model_after_tools',
    status: finalResponse.status,
    bodyPreview: finalResponse.body.slice(0, 1200),
  });

  if (finalResponse.ok) {
    const parsedFinal = parseGeminiAgentPayload(finalResponse.body);
    nextMessages.push({
      role: 'assistant',
      content: parsedFinal.reply || '',
    });
  }

  return {
    transcript,
    messagesAfterTurn: nextMessages,
  };
}

async function runAgentCreationFlow(env) {
  const { supabase, user } = await createExecutorContext(env);

  const executeTool = async (toolName, args) => {
    if (toolName === 'tao_du_an') return taoDuAn(supabase, user, args);
    if (toolName === 'tao_phan_du_an') return taoPhanDuAn(supabase, user, args);
    if (toolName === 'tao_task') return taoTask(supabase, user, args);
    return { success: false, error: `Tool không được hỗ trợ trong bài test: ${toolName}` };
  };

  const tools = [
    {
      type: 'function',
      function: {
        name: 'tao_du_an',
        description: 'Tạo dự án mới',
        parameters: {
          type: 'object',
          properties: {
            ten: { type: 'string' },
            mo_ta: { type: 'string' },
            deadline: { type: 'string' },
          },
          required: ['ten', 'deadline'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'tao_phan_du_an',
        description: 'Tạo phần dự án mới',
        parameters: {
          type: 'object',
          properties: {
            ten: { type: 'string' },
            mo_ta: { type: 'string' },
            du_an_id: { type: 'string' },
            deadline: { type: 'string' },
            phong_ban_id: { type: 'string' },
          },
          required: ['ten', 'du_an_id', 'deadline'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'tao_task',
        description: 'Tạo task mới',
        parameters: {
          type: 'object',
          properties: {
            ten: { type: 'string' },
            mo_ta: { type: 'string' },
            phan_du_an_id: { type: 'string' },
            deadline: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
          },
          required: ['ten', 'phan_du_an_id', 'deadline'],
        },
      },
    },
  ];

  let previousMessages = [];
  const turns = [];

  const projectTurn = await agentTurn({
    env,
    previousMessages,
    userContent: `Hãy dùng agent để tạo một dự án mới tên Tester2026 với deadline ${getTodayIsoPlus(30)}. Không hỏi lại, cứ thực hiện luôn.`,
    availableTools: [tools[0]],
    executeTool,
  });
  turns.push({ label: 'create_project', ...projectTurn });
  previousMessages = projectTurn.messagesAfterTurn;

  const projectId =
    projectTurn.transcript
      .flatMap((entry) => entry.toolResults || [])
      .find((entry) => entry.tool_name === 'tao_du_an')?.result?.data?.project?.id || null;

  const partTurn = await agentTurn({
    env,
    previousMessages,
    userContent: `Tiếp tục dùng agent để tạo một phần dự án tên Tester1234 trong dự án Tester2026 với project id là ${projectId} và deadline ${getTodayIsoPlus(21)}.`,
    availableTools: [tools[1]],
    executeTool,
  });
  turns.push({ label: 'create_part', ...partTurn });
  previousMessages = partTurn.messagesAfterTurn;

  const partId =
    partTurn.transcript
      .flatMap((entry) => entry.toolResults || [])
      .find((entry) => entry.tool_name === 'tao_phan_du_an')?.result?.data?.part?.id || null;

  const taskTurn = await agentTurn({
    env,
    previousMessages,
    userContent: `Tiếp tục dùng agent để tạo một task tên Tester8912 trong phần dự án Tester1234 với phan_du_an_id là ${partId} và deadline ${getTodayIsoPlus(14)}.`,
    availableTools: [tools[2]],
    executeTool,
  });
  turns.push({ label: 'create_task', ...taskTurn });

  return {
    actor: {
      id: user.id,
      email: user.email,
      ten: user.ten,
    },
    entities: {
      projectId,
      partId,
      taskId:
        taskTurn.transcript
          .flatMap((entry) => entry.toolResults || [])
          .find((entry) => entry.tool_name === 'tao_task')?.result?.data?.task?.id || null,
    },
    turns,
  };
}

async function runOpenAIFallbackAgentCreationFlow(env) {
  return null;
}

async function main() {
  const env = await loadEnv();
  const report = {
    generatedAt: new Date().toISOString(),
    endpointProbes: [],
    agentFlow: null,
    openaiFallbackAgentFlow: null,
  };

  if (process.argv.includes('--with-probes')) {
    report.endpointProbes = await probeGeminiEndpoint(env);
  }
  report.agentFlow = await runAgentCreationFlow(env);
  report.openaiFallbackAgentFlow = await runOpenAIFallbackAgentCreationFlow(env);

  const outputDir = path.resolve('artifacts');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'gemini-agent-test-report.json');
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
