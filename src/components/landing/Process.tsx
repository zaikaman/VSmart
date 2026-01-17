"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import ProcessCard from "./ProcessCard";

type ProcessItem = {
  number: string;
  title: string;
  description: string;
};

const processItems: ProcessItem[] = [
  {
    number: "01",
    title: "Tạo dự án",
    description:
      "Bắt đầu một dự án mới trong vài giây. VSmart tự động thiết lập cấu trúc và quyền hạn, mang lại cho bạn một khởi đầu sạch sẽ.",
  },
  {
    number: "02",
    title: "Thêm công việc",
    description:
      "Soạn thảo các tính năng mới hoặc nhập hàng loạt. Sử dụng Magic Expand để biến các dòng đơn giản thành tài liệu yêu cầu sản phẩm toàn diện.",
  },
  {
    number: "03",
    title: "Cộng tác",
    description:
      "Mời đội ngũ của bạn vào dự án. Gán vai trò Chủ sở hữu, Người chỉnh sửa hoặc Người xem để quản lý ai có thể tạo, sửa và thay đổi trạng thái.",
  },
  {
    number: "04",
    title: "Tương tác",
    description:
      "Chia sẻ lộ trình công khai. Cho phép người dùng bình chọn các tính năng họ muốn nhất và thảo luận chi tiết triển khai trực tiếp.",
  },
  {
    number: "05",
    title: "Phân tích AI",
    description:
      "Để AI là PM của bạn. Hệ thống tự động phân tích phản hồi, phân loại cảm xúc và gán điểm Tác động/Nỗ lực để giúp bạn ưu tiên.",
  },
  {
    number: "06",
    title: "Hoàn thành",
    description:
      "Ship với phong cách. Khi bạn chuyển một tính năng sang 'Hoàn thành', VSmart kích hoạt các lễ kỷ niệm, giữ cho cộng đồng hào hứng về tiến độ.",
  },
];

export default function Process({ className }: { className?: string }) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div
      className={cn(
        "content-stretch flex flex-col gap-[30px] items-start px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
      data-name="Process block"
    >
      {processItems.map((item, index) => (
        <ProcessCard
          key={index}
          number={item.number}
          title={item.title}
          description={item.description}
          isExpanded={expandedIndex === index}
          onToggle={() => handleToggle(index)}
          className="mx-[3px]"
        />
      ))}
    </div>
  );
}
