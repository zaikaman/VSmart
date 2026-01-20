# AI Agent - Tài liệu kỹ thuật

## Kiến trúc hệ thống

### Tổng quan

AI Agent được xây dựng dựa trên OpenAI Function Calling API, cho phép AI tự động gọi các functions được định nghĩa sẵn để thực hiện hành động trong hệ thống.

```
┌─────────────────┐
│  Chat UI        │
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/ai/chat    │  ◄── Streaming response với tool calls
│                 │
└────────┬────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌────────────────────┐
│ OpenAI API       │   │ /api/ai/execute-   │
│ (Function Call)  │   │ tools              │
└──────────────────┘   └─────────┬──────────┘
                                 │
                                 ▼
                        ┌────────────────────┐
                        │ AgentToolExecutor  │
                        │ (Service Layer)    │
                        └─────────┬──────────┘
                                 │
                                 ▼
                        ┌────────────────────┐
                        │ Database Actions   │
                        │ (Supabase)         │
                        └────────────────────┘
```

## Các thành phần chính

### 1. Tool Definitions (`agent-tools.ts`)

Định nghĩa tất cả các functions mà AI có thể gọi theo format của OpenAI:

```typescript
export const AI_AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'tao_du_an',
      description: 'Tạo một dự án mới...',
      parameters: {
        type: 'object',
        properties: {
          ten: { type: 'string', description: '...' },
          // ...
        },
        required: ['ten', 'deadline'],
      },
    },
  },
  // ... các tools khác
];
```

**Các tools hiện có:**
- `tao_du_an` - Tạo dự án mới
- `moi_thanh_vien_du_an` - Mời thành viên
- `tao_phan_du_an` - Tạo phần dự án
- `tao_task` - Tạo task
- `cap_nhat_task` - Cập nhật task
- `xoa_task` - Xóa task
- `lay_danh_sach_thanh_vien` - Lấy danh sách thành viên
- `lay_danh_sach_du_an` - Lấy danh sách dự án
- `lay_danh_sach_phan_du_an` - Lấy danh sách phần dự án
- `lay_chi_tiet_task` - Lấy chi tiết task
- `cap_nhat_du_an` - Cập nhật dự án
- `xoa_thanh_vien_du_an` - Xóa thành viên
- `tim_kiem_tasks` - Tìm kiếm tasks

### 2. Tool Executor (`agent-executor.ts`)

Service thực thi các tool calls với quyền của user:

```typescript
export class AgentToolExecutor {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
    private userEmail: string
  ) {}

  async executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
    // Kiểm tra quyền và thực thi
    // Trả về kết quả
  }
}
```

**Đặc điểm:**
- Kiểm tra quyền trước khi thực hiện
- Sử dụng Supabase RLS policies
- Xử lý lỗi và trả về error messages rõ ràng
- Hỗ trợ soft delete cho tasks

### 3. Chat Completion với Function Calling (`chat-completion.ts`)

Tích hợp OpenAI streaming với function calling:

```typescript
export async function createChatCompletionStream(
  options: ChatCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  // Nếu enableTools = true
  // → Gửi tools definitions cho OpenAI
  // → AI có thể trả về tool_calls thay vì chỉ text
  
  // Streaming response có thể chứa:
  // - type: 'content' → Text response
  // - type: 'tool_calls' → Danh sách tool calls cần thực thi
  // - type: 'error' → Lỗi
}
```

### 4. API Routes

#### `/api/ai/chat` (route.ts)

Endpoint chính để chat với AI:

```typescript
POST /api/ai/chat
Body: {
  messages: ChatMessage[],
  enableAgent: boolean  // Bật AI Agent
}

Response: Server-Sent Events stream
```

#### `/api/ai/execute-tools` (execute-tools/route.ts)

Endpoint để thực thi tool calls:

```typescript
POST /api/ai/execute-tools
Body: {
  tool_calls: [{
    id: string,
    type: 'function',
    function: {
      name: string,
      arguments: string  // JSON string
    }
  }]
}

Response: {
  success: boolean,
  results: ToolExecutionResult[]
}
```

### 5. Frontend Components (`chat-sidebar.tsx`)

UI component xử lý tương tác với AI Agent:

**Flow:**
1. User gửi message
2. Call `/api/ai/chat` với `enableAgent=true`
3. Nhận streaming response
4. Nếu có `tool_calls`:
   - Hiển thị "Đang thực hiện các hành động..."
   - Call `/api/ai/execute-tools`
   - Nhận kết quả
   - Gọi lại `/api/ai/chat` với tool results
   - Nhận summary response từ AI
5. Hiển thị kết quả cuối cùng

## Flow chi tiết

### Ví dụ: User yêu cầu "Tạo dự án Website"

```
1. USER → Frontend
   "Tạo dự án Website với deadline 31/3/2026"

2. Frontend → /api/ai/chat
   POST {
     messages: [{ role: 'user', content: '...' }],
     enableAgent: true
   }

3. /api/ai/chat → OpenAI API
   {
     messages: [...],
     tools: AI_AGENT_TOOLS,
     tool_choice: 'auto'
   }

4. OpenAI API → /api/ai/chat (Stream)
   {
     type: 'tool_calls',
     tool_calls: [{
       id: 'call_123',
       function: {
         name: 'tao_du_an',
         arguments: '{"ten":"Website","deadline":"2026-03-31T00:00:00Z"}'
       }
     }]
   }

5. Frontend nhận tool_calls
   → Hiển thị loading
   → Call /api/ai/execute-tools

6. /api/ai/execute-tools
   → AgentToolExecutor.executeTool('tao_du_an', args)
   → Supabase: INSERT vào bảng du_an
   → Return: { success: true, data: {...} }

7. Frontend nhận results
   → Call lại /api/ai/chat với tool results

8. /api/ai/chat → OpenAI API
   {
     messages: [
       { role: 'user', content: '...' },
       { role: 'assistant', tool_calls: [...] },
       { role: 'tool', content: '{"success":true,...}', tool_call_id: 'call_123' }
     ]
   }

9. OpenAI API → /api/ai/chat (Stream)
   {
     type: 'content',
     content: 'Đã tạo dự án Website thành công! ID: xxx, ...'
   }

10. Frontend hiển thị message cuối cùng
```

## Bảo mật

### 1. Authentication
- Tất cả API routes kiểm tra `supabase.auth.getUser()`
- Không cho phép anonymous users sử dụng AI Agent

### 2. Authorization
- AgentToolExecutor kiểm tra quyền trước mỗi hành động:
  - User có phải thành viên của dự án?
  - User có vai trò phù hợp? (owner/admin cho các hành động quan trọng)
- Sử dụng Supabase RLS policies làm lớp bảo mật thứ hai

### 3. Input Validation
- Validate tất cả inputs với Zod schemas
- Sanitize user inputs trước khi gửi cho AI
- Parse JSON arguments an toàn với try-catch

### 4. Rate Limiting
TODO: Cần implement rate limiting cho:
- `/api/ai/chat` - Giới hạn số requests/phút
- `/api/ai/execute-tools` - Giới hạn số tool calls/phút

## Monitoring và Logging

### Events cần log:
```typescript
// Trong agent-executor.ts
console.log('[AgentToolExecutor] Executing tool:', toolName, args);
console.log('[AgentToolExecutor] Result:', result);

// Trong execute-tools/route.ts
console.log('[Execute Tools API] Tool calls:', tool_calls);
console.log('[Execute Tools API] Results:', results);
```

### Metrics cần theo dõi:
- Số lượng tool calls/ngày
- Tool nào được dùng nhiều nhất
- Success rate của mỗi tool
- Thời gian thực thi trung bình
- Số lỗi và loại lỗi

## Testing

### Unit Tests

```typescript
// test: agent-executor.test.ts
describe('AgentToolExecutor', () => {
  it('should create project successfully', async () => {
    const executor = new AgentToolExecutor(mockSupabase, userId, userEmail);
    const result = await executor.executeTool('tao_du_an', {
      ten: 'Test Project',
      deadline: '2026-12-31T00:00:00Z'
    });
    expect(result.success).toBe(true);
  });

  it('should reject unauthorized project creation', async () => {
    // User không có to_chuc_id
    const result = await executor.executeTool('tao_du_an', {...});
    expect(result.success).toBe(false);
    expect(result.error).toContain('tổ chức');
  });
});
```

### Integration Tests

```typescript
// test: ai-agent.integration.test.ts
describe('AI Agent Integration', () => {
  it('should complete full workflow: chat → tool call → execute → summary', async () => {
    // 1. Send user message
    const response1 = await fetch('/api/ai/chat', {...});
    
    // 2. Get tool calls from stream
    const toolCalls = await parseStreamForToolCalls(response1);
    
    // 3. Execute tools
    const toolResults = await fetch('/api/ai/execute-tools', {
      body: JSON.stringify({ tool_calls: toolCalls })
    });
    
    // 4. Get summary
    const response2 = await fetch('/api/ai/chat', {
      body: JSON.stringify({
        messages: [..., toolResults],
        enableAgent: true
      })
    });
    
    expect(response2.ok).toBe(true);
  });
});
```

## Thêm Tool mới

### Bước 1: Định nghĩa tool trong `agent-tools.ts`

```typescript
export const AI_AGENT_TOOLS: ChatCompletionTool[] = [
  // ... existing tools
  {
    type: 'function',
    function: {
      name: 'ten_tool_moi',
      description: 'Mô tả rõ ràng về tool này làm gì',
      parameters: {
        type: 'object',
        properties: {
          param1: { 
            type: 'string', 
            description: 'Mô tả param1' 
          },
          // ...
        },
        required: ['param1'],
      },
    },
  },
];

// Thêm type cho params
export interface TenToolMoiParams {
  param1: string;
  // ...
}
```

### Bước 2: Implement trong `agent-executor.ts`

```typescript
export class AgentToolExecutor {
  async executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
    switch (toolName) {
      // ... existing cases
      case 'ten_tool_moi':
        return await this.tenToolMoi(args as TenToolMoiParams);
    }
  }

  private async tenToolMoi(params: TenToolMoiParams): Promise<ToolExecutionResult> {
    // 1. Validate inputs
    if (!params.param1) {
      return { success: false, error: 'param1 là bắt buộc' };
    }

    // 2. Kiểm tra quyền
    const hasPermission = await this.checkPermission(...);
    if (!hasPermission) {
      return { success: false, error: 'Không có quyền' };
    }

    // 3. Thực hiện hành động
    const { data, error } = await this.supabase
      .from('table_name')
      .insert([...])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 4. Trả về kết quả
    return {
      success: true,
      data: {
        message: 'Thành công!',
        result: data,
      },
    };
  }
}
```

### Bước 3: Test

```typescript
// Test tool mới
const executor = new AgentToolExecutor(supabase, userId, email);
const result = await executor.executeTool('ten_tool_moi', {
  param1: 'test'
});

console.log(result);
```

### Bước 4: Cập nhật documentation

Thêm tool mới vào `docs/ai-agent-guide.md`:
- Mô tả chức năng
- Ví dụ sử dụng
- Các lưu ý đặc biệt

## Performance Optimization

### 1. Caching
TODO: Implement caching cho:
- Danh sách dự án của user
- Danh sách thành viên
- Context data

### 2. Batch Operations
TODO: Hỗ trợ batch operations:
- Tạo nhiều tasks cùng lúc
- Cập nhật nhiều tasks cùng lúc

### 3. Streaming Optimization
- Sử dụng Server-Sent Events thay vì polling
- Compress response nếu cần
- Implement reconnection logic

## Troubleshooting

### Vấn đề: Tool không được gọi

**Nguyên nhân:**
- `enableAgent` không được set
- Tool definition không đúng format
- OpenAI model không hỗ trợ function calling

**Giải pháp:**
- Kiểm tra `enableAgent = true`
- Validate tool definitions với OpenAI schema
- Sử dụng model `gpt-4` hoặc `gpt-3.5-turbo-0125` trở lên

### Vấn đề: Tool execution thất bại

**Nguyên nhân:**
- User không có quyền
- Arguments không hợp lệ
- Database constraint violation

**Giải pháp:**
- Check logs trong `agent-executor.ts`
- Validate permissions
- Add better error messages

### Vấn đề: AI không hiểu yêu cầu

**Nguyên nhân:**
- Tool description không rõ ràng
- System prompt không đủ context

**Giải pháp:**
- Cải thiện tool descriptions
- Thêm examples vào system prompt
- Fine-tune prompt engineering

## Roadmap

### Phase 1: MVP ✅
- [x] Basic tool definitions
- [x] Tool executor service
- [x] Function calling integration
- [x] UI for agent mode
- [x] Documentation

### Phase 2: Enhancement 🚧
- [ ] Rate limiting
- [ ] Better error handling
- [ ] Confirmation flow cho hành động quan trọng
- [ ] Undo functionality
- [ ] Audit logs

### Phase 3: Advanced Features 📋
- [ ] Multi-step workflows
- [ ] Scheduled actions
- [ ] Bulk operations
- [ ] Custom tool creation (no-code)
- [ ] AI suggestions based on history

### Phase 4: Intelligence 🤖
- [ ] Learn from user behavior
- [ ] Proactive suggestions
- [ ] Auto-fix common issues
- [ ] Predictive actions

## Kết luận

AI Agent là một tính năng mạnh mẽ giúp tự động hóa các tác vụ quản lý dự án. Kiến trúc được thiết kế để:
- Dễ mở rộng (thêm tools mới)
- Bảo mật (kiểm tra quyền nghiêm ngặt)
- Maintainable (code rõ ràng, có documentation)
- Scalable (có thể thêm caching, rate limiting,...)

Hãy tuân thủ các best practices và test kỹ trước khi deploy lên production!
