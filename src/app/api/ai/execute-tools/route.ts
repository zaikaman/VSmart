import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AgentToolExecutor } from '@/lib/openai/agent-executor';
import { z } from 'zod';

/**
 * Schema validation cho tool execution request
 */
const toolExecutionSchema = z.object({
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).min(1),
});

/**
 * POST /api/ai/execute-tools - Thực thi các tool calls từ AI Agent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Xác thực user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để sử dụng AI Agent' },
        { status: 401 }
      );
    }

    // Parse và validate request body
    const body = await request.json();
    const parseResult = toolExecutionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { tool_calls } = parseResult.data;

    // Lấy thông tin user
    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Tạo executor
    const executor = new AgentToolExecutor(supabase, userData.id, user.email!);

    // Thực thi tất cả tool calls
    const results = [];
    for (const toolCall of tool_calls) {
      try {
        // Parse arguments
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute tool
        const result = await executor.executeTool(toolCall.function.name, args);
        
        results.push({
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          success: result.success,
          data: result.data,
          error: result.error,
        });
      } catch (error) {
        console.error(`[Tool Execution Error] ${toolCall.function.name}:`, error);
        results.push({
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi không xác định',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[Execute Tools API Error]', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi thực thi tools', details: errorMessage },
      { status: 500 }
    );
  }
}
