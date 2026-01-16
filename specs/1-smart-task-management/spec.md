# Feature Specification: Hệ Thống Quản Lý Công Việc Thông Minh

**Feature**: `1-smart-task-management`  
**Created**: 2026-01-16  
**Status**: Draft  
**Input**: Xây dựng một hệ thống quản lý công việc và dự án thông minh dành cho đội nhóm/doanh nghiệp, giúp phân công nhiệm vụ hiệu quả và giảm thiểu rủi ro trễ hạn.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tạo Dự Án Và Phân Công Cơ Bản (Priority: P1)

Quản lý dự án tạo một dự án mới, chia thành các phần dự án giao cho phòng ban, sau đó phân công nhiệm vụ chi tiết cho từng cá nhân trong phòng ban đó. Hệ thống hiển thị danh sách dự án, phần dự án và nhiệm vụ theo dạng kanban hoặc list view với các trạng thái todo, in-progress, done.

**Why this priority**: Đây là chức năng nền tảng của hệ thống. Không có khả năng tạo dự án và phân công công việc thì các tính năng AI và dự báo không có dữ liệu để hoạt động. Đây là MVP tối thiểu để deliver value.

**Independent Test**: Quản lý có thể tạo dự án "Website Redesign", chia thành phần "Frontend Development" giao cho phòng Engineering, tạo task "Implement Homepage UI" giao cho developer A, và thấy task này xuất hiện trong kanban board với trạng thái "todo". Thành viên A đăng nhập và thấy task của mình.

**Acceptance Scenarios**:

1. **Given** người dùng là quản lý đã đăng nhập, **When** tạo dự án mới với tên "Website Redesign" và deadline 2026-03-01, **Then** dự án xuất hiện trong danh sách dự án với trạng thái "todo" và deadline đúng
2. **Given** dự án đã tồn tại, **When** quản lý tạo phần dự án "Frontend Development" và chọn phòng ban "Engineering", **Then** phần dự án xuất hiện dưới dự án cha và các thành viên phòng Engineering thấy được nó
3. **Given** phần dự án đã tồn tại, **When** trưởng phòng tạo task "Implement Homepage UI" với deadline 2026-02-15 và gán cho developer A, **Then** task xuất hiện trong kanban board của developer A ở cột "todo"
4. **Given** developer A xem kanban board của mình, **When** kéo task từ "todo" sang "in-progress", **Then** trạng thái task cập nhật ngay lập tức và các thành viên khác thấy thay đổi mà không cần refresh
5. **Given** developer A hoàn thành task, **When** kéo task sang "done", **Then** task chuyển sang done và phần dự án/dự án cha cập nhật tiến độ phần trăm hoàn thành

---

### User Story 2 - Gợi Ý Phân Công Tự Động Bằng AI (Priority: P2)

Khi trưởng phòng hoặc quản lý tạo một task mới, hệ thống AI tự động gợi ý top 3 người phù hợp nhất để giao việc dựa trên kỹ năng (skills), kinh nghiệm và lịch sử hoàn thành công việc của từng thành viên. Người dùng có thể chấp nhận gợi ý hoặc tự chọn người khác.

**Why this priority**: Sau khi có hệ thống phân công cơ bản (P1), tính năng này giúp tiết kiệm thời gian và tăng độ chính xác khi phân công, đặc biệt trong các đội lớn. Tuy nhiên, hệ thống vẫn hoạt động được nếu không có AI (gán thủ công).

**Independent Test**: Trưởng phòng tạo task "Optimize Database Queries" yêu cầu kỹ năng "SQL" và "Performance Tuning". AI gợi ý developer B (có 5 năm kinh nghiệm SQL, 95% on-time completion rate), developer C (3 năm, 90% rate), và developer D (2 năm, 88% rate). Trưởng phòng chọn developer B và task được gán thành công.

**Acceptance Scenarios**:

1. **Given** trưởng phòng đang tạo task mới với title "Optimize Database Queries", **When** nhập xong title và mô tả task, **Then** hệ thống hiển thị danh sách gợi ý 3 người với điểm số phù hợp (match score) và lý do gợi ý (skills match, completion rate, availability)
2. **Given** AI đã gợi ý 3 người, **When** trưởng phòng click chọn người từ danh sách gợi ý, **Then** task được gán cho người đó và xuất hiện trong kanban board của họ
3. **Given** AI gợi ý nhưng trưởng phòng muốn chọn người khác, **When** trưởng phòng bỏ qua gợi ý và chọn thủ công từ dropdown toàn bộ thành viên, **Then** task vẫn được gán thành công cho người được chọn
4. **Given** không có thành viên nào có kỹ năng phù hợp, **When** AI không tìm được gợi ý, **Then** hệ thống hiển thị thông báo "Không có gợi ý phù hợp, vui lòng chọn thủ công" và cho phép chọn từ danh sách toàn bộ thành viên

---

### User Story 3 - Dự Báo Rủi Ro Trễ Hạn (Priority: P3)

Hệ thống tự động phân tích tiến độ các task/phần dự án/dự án dựa trên thời hạn, tiến độ hiện tại, và dữ liệu lịch sử để dự báo rủi ro trễ hạn. Tasks có rủi ro cao được đánh dấu bằng màu đỏ/cảnh báo trên kanban board. Quản lý nhận được thông báo proactive về các tasks có nguy cơ.

**Why this priority**: Tính năng này tăng giá trị cho quản lý nhưng không chặn việc sử dụng hệ thống cơ bản. P1 và P2 đã cho phép tạo, phân công và theo dõi công việc. P3 thêm layer intelligence để prevent delays.

**Independent Test**: Task "API Integration" có deadline 2026-02-01, đã ở in-progress 10 ngày nhưng progress 0%, developer gán việc có lịch sử trung bình 2 tuần để hoàn thành tasks tương tự. Hệ thống đánh dấu đỏ task này với label "High Risk - 85% chance of delay". Quản lý nhận notification và có thể reassign hoặc hỗ trợ thêm resource.

**Acceptance Scenarios**:

1. **Given** task đã in-progress được 50% thời gian deadline nhưng progress actual chỉ 10%, **When** hệ thống chạy risk analysis (mỗi 6h hoặc real-time), **Then** task được đánh dấu "Medium Risk" với màu vàng và hiển thị % risk trên card
2. **Given** task có high risk (>70%), **When** risk score vượt ngưỡng, **Then** quản lý và assignee nhận in-app notification "Task X has 85% delay risk - Review needed"
3. **Given** nhiều tasks trong cùng phần dự án có risk cao, **When** hệ thống tính toán risk tổng hợp, **Then** phần dự án cũng được đánh dấu risk và quản lý thấy tổng quan risk của toàn bộ dự án
4. **Given** task đã được đánh dấu risk nhưng developer cập nhật progress đáng kể, **When** progress tăng lên và còn đủ thời gian, **Then** risk level tự động giảm xuống và màu cảnh báo thay đổi tương ứng (xanh lá = on track)

---

### User Story 4 - Chat Với AI Assistant (Priority: P4)

Người dùng có thể mở chat sidebar và hỏi AI assistant các câu hỏi về dự án, nhiệm vụ, gợi ý phân công. Ví dụ: "Ai phù hợp làm task này nhất?", "Task X có nguy cơ trễ không?", "Gợi ý cách chia nhỏ task Y thành subtasks". AI trả lời dựa trên dữ liệu thực của dự án.

**Why this priority**: Tính năng convenience để tương tác nhanh với AI. P2 và P3 đã có AI suggestions/predictions tích hợp trong flow, P4 cho phép ad-hoc queries nhưng không bắt buộc để hệ thống hoạt động.

**Independent Test**: Quản lý mở chat sidebar, gõ "Task 'API Integration' có nguy cơ trễ không?", AI trả lời "Task 'API Integration' có 85% nguy cơ trễ hạn vì đã in-progress 10 ngày với 0% progress. Gợi ý: reassign hoặc break down thành smaller tasks." Quản lý có thể click vào suggested action để thực hiện.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập, **When** click vào icon AI chat ở sidebar, **Then** chat panel mở ra với lịch sử chat (nếu có) và input box sẵn sàng
2. **Given** chat panel đã mở, **When** người dùng gõ "Ai phù hợp làm task 'Optimize Database Queries' nhất?" và gửi, **Then** AI trả về top 3 gợi ý với lý do (giống P2) kèm link để tạo/assign task ngay
3. **Given** người dùng hỏi về risk, **When** gõ "Task X có nguy cơ trễ không?" và gửi, **Then** AI phân tích và trả về risk level, lý do, và gợi ý action (giống P3)
4. **Given** người dùng hỏi về breakdown task, **When** gõ "Gợi ý cách chia nhỏ task 'Build Authentication System'", **Then** AI trả về danh sách subtasks gợi ý (ví dụ: "1. Design user schema, 2. Implement JWT, 3. Create login API") và option để tạo các subtasks này luôn
5. **Given** AI không hiểu câu hỏi hoặc thiếu context, **When** câu hỏi mơ hồ, **Then** AI yêu cầu clarification "Bạn muốn hỏi về task nào? Vui lòng cung cấp task ID hoặc tên."

---

### User Story 5 - Quản Lý Kỹ Năng Người Dùng (Priority: P5)

Admin hoặc chính người dùng có thể cập nhật profile skills (danh sách kỹ năng với proficiency level: beginner, intermediate, advanced, expert). Skills này được AI sử dụng để matching khi gợi ý phân công (P2). Quản lý có thể xem skills matrix của toàn đội.

**Why this priority**: Cải thiện độ chính xác của AI matching (P2), nhưng P2 có thể hoạt động với heuristics cơ bản (lịch sử tasks) nếu chưa có skills data. P5 là enhancement để tối ưu hóa.

**Independent Test**: Developer A vào profile, thêm skill "React" (expert), "Node.js" (advanced), "SQL" (intermediate). Khi trưởng phòng tạo task yêu cầu React, developer A xuất hiện top 1 trong gợi ý AI. Admin xem skills matrix thấy toàn đội có 5 người biết React, 3 expert và 2 advanced.

**Acceptance Scenarios**:

1. **Given** người dùng vào trang profile của mình, **When** click "Edit Skills" và thêm skill mới "React" với level "Expert", **Then** skill xuất hiện trong profile và được lưu vào database
2. **Given** người dùng đã có skills, **When** chỉnh sửa level của skill từ "Intermediate" sang "Advanced", **Then** level được cập nhật và AI matching sử dụng level mới cho lần gợi ý tiếp theo
3. **Given** admin xem skills matrix page, **When** load trang, **Then** hiển thị bảng với rows là skills và columns là proficiency levels, cho biết số lượng người ở mỗi level
4. **Given** quản lý đang tạo task, **When** task có yêu cầu skill cụ thể (ví dụ: "React" trong description), **Then** AI ưu tiên gợi ý những người có skill "React" với level cao nhất

---

### Edge Cases

- **Dự án/task không có thành viên nào phù hợp**: AI không tìm được gợi ý, hệ thống cho phép gán thủ công hoặc gợi ý mở rộng tìm kiếm (ví dụ: từ phòng ban khác).
- **Thành viên bị quá tải (nhiều tasks in-progress)**: AI phát hiện assignee đã có >5 tasks in-progress, warning "Developer X is overloaded (6 active tasks)" và gợi ý người khác.
- **Deadline không hợp lý (quá ngắn)**: Khi tạo task với deadline < 1 ngày từ bây giờ, hệ thống warning "Short deadline - Risk of delay is high" nhưng vẫn cho phép tạo.
- **Task bị stuck ở in-progress quá lâu (>7 ngày không update)**: Hệ thống tự động đánh dấu stale và notify assignee + manager.
- **Người dùng xóa task/project đã có history**: Soft delete để giữ lại data cho AI learning, không hiển thị trong UI chính nhưng lưu archive.
- **Concurrent updates (2 người cùng edit task)**: WebSocket đảm bảo real-time sync, nếu conflict thì last-write-wins nhưng hiển thị notification "Task was updated by User Y".
- **AI response chậm (>3s)**: Hiển thị loading spinner, nếu >10s timeout thì fallback message "AI tạm thời không khả dụng, vui lòng thử lại sau".
- **Không có dữ liệu lịch sử để AI học**: Với hệ thống mới, AI dùng skills matching đơn giản, sau 20+ completed tasks mới bật risk prediction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI cho phép tạo dự án (Project) với các trường: tên, mô tả, deadline, trạng thái (todo/in-progress/done)
- **FR-002**: Hệ thống PHẢI cho phép tạo phần dự án (Project Part) thuộc một dự án, gán cho một phòng ban cụ thể
- **FR-003**: Hệ thống PHẢI cho phép tạo nhiệm vụ (Task) thuộc một phần dự án, gán cho một cá nhân cụ thể, với deadline và mô tả
- **FR-004**: Hệ thống PHẢI hiển thị danh sách projects/parts/tasks theo dạng Kanban board (3 cột: todo, in-progress, done) hoặc List view
- **FR-005**: Hệ thống PHẢI cho phép kéo-thả (drag & drop) tasks giữa các cột kanban để thay đổi trạng thái
- **FR-006**: Hệ thống PHẢI cập nhật trạng thái task real-time (WebSocket) để các thành viên khác thấy ngay không cần refresh
- **FR-007**: Hệ thống PHẢI có bộ lọc (filter) theo trạng thái, assignee, deadline, phòng ban cho kanban/list view
- **FR-008**: AI PHẢI gợi ý top 3 người phù hợp nhất khi tạo task mới, dựa trên skills, completion rate, availability
- **FR-009**: Hệ thống PHẢI cho phép user chấp nhận gợi ý AI hoặc chọn thủ công từ danh sách toàn bộ thành viên
- **FR-010**: Hệ thống PHẢI tính toán và hiển thị risk score (0-100%) cho mỗi task dựa trên tiến độ, deadline, historical data
- **FR-011**: Hệ thống PHẢI đánh dấu tasks có risk >70% bằng màu đỏ, 40-70% màu vàng, <40% màu xanh lá
- **FR-012**: Hệ thống PHẢI gửi in-app notification cho assignee và manager khi task có risk >70%
- **FR-013**: Hệ thống PHẢI có chat sidebar với AI assistant để user đặt câu hỏi về tasks, projects, assignments
- **FR-014**: AI assistant PHẢI trả lời các câu hỏi dựa trên dữ liệu thực của hệ thống (tasks, projects, users, skills)
- **FR-015**: Hệ thống PHẢI cho phép user hoặc admin cập nhật skills profile với skill name và proficiency level (beginner/intermediate/advanced/expert)
- **FR-016**: Hệ thống PHẢI hiển thị skills matrix cho admin (bảng tổng hợp skills của toàn đội)
- **FR-017**: Hệ thống PHẢI tính toán phần trăm hoàn thành của phần dự án/dự án dựa trên số tasks done/total tasks
- **FR-018**: Hệ thống PHẢI phát hiện tasks bị stuck (in-progress >7 ngày không update progress) và gửi stale notification
- **FR-019**: Hệ thống PHẢI warning khi assignee đã có >5 tasks in-progress (overloaded)
- **FR-020**: Hệ thống PHẢI soft-delete tasks/projects để giữ lại dữ liệu cho AI learning

### User Experience Requirements *(aligned with Constitution II)*

- **UX-001**: UI components PHẢI tuân theo design system thống nhất (màu sắc: xanh lá = on-track, vàng = medium-risk, đỏ = high-risk; typography: tiêu đề sans-serif rõ ràng; spacing: 8px grid system)
- **UX-002**: Mọi thao tác (tạo task, drag-drop, assign) PHẢI có feedback ngay lập tức (loading spinner <200ms, success toast message, animation smooth)
- **UX-003**: Giao diện PHẢI hỗ trợ keyboard navigation (Tab để di chuyển, Enter để submit, Escape để đóng modal) và screen readers (ARIA labels cho kanban cards)
- **UX-004**: Design PHẢI responsive: mobile (320px+ - list view only, single column), tablet (768px+ - 2 column kanban), desktop (1024px+ - 3 column kanban + sidebar)
- **UX-005**: Terminology nhất quán: "Dự án" (Project), "Phần dự án" (Project Part), "Nhiệm vụ" (Task), "Gợi ý" (Suggestion), "Rủi ro" (Risk), không dùng "công việc" hay "việc" thay thế

### Performance Requirements *(aligned with Constitution III)*

- **PERF-001**: API endpoints (GET /tasks, POST /tasks, PATCH /tasks/:id) PHẢI trả về trong <200ms (p95), AI suggestions endpoint có thể <1s với loading indicator
- **PERF-002**: First Contentful Paint <1.5s khi load kanban board lần đầu, Largest Contentful Paint <2.5s
- **PERF-003**: Memory usage <150MB khi hiển thị board với 100 tasks, không có memory leaks trong sessions >1h (đã test WebSocket connections)
- **PERF-004**: JavaScript bundles <200KB gzipped cho initial load (code-split AI chat feature để lazy load khi cần)
- **PERF-005**: Database queries PHẢI có pagination (20 tasks/page), không có N+1 queries khi load board (sử dụng eager loading cho assignees), query time <100ms

### Key Entities

- **Project (Dự án)**: Đại diện cho một dự án lớn. Attributes: id, tên, mô tả, deadline, trạng thái (todo/in-progress/done), người tạo, ngày tạo, phần trăm hoàn thành.
- **Project Part (Phần dự án)**: Một phần của dự án lớn, gán cho một phòng ban. Attributes: id, tên, mô tả, deadline, phòng ban được gán, project_id (thuộc dự án nào), trạng thái, phần trăm hoàn thành.
- **Task (Nhiệm vụ)**: Công việc chi tiết gán cho cá nhân. Attributes: id, tên, mô tả, deadline, assignee_id (người được gán), project_part_id (thuộc phần dự án nào), trạng thái, priority, progress (0-100%), risk_score (0-100%), ngày tạo, ngày cập nhật cuối.
- **User (Người dùng)**: Thành viên trong hệ thống. Attributes: id, tên, email, role (admin/manager/member), department_id (phòng ban), avatar, skills (relation đến UserSkill).
- **Department (Phòng ban)**: Đơn vị tổ chức. Attributes: id, tên, mô tả, số lượng thành viên.
- **UserSkill (Kỹ năng người dùng)**: Kỹ năng của từng user. Attributes: user_id, skill_name (ví dụ: "React"), proficiency_level (beginner/intermediate/advanced/expert), years_experience (optional).
- **TaskHistory (Lịch sử nhiệm vụ)**: Log mọi thay đổi task để AI học. Attributes: task_id, action (created/assigned/status_changed/completed), timestamp, user_id (người thực hiện), old_value, new_value.
- **AIAssignmentSuggestion (Gợi ý phân công)**: Lưu lại gợi ý AI để tracking. Attributes: task_id, suggested_user_id, match_score (0-100%), reasoning (JSON: skills_match, completion_rate, availability), accepted (true/false), timestamp.
- **Notification (Thông báo)**: In-app notifications. Attributes: user_id, type (risk_alert/stale_task/assignment), message, related_task_id, read (true/false), timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng có thể tạo một dự án, chia thành 2 phần dự án, và phân công 5 nhiệm vụ cho các cá nhân trong vòng dưới 5 phút (từ login đến hoàn thành phân công)
- **SC-002**: AI gợi ý phân công có độ chính xác >80% (tức là user chấp nhận gợi ý AI trong >80% trường hợp thay vì chọn thủ công)
- **SC-003**: Hệ thống dự báo đúng >75% các tasks có rủi ro trễ hạn (tasks được đánh dấu high risk thực sự trễ deadline)
- **SC-004**: Real-time updates phản ánh trong <2 giây trên clients khác khi một user thay đổi trạng thái task
- **SC-005**: 90% users hoàn thành onboarding (tạo dự án đầu tiên và phân công task) thành công trong lần thử đầu tiên không cần hướng dẫn
- **SC-006**: Giảm 40% thời gian quản lý dành cho phân công công việc so với phương pháp thủ công (đo bằng survey hoặc time tracking)
- **SC-007**: Hệ thống xử lý được 500 concurrent users với <1% error rate và response time vẫn <200ms (p95)
- **SC-008**: Tỷ lệ tasks hoàn thành đúng hạn tăng 25% sau 3 tháng sử dụng hệ thống (so với baseline trước khi có hệ thống)

## Assumptions

- **Assumption 1**: Người dùng đã có tài khoản và quyền truy cập (authentication/authorization được xử lý bởi hệ thống existing hoặc sẽ là feature riêng). Spec này giả định user đã login.
- **Assumption 2**: Phòng ban (departments) và cơ cấu tổ chức đã được setup sẵn trong hệ thống (admin config). Feature này không cover việc tạo/quản lý departments.
- **Assumption 3**: AI model đã được train sẵn hoặc sử dụng pre-trained model với fine-tuning trên dữ liệu công ty. Spec này không cover ML training pipeline.
- **Assumption 4**: Hệ thống chạy trên infrastructure có khả năng WebSocket (real-time) và đủ compute cho AI inference (<1s latency).
- **Assumption 5**: Dữ liệu lịch sử tối thiểu 20 completed tasks mới đủ để AI risk prediction hoạt động chính xác. Với hệ thống mới, AI sẽ dùng heuristics đơn giản (deadline proximity, assignee workload).
- **Assumption 6**: Skills data được nhập thủ công bởi users hoặc admin, không có auto-detection skills từ code commits hay external sources (có thể là enhancement sau).
- **Assumption 7**: Ngôn ngữ chính của UI là tiếng Việt (theo instructions.instructions.md), nhưng technical terms (API, JSON, WebSocket) giữ nguyên tiếng Anh.
- **Assumption 8**: Không cho phép lồng ghép phức tạp: Project → Project Parts → Tasks (3 levels max). Không có sub-projects hay sub-tasks để giữ đơn giản.

## Scope Boundaries

### In Scope
- Tạo và quản lý dự án, phần dự án, nhiệm vụ (CRUD operations)
- Kanban board và list view với drag-drop
- Real-time updates qua WebSocket
- AI gợi ý phân công (assignment suggestions)
- AI dự báo rủi ro trễ hạn (risk prediction)
- Chat với AI assistant
- Quản lý skills của users
- In-app notifications cho risk alerts và stale tasks
- Filter và search cho tasks/projects
- Soft delete để preserve historical data

### Out of Scope (có thể là features tương lai)
- Time tracking chi tiết (log số giờ làm việc cho task)
- Gantt chart view hoặc timeline view
- File attachments cho tasks
- Comments và discussions trên tasks
- Email notifications (chỉ có in-app notifications)
- Calendar integration (Google Calendar, Outlook)
- Mobile native apps (chỉ responsive web)
- External integrations (Slack, Jira, GitHub)
- Advanced reporting và analytics dashboards
- Budget tracking và resource costing
- Recurring tasks hoặc task templates
- Sub-tasks (chỉ có 3 levels: Project → Part → Task)
- User permissions granular hơn (chỉ có admin/manager/member roles cơ bản)

## Dependencies

- **Backend framework**: Cần framework hỗ trợ WebSocket (ví dụ: Node.js với Socket.io, Python với FastAPI + WebSockets)
- **AI/ML service**: Cần API hoặc library để chạy AI models (recommendation engine, risk prediction). Có thể dùng OpenAI API, custom models, hoặc rule-based system ban đầu.
- **Database**: Cần relational database (PostgreSQL) để lưu trữ entities và relationships phức tạp. Cần indexing tốt cho performance.
- **Real-time infrastructure**: WebSocket server hoặc message queue (Redis Pub/Sub) để broadcast updates.
- **Frontend framework**: Cần framework hỗ trợ drag-drop (React với react-beautiful-dnd hoặc dnd-kit), WebSocket clients, và responsive UI.

## Notes

- **Phân cấp rõ ràng 3 levels**: Project (toàn công ty) → Project Part (phòng ban) → Task (cá nhân). Không cho phép deeper nesting để tránh phức tạp.
- **AI là "gợi ý" không phải "tự động"**: AI suggest nhưng user luôn có quyền final decision. Tránh over-automation gây mất kiểm soát.
- **Risk prediction cần data**: Với hệ thống mới (cold start), AI sẽ đơn giản hơn (dựa vào deadline proximity và workload). Sau khi có 20+ completed tasks, bật full prediction model.
- **Real-time là must-have**: Đội nhóm làm việc cùng lúc nên real-time sync tránh conflicts và tăng collaboration experience.
- **Mobile-first cho field teams**: Nhiều thành viên có thể check tasks từ mobile, nên responsive design là priority cao (UX-004).
