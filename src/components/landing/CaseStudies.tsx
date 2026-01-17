import { cn } from "@/lib/utils";
import LearnMoreLink from "./LearnMoreLink";

type CaseStudy = {
  description: string;
};

const caseStudies: CaseStudy[] = [
  {
    description:
      "Cho cá nhân, VSmart cung cấp một lộ trình rõ ràng mà không tốn công sức. Cho người dùng thấy bạn nghiêm túc với sản phẩm, thu thập phản hồi và xây dựng công khai.",
  },
  {
    description:
      "Cho startups, VSmart gắn kết đội ngũ và các bên liên quan. Giữ mọi người cùng một trang với dòng thời gian rõ ràng về những gì đã xong, đang làm và sắp tới.",
  },
  {
    description:
      "Cho doanh nghiệp, VSmart cung cấp minh bạch quy trình. Hiển thị sự phát triển của dự án, để mọi người thấy những gì cần làm và ăn mừng mỗi khi hoàn thành.",
  },
];

export default function CaseStudies({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
      data-name="Case studies block"
    >
      <div
        className="bg-[#191a23] grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-x-[128px] max-xl:gap-x-[80px] max-lg:gap-x-[60px] gap-y-[80px] max-lg:gap-y-[60px] px-[60px] max-lg:px-[40px] pt-[70px] pb-[69px] max-lg:py-[40px] relative rounded-[45px] shrink-0 xl:ml-[3px] xl:mt-px flex-1"
        data-name="Case studies"
      >
        {caseStudies.map((caseStudy, index) => {
          return (
            <div
              key={index}
              className={cn(
                "flex flex-col gap-[18px] items-start relative shrink-0 flex-1",
                index % 2 === 0 &&
                index === caseStudies.length - 1 &&
                "max-lg:col-span-2 max-md:col-span-1"
              )}
              data-name="Case study"
            >
              {index > 0 && (
                <div
                  className={cn(
                    "absolute -left-[64px] max-xl:-left-[40px] max-lg:-left-[30px] top-0 bottom-0 w-px h-full bg-white max-md:hidden",
                    index % 2 === 0 && "max-lg:hidden"
                  )}
                  aria-hidden="true"
                />
              )}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute -top-[40px] max-lg:-top-[30px] left-0 right-0 h-px w-full bg-white hidden max-md:block",
                    index === caseStudies.length - 1 && "max-lg:block"
                  )}
                  aria-hidden="true"
                />
              )}
              <p
                className={cn(
                  "font-normal relative shrink-0 text-[18px]/[normal] text-white max-w-[286px] whitespace-pre-wrap",
                  index === caseStudies.length - 1 && "max-lg:max-w-none"
                )}
              >
                {caseStudy.description}
              </p>
              <LearnMoreLink variant="SimpleGreen" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
