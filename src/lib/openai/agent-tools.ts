/**
 * AI Agent Tools Definitions
 * Định nghĩa các tools mà AI Agent có thể sử dụng để thực hiện hành động
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Danh sách tất cả các tools mà AI Agent có thể sử dụng
 */
export const AI_AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'tao_du_an',
      description: 'Tạo một dự án mới trong hệ thống. Sử dụng khi người dùng yêu cầu tạo dự án mới.',
      parameters: {
        type: 'object',
        properties: {
          ten: {
            type: 'string',
            description: 'Tên của dự án',
          },
          mo_ta: {
            type: 'string',
            description: 'Mô tả chi tiết về dự án',
          },
          deadline: {
            type: 'string',
            description: 'Ngày deadline của dự án (ISO 8601 format, ví dụ: 2026-02-01T00:00:00Z)',
          },
        },
        required: ['ten', 'deadline'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'moi_thanh_vien_du_an',
      description: 'Mời một thành viên vào dự án bằng EMAIL. Tool này TỰ ĐỘNG xử lý mọi trường hợp: user đã tồn tại hoặc chưa tồn tại. CHỈ CẦN: du_an_id và email. KHÔNG CẦN kiểm tra user tồn tại trước, KHÔNG CẦN userid.',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'ID của dự án (UUID)',
          },
          email: {
            type: 'string',
            description: 'Email của người được mời. Tool sẽ tự xử lý nếu user chưa tồn tại.',
          },
          vai_tro: {
            type: 'string',
            enum: ['owner', 'admin', 'member', 'viewer'],
            description: 'Vai trò của thành viên trong dự án. Mặc định: member',
          },
        },
        required: ['du_an_id', 'email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tao_phan_du_an',
      description: 'Tạo một phần dự án mới (module/sprint). Sử dụng khi cần chia dự án thành các phần nhỏ.',
      parameters: {
        type: 'object',
        properties: {
          ten: {
            type: 'string',
            description: 'Tên của phần dự án',
          },
          mo_ta: {
            type: 'string',
            description: 'Mô tả chi tiết về phần dự án',
          },
          du_an_id: {
            type: 'string',
            description: 'ID của dự án chứa phần này',
          },
          phong_ban_id: {
            type: 'string',
            description: 'ID của phòng ban phụ trách (tùy chọn)',
          },
        },
        required: ['ten', 'du_an_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tao_task',
      description: 'Tạo một task mới trong phần dự án. Sử dụng khi cần tạo công việc cụ thể.',
      parameters: {
        type: 'object',
        properties: {
          ten: {
            type: 'string',
            description: 'Tên của task',
          },
          mo_ta: {
            type: 'string',
            description: 'Mô tả chi tiết về task',
          },
          phan_du_an_id: {
            type: 'string',
            description: 'ID của phần dự án chứa task này',
          },
          assignee_id: {
            type: 'string',
            description: 'ID của người được gán task (tùy chọn)',
          },
          deadline: {
            type: 'string',
            description: 'Ngày deadline của task (ISO 8601 format)',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Độ ưu tiên của task',
          },
        },
        required: ['ten', 'phan_du_an_id', 'deadline'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cap_nhat_task',
      description: 'Cập nhật thông tin của một task. Sử dụng khi cần thay đổi trạng thái, tiến độ, hoặc thông tin khác của task.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'ID của task cần cập nhật',
          },
          trang_thai: {
            type: 'string',
            enum: ['todo', 'in-progress', 'review', 'done'],
            description: 'Trạng thái mới của task',
          },
          progress: {
            type: 'number',
            description: 'Tiến độ hoàn thành (0-100)',
          },
          assignee_id: {
            type: 'string',
            description: 'ID người được gán task mới',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Độ ưu tiên mới',
          },
          deadline: {
            type: 'string',
            description: 'Ngày deadline mới (ISO 8601 format)',
          },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'xoa_task',
      description: 'Xóa một task khỏi dự án. Sử dụng khi cần loại bỏ task không còn cần thiết.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'ID của task cần xóa',
          },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lay_danh_sach_thanh_vien',
      description: 'Xem danh sách thành viên ĐÃ THAM GIA dự án (nếu có du_an_id) hoặc TẤT CẢ users trong hệ thống (nếu không có du_an_id). Hỗ trợ collaboration cross-organization. KHÔNG DÙNG để kiểm tra trước khi mời! Chỉ dùng khi user hỏi "ai đang trong dự án", "có bao nhiêu người", hoặc "liệt kê tất cả users".',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'ID của dự án (tùy chọn). Nếu có: lấy thành viên của dự án đó. Nếu không: lấy tất cả users trong hệ thống (không giới hạn tổ chức).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lay_danh_sach_du_an',
      description: 'Lấy danh sách các dự án mà người dùng tham gia. Sử dụng khi cần xem các dự án hiện có.',
      parameters: {
        type: 'object',
        properties: {
          trang_thai: {
            type: 'string',
            enum: ['todo', 'in-progress', 'review', 'done'],
            description: 'Lọc theo trạng thái dự án (tùy chọn)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lay_danh_sach_phan_du_an',
      description: 'Lấy danh sách các phần dự án. Sử dụng khi cần biết các phần có sẵn để tạo task.',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'ID của dự án để lọc các phần dự án',
          },
        },
        required: ['du_an_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lay_chi_tiet_task',
      description: 'Lấy thông tin chi tiết của một task. Sử dụng khi cần xem đầy đủ thông tin task.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'ID của task',
          },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cap_nhat_du_an',
      description: 'Cập nhật thông tin của một dự án. Sử dụng khi cần thay đổi tên, mô tả, deadline hoặc trạng thái dự án.',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'ID của dự án cần cập nhật',
          },
          ten: {
            type: 'string',
            description: 'Tên mới của dự án',
          },
          mo_ta: {
            type: 'string',
            description: 'Mô tả mới',
          },
          trang_thai: {
            type: 'string',
            enum: ['todo', 'in-progress', 'review', 'done'],
            description: 'Trạng thái mới',
          },
          deadline: {
            type: 'string',
            description: 'Deadline mới (ISO 8601 format)',
          },
        },
        required: ['du_an_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'xoa_thanh_vien_du_an',
      description: 'Xóa một thành viên khỏi dự án. Sử dụng khi cần loại bỏ người không còn tham gia.',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'ID của dự án',
          },
          thanh_vien_id: {
            type: 'string',
            description: 'ID của thành viên cần xóa',
          },
        },
        required: ['du_an_id', 'thanh_vien_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tim_kiem_tasks',
      description: 'Tìm kiếm tasks theo các tiêu chí. Sử dụng khi cần lọc hoặc tìm tasks cụ thể.',
      parameters: {
        type: 'object',
        properties: {
          du_an_id: {
            type: 'string',
            description: 'Lọc theo dự án',
          },
          trang_thai: {
            type: 'string',
            enum: ['todo', 'in-progress', 'review', 'done'],
            description: 'Lọc theo trạng thái',
          },
          assignee_id: {
            type: 'string',
            description: 'Lọc theo người được gán',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Lọc theo độ ưu tiên',
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Type definitions cho các tool parameters
 */
export interface TaoDuAnParams {
  ten: string;
  mo_ta?: string;
  deadline: string;
}

export interface MoiThanhVienDuAnParams {
  du_an_id: string;
  email: string;
  vai_tro?: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface TaoPhanDuAnParams {
  ten: string;
  mo_ta?: string;
  du_an_id: string;
  phong_ban_id?: string;
}

export interface TaoTaskParams {
  ten: string;
  mo_ta?: string;
  phan_du_an_id: string;
  assignee_id?: string;
  deadline: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CapNhatTaskParams {
  task_id: string;
  trang_thai?: 'todo' | 'in-progress' | 'review' | 'done';
  progress?: number;
  assignee_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
}

export interface XoaTaskParams {
  task_id: string;
}

export interface LayDanhSachThanhVienParams {
  du_an_id?: string;
}

export interface LayDanhSachDuAnParams {
  trang_thai?: 'todo' | 'in-progress' | 'review' | 'done';
}

export interface LayDanhSachPhanDuAnParams {
  du_an_id: string;
}

export interface LayChiTietTaskParams {
  task_id: string;
}

export interface CapNhatDuAnParams {
  du_an_id: string;
  ten?: string;
  mo_ta?: string;
  trang_thai?: 'todo' | 'in-progress' | 'review' | 'done';
  deadline?: string;
}

export interface XoaThanhVienDuAnParams {
  du_an_id: string;
  thanh_vien_id: string;
}

export interface TimKiemTasksParams {
  du_an_id?: string;
  trang_thai?: 'todo' | 'in-progress' | 'review' | 'done';
  assignee_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
