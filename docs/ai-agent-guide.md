# AI Agent - Hướng dẫn sử dụng

## Tổng quan

AI Agent là phiên bản nâng cấp của VSmart AI Chatbot, có khả năng **thực hiện các hành động thực tế** trong hệ thống thay vì chỉ trả lời câu hỏi. 

Khi bật chế độ Agent, AI có thể:
- ✅ Tạo dự án mới
- ✅ Mời thành viên vào dự án
- ✅ Tạo phần dự án (modules/sprints)
- ✅ Tạo và quản lý tasks
- ✅ Cập nhật trạng thái, tiến độ tasks
- ✅ Xóa tasks không cần thiết
- ✅ Tìm kiếm và lọc thông tin

## Cách bật AI Agent

1. Mở chat sidebar (click vào icon chat ở góc dưới phải)
2. Click vào icon ⚡ (Zap) ở header để bật/tắt chế độ Agent
3. Khi bật, bạn sẽ thấy badge "Agent" màu xanh lá cây

## Ví dụ sử dụng

### 1. Tạo dự án mới

**Bạn:** "Tạo dự án mới tên 'Website công ty' với deadline là 31/3/2026"

**AI Agent sẽ:**
- Gọi function `tao_du_an` với thông tin bạn cung cấp
- Tự động thêm bạn làm owner của dự án
- Thông báo kết quả thành công và ID dự án

### 2. Mời thành viên

**Bạn:** "Mời john@example.com vào dự án X với vai trò admin"

**AI Agent sẽ:**
- Kiểm tra quyền của bạn trong dự án
- Gọi function `moi_thanh_vien_du_an`
- Gửi email mời nếu người đó chưa có tài khoản
- Thông báo kết quả

### 3. Tạo phần dự án và tasks

**Bạn:** "Tạo phần dự án 'Backend API' cho dự án Website công ty, sau đó tạo 3 tasks: thiết kế database, viết API users, và viết API products"

**AI Agent sẽ:**
- Lấy danh sách dự án để tìm ID của "Website công ty"
- Tạo phần dự án "Backend API"
- Tạo 3 tasks với deadline mặc định
- Hỏi bạn về deadline và người được gán nếu cần

### 4. Cập nhật tasks hàng loạt

**Bạn:** "Đặt tất cả tasks có priority urgent của tôi thành in-progress"

**AI Agent sẽ:**
- Tìm kiếm tasks với điều kiện urgent + assignee là bạn
- Cập nhật từng task thành trạng thái in-progress
- Báo cáo số lượng tasks đã cập nhật

### 5. Phân tích và hành động

**Bạn:** "Xem các tasks trễ hạn của dự án X và tăng priority của chúng lên urgent"

**AI Agent sẽ:**
- Lấy danh sách tasks trễ hạn
- Hiển thị thông tin các tasks
- Cập nhật priority của từng task
- Đề xuất các hành động tiếp theo

## Các lệnh thường dùng

### Quản lý dự án
```
- "Tạo dự án [tên] với deadline [ngày]"
- "Cập nhật deadline dự án [tên] thành [ngày mới]"
- "Thay đổi trạng thái dự án [tên] thành in-progress"
- "Cho tôi xem tất cả dự án đang active"
```

### Quản lý thành viên
```
- "Mời [email] vào dự án [tên] làm [vai trò]"
- "Xem danh sách thành viên dự án [tên]"
- "Xóa [email] khỏi dự án [tên]"
```

### Quản lý phần dự án
```
- "Tạo phần dự án [tên] cho dự án [tên dự án]"
- "Xem tất cả phần của dự án [tên]"
```

### Quản lý tasks
```
- "Tạo task [tên] trong phần [tên phần] với deadline [ngày]"
- "Gán task [tên] cho [email]"
- "Cập nhật tiến độ task [tên] lên 70%"
- "Đổi trạng thái task [tên] thành done"
- "Xóa task [tên]"
- "Tìm tất cả tasks có priority high"
- "Cho tôi xem tasks của [email]"
```

### Lệnh phức tạp
```
- "Tạo dự án Website E-commerce, sau đó tạo 3 phần: Frontend, Backend, và Database. Trong Backend tạo 5 tasks về API development"
- "Xem tất cả tasks trễ hạn, phân loại theo dự án và báo cáo cho tôi"
- "Tìm các tasks chưa gán người và gợi ý người phù hợp"
```

## Lưu ý quan trọng

### ⚠️ Quyền hạn
- AI Agent hoạt động với **quyền của bạn**
- Bạn chỉ có thể thao tác trên các dự án mà bạn là thành viên
- Một số hành động yêu cầu vai trò owner/admin (mời thành viên, xóa thành viên,...)

### ⚠️ Xác nhận trước khi thực hiện
- AI Agent sẽ **hỏi xác nhận** trước khi thực hiện các hành động quan trọng:
  - Xóa tasks/dự án
  - Thay đổi lớn (cập nhật hàng loạt)
  - Mời/xóa thành viên

### ⚠️ Thông tin cần thiết
- Nếu thiếu thông tin (deadline, tên, ID...), AI Agent sẽ **hỏi bạn**
- AI Agent sử dụng context có sẵn để điền thông tin khi có thể
- Bạn có thể tham khảo danh sách dự án/tasks hiện có bằng cách hỏi AI

### ⚠️ Xử lý lỗi
- Nếu có lỗi, AI Agent sẽ giải thích rõ ràng và đề xuất cách khắc phục
- Các lỗi thường gặp:
  - Không có quyền thực hiện hành động
  - Thông tin không hợp lệ (email sai, deadline quá khứ,...)
  - ID không tồn tại

## So sánh chế độ Chat thông thường vs AI Agent

| Tính năng | Chat thông thường | AI Agent |
|-----------|------------------|----------|
| Trả lời câu hỏi | ✅ | ✅ |
| Phân tích dữ liệu | ✅ | ✅ |
| Gợi ý và tư vấn | ✅ | ✅ |
| **Tạo dự án** | ❌ | ✅ |
| **Tạo tasks** | ❌ | ✅ |
| **Mời thành viên** | ❌ | ✅ |
| **Cập nhật dữ liệu** | ❌ | ✅ |
| **Xóa dữ liệu** | ❌ | ✅ |

## Best Practices

### 1. Rõ ràng và cụ thể
❌ "Tạo vài tasks"  
✅ "Tạo 3 tasks: Design UI, Code Frontend, và Testing với deadline 15/2/2026"

### 2. Sử dụng tên đầy đủ
❌ "Tạo task trong dự án đó"  
✅ "Tạo task trong dự án Website công ty"

### 3. Xác minh kết quả
Sau khi AI Agent thực hiện, hãy:
- Kiểm tra thông báo kết quả
- Refresh trang để xem thay đổi
- Hỏi AI nếu cần làm rõ

### 4. Sử dụng context
AI Agent nhớ các dự án và tasks bạn vừa đề cập trong cuộc hội thoại:

```
Bạn: "Cho tôi xem dự án Website công ty"
AI: [Hiển thị thông tin]
Bạn: "Tạo phần Backend trong dự án này" ← AI hiểu "dự án này" = Website công ty
```

## Ví dụ workflow hoàn chỉnh

```
# 1. Tạo dự án
Bạn: "Tạo dự án Mobile App với deadline 30/6/2026"
AI: ✅ Đã tạo dự án "Mobile App" (ID: xxx)

# 2. Thêm thành viên
Bạn: "Mời dev1@company.com và dev2@company.com vào dự án làm member"
AI: ✅ Đã mời 2 thành viên vào dự án

# 3. Tạo cấu trúc
Bạn: "Tạo 2 phần: iOS Development và Android Development"
AI: ✅ Đã tạo 2 phần dự án

# 4. Tạo tasks
Bạn: "Trong phần iOS, tạo 5 tasks: Login UI, Profile UI, Settings UI, API Integration, và Testing"
AI: ✅ Đã tạo 5 tasks trong phần iOS Development

# 5. Phân công
Bạn: "Gán các tasks UI cho dev1@company.com và các tasks khác cho dev2@company.com"
AI: ✅ Đã phân công tasks theo yêu cầu

# 6. Theo dõi
Bạn: "Cho tôi xem tổng quan dự án Mobile App"
AI: [Báo cáo đầy đủ về dự án, tasks, tiến độ,...]
```

## Troubleshooting

### AI Agent không thực hiện hành động
1. Kiểm tra icon ⚡ có màu xanh (Agent mode đang BẬT)
2. Kiểm tra quyền của bạn trong dự án
3. Đảm bảo thông tin đầy đủ và chính xác

### Lỗi "Không có quyền"
- Bạn cần là thành viên của dự án
- Một số hành động yêu cầu vai trò owner/admin
- Hỏi owner dự án để được cấp quyền

### Lỗi "Không tìm thấy"
- Kiểm tra tên dự án/task có đúng không
- Thử hỏi AI "Cho tôi xem danh sách dự án" để lấy tên chính xác
- Sử dụng ID thay vì tên nếu có thể

## Kết luận

AI Agent là công cụ mạnh mẽ giúp bạn quản lý dự án nhanh hơn và hiệu quả hơn bằng ngôn ngữ tự nhiên. Hãy thử nghiệm và khám phá các khả năng của nó!

Nếu gặp vấn đề, hãy tắt Agent mode và sử dụng chế độ chat thông thường để nhận tư vấn trước khi thực hiện hành động.
