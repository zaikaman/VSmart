<!--
SYNC IMPACT REPORT
==================
Version: 1.0.0 (Initial constitution)
Ratification Date: 2026-01-16
Last Amended: 2026-01-16

Principles Defined:
  - I. Code Quality Standards
  - II. User Experience Consistency
  - III. Performance Requirements

Sections Added:
  - Core Principles (3 principles)
  - Development Standards
  - Review & Compliance
  - Governance

Template Updates Required:
  ✅ plan-template.md - Constitution Check section needs alignment with new principles
  ✅ spec-template.md - Requirements section aligns with UX consistency principles
  ✅ tasks-template.md - Phase organization supports quality gates and performance validation
  ⚠ Commands folder - No command files found; will need verification when created

Follow-up TODOs: None - all placeholders filled with concrete values
-->

# VSmart Constitution

## Core Principles

### I. Code Quality Standards

**MUST adhere to the following non-negotiable rules:**

- **Đọc được và bảo trì được**: Mọi mã phải viết bằng tiếng Việt (tên biến, hàm, comment) trừ khi có lý do kỹ thuật rõ ràng. Tên phải mô tả rõ mục đích, không dùng từ viết tắt mơ hồ.
- **Cấu trúc rõ ràng**: Mỗi hàm/phương thức phục vụ một mục đích duy nhất. Độ phức tạp tuần hoàn (cyclomatic complexity) KHÔNG được vượt quá 10.
- **Không trùng lặp**: DRY (Don't Repeat Yourself) bắt buộc tuân thủ. Logic trùng lặp phải được tách thành các hàm/module có thể tái sử dụng.
- **Xử lý lỗi toàn diện**: Mọi điểm thất bại có thể xảy ra phải được xử lý rõ ràng. Không được để lỗi im lặng hoặc sử dụng try-catch rỗng.
- **Tài liệu hóa**: Các hàm/class công khai PHẢI có docstring/comment mô tả mục đích, tham số, và giá trị trả về.

**Lý do**: Mã chất lượng cao giảm thiểu nợ kỹ thuật, tăng tốc độ phát triển dài hạn, và đảm bảo đội ngũ mới có thể đóng góp hiệu quả. Mã tiếng Việt phù hợp với ngữ cảnh dự án và người dùng Việt Nam.

### II. User Experience Consistency

**MUST maintain uniform experience across all touchpoints:**

- **Giao diện thống nhất**: Mọi thành phần UI PHẢI tuân theo hệ thống thiết kế được định nghĩa (màu sắc, typography, spacing, component patterns). Không được tự ý tạo biến thể mới.
- **Ngôn ngữ nhất quán**: Terminology, messages, và labels phải nhất quán trong toàn bộ ứng dụng. Duy trì glossary cho các thuật ngữ chuyên môn.
- **Phản hồi tức thì**: Mọi thao tác của người dùng PHẢI có phản hồi trực quan ngay lập tức (loading states, success/error messages, animations).
- **Accessibility**: UI PHẢI hỗ trợ keyboard navigation, screen readers, và có contrast ratio tối thiểu WCAG AA (4.5:1 cho text thông thường).
- **Responsive design**: Giao diện PHẢI hoạt động tốt trên mobile (320px+), tablet (768px+), và desktop (1024px+).

**Lý do**: Trải nghiệm nhất quán xây dựng niềm tin của người dùng, giảm learning curve, và nâng cao tỷ lệ giữ chân người dùng. Accessibility đảm bảo sản phẩm phục vụ đa dạng người dùng.

### III. Performance Requirements

**MUST meet the following performance benchmarks:**

- **Response time**: API endpoints PHẢI trả về trong < 200ms (p95). Operations phức tạp được phép < 1s với loading indicator rõ ràng.
- **UI rendering**: First Contentful Paint (FCP) < 1.5s, Largest Contentful Paint (LCP) < 2.5s, Total Blocking Time (TBT) < 200ms.
- **Memory efficiency**: Ứng dụng KHÔNG được vượt quá 150MB heap usage ở idle state. Không được có memory leaks trong sessions > 1 giờ.
- **Bundle size**: JavaScript bundles PHẢI < 200KB (gzipped) cho initial load. Lazy loading bắt buộc cho các routes/features không phải critical path.
- **Database queries**: N+1 query patterns CẤM sử dụng. Mọi query danh sách PHẢI có pagination. Query time > 100ms cần được log và optimization.

**Lý do**: Performance trực tiếp ảnh hưởng đến conversion rate, SEO ranking, và user satisfaction. Slow applications làm mất người dùng và tăng chi phí infrastructure.

## Development Standards

**Technology Stack Requirements:**
- Code PHẢI viết bằng tiếng Việt (variables, functions, comments) trừ khi framework/library yêu cầu tiếng Anh
- Structured logging với JSON format bắt buộc cho production
- Versioning theo MAJOR.MINOR.PATCH (Semantic Versioning)
- Breaking changes yêu cầu MAJOR version bump và migration guide

**Observability:**
- Mọi API endpoint PHẢI log request/response timing
- Critical operations PHẢI có structured logs với correlation IDs
- Performance metrics PHẢI được thu thập và monitor (response times, error rates, resource usage)

## Review & Compliance

**Code Review Requirements:**
- Mọi PR PHẢI verify compliance với Core Principles
- Performance benchmarks PHẢI được validate trước khi merge (automated performance tests)
- Breaking changes PHẢI được document và approve bởi tech lead
- UI changes PHẢI có screenshot/video và verify design system compliance

**Quality Gates:**
- Build PHẢI pass linting và formatting checks
- Performance regression (> 10% slower) blocks merge
- Accessibility violations (WCAG AA) blocks merge

## Governance

**Constitution Authority:**
- Constitution này supersedes tất cả các practices khác trong dự án
- Mọi quyết định kỹ thuật PHẢI align với Core Principles
- Nếu có conflict giữa principles, escalate tới tech lead để clarify

**Amendment Process:**
- Amendments yêu cầu documentation rõ ràng (rationale, impact analysis)
- Version bump theo quy tắc:
  - **MAJOR**: Xóa hoặc thay đổi cơ bản một principle
  - **MINOR**: Thêm principle mới hoặc mở rộng section đáng kể
  - **PATCH**: Clarifications, typo fixes, wording improvements
- Mọi amendment PHẢI có migration plan cho existing code

**Complexity Justification:**
- Bất kỳ vi phạm principle nào PHẢI được justify trong PR description
- Temporary violations PHẢI có ticket để remediate và deadline rõ ràng
- Persistent violations cần amendment chính thức constitution

**Version**: 1.0.0 | **Ratified**: 2026-01-16 | **Last Amended**: 2026-01-16
