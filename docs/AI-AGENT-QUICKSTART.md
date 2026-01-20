# 🚀 Quick Start: Test AI Agent

## Bước 1: Khởi chạy ứng dụng

```bash
npm run dev
```

## Bước 2: Đăng nhập

Đăng nhập vào hệ thống với tài khoản có sẵn

## Bước 3: Mở Chat AI

1. Tìm icon chat ở góc dưới phải màn hình
2. Click để mở chat sidebar

## Bước 4: Bật AI Agent Mode

1. Tìm icon ⚡ (Zap) ở header của chat
2. Click để bật Agent mode
3. Thấy badge "Agent" màu xanh lá cây → Thành công!

## Bước 5: Test các tính năng

### Test 1: Xem danh sách dự án
```
Bạn: "Cho tôi xem tất cả dự án hiện tại"
```
✅ Kết quả mong đợi: AI liệt kê các dự án của bạn

### Test 2: Tạo dự án mới
```
Bạn: "Tạo dự án thử nghiệm tên 'AI Agent Test' với deadline 15/2/2026"
```
✅ Kết quả mong đợi: 
- AI xác nhận đang tạo dự án
- Hiển thị "Đang thực hiện các hành động..."
- Thông báo "Đã tạo dự án thành công" với ID và thông tin

### Test 3: Tạo phần dự án
```
Bạn: "Trong dự án AI Agent Test, tạo phần dự án 'Sprint 1'"
```
✅ Kết quả mong đợi: Phần dự án được tạo thành công

### Test 4: Tạo tasks
```
Bạn: "Tạo 3 tasks trong Sprint 1: Setup project, Write code, và Testing"
```
✅ Kết quả mong đợi: 3 tasks được tạo với thông tin chi tiết

### Test 5: Cập nhật task
```
Bạn: "Đổi trạng thái task 'Setup project' thành in-progress"
```
✅ Kết quả mong đợi: Task được cập nhật

### Test 6: Xem thống kê
```
Bạn: "Cho tôi xem tổng quan dự án AI Agent Test"
```
✅ Kết quả mong đợi: AI tổng hợp thông tin dự án, tasks, tiến độ

## Test Cases nâng cao

### Test 7: Multi-step workflow
```
Bạn: "Tạo dự án Website E-commerce deadline 30/6/2026, sau đó tạo 3 phần: Frontend, Backend, Database"
```
✅ Kết quả mong đợi: AI tạo dự án rồi tạo 3 phần dự án

### Test 8: Tìm kiếm và filter
```
Bạn: "Tìm tất cả tasks có priority urgent của tôi"
```
✅ Kết quả mong đợi: Danh sách tasks urgent của user

### Test 9: Bulk update
```
Bạn: "Đặt tất cả tasks của Sprint 1 có trạng thái todo thành in-progress"
```
✅ Kết quả mong đợi: Multiple tasks được cập nhật

### Test 10: Error handling
```
Bạn: "Xóa dự án không tồn tại"
```
✅ Kết quả mong đợi: AI báo lỗi rõ ràng "Không tìm thấy dự án"

## Kiểm tra trong Database

Sau các test, verify trong Supabase:

1. Mở Supabase Dashboard
2. Vào Table Editor
3. Kiểm tra bảng:
   - `du_an` - Dự án mới được tạo
   - `phan_du_an` - Phần dự án
   - `task` - Tasks mới
   - `thanh_vien_du_an` - User được tự động thêm làm owner

## Debug nếu có lỗi

### 1. Agent không thực hiện hành động

**Kiểm tra:**
- Icon ⚡ có màu xanh không?
- Browser console có lỗi không?
- Network tab: API calls có thành công không?

**Giải pháp:**
- Bật lại Agent mode
- Refresh page
- Kiểm tra OPENAI_API_KEY trong .env

### 2. Lỗi "Không có quyền"

**Kiểm tra:**
- User có thuộc tổ chức không?
- User có phải thành viên của dự án không?

**Giải pháp:**
- Đảm bảo user.to_chuc_id != null
- Thêm user vào dự án trước

### 3. Tool calls không được thực thi

**Kiểm tra:**
- Network tab: `/api/ai/execute-tools` có được gọi không?
- Response status code

**Giải pháp:**
- Xem server logs
- Kiểm tra database constraints

## Logs quan trọng

### Browser Console:
```
[Chat] Sending message...
[Chat] Received tool_calls: [...]
[Chat] Executing tools...
[Chat] Tool results: [...]
[Chat] Getting summary...
```

### Server Logs:
```
[AgentToolExecutor] Executing tool: tao_du_an
[AgentToolExecutor] Result: { success: true, ... }
[Execute Tools API] Tool calls: [...]
[Execute Tools API] Results: [...]
```

## Performance Check

- Chat response time: < 3s
- Tool execution: < 2s per tool
- Summary generation: < 3s

Nếu chậm hơn:
- Kiểm tra OpenAI API latency
- Kiểm tra database queries
- Xem network tab

## Expected Behavior

### Khi Agent Mode BẬT:
- AI có thể thực hiện hành động
- Hiển thị "Đang thực hiện các hành động..." khi execute
- Confirmation cho các hành động quan trọng

### Khi Agent Mode TẮT:
- AI chỉ trả lời và tư vấn
- Không thực hiện hành động thực tế
- Gợi ý bật Agent mode nếu user yêu cầu action

## Tips để test tốt hơn

1. **Clear và specific**: "Tạo dự án X" thay vì "Tạo cái gì đó"
2. **Use context**: "Tạo task trong dự án vừa tạo" (AI nhớ context)
3. **Check results**: Verify trong UI hoặc database sau mỗi action
4. **Test edge cases**: Empty values, invalid dates, missing permissions
5. **Test error recovery**: Làm gì khi lỗi? AI handle thế nào?

## Success Criteria

✅ AI hiểu yêu cầu và gọi đúng tool  
✅ Tool execution thành công với data đúng  
✅ Database được cập nhật  
✅ AI tổng hợp kết quả rõ ràng  
✅ UI update reflect changes  
✅ Error được handle gracefully  

## Next Steps

Sau khi test xong:
1. Đọc chi tiết: `docs/ai-agent-guide.md`
2. Hiểu technical: `docs/ai-agent-technical.md`
3. Thêm features mới theo roadmap
4. Write tests
5. Deploy to production

Happy testing! 🎉
