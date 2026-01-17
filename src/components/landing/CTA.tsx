import { cn } from "@/lib/utils";
import Button from "./Button";
import Image from "next/image";

type CTAProps = {
  className?: string;
};

export default function CTA({ className }: CTAProps) {
  return (
    <div
      className={cn(
        "flex items-center px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div className="bg-[#f3f3f3] flex items-center justify-between px-[60px] max-xl:px-[40px] max-sm:px-[30px] py-0 gap-[10px] relative rounded-[45px] shrink-0 w-full my-[23px]">
        <div className="flex flex-col gap-[26px] items-start relative shrink-0 flex-3 max-lg:flex-4 py-[40px] max-sm:py-[30px]">
          <h3 className="font-medium leading-[normal] relative shrink-0 text-[30px] text-black max-w-[500px] whitespace-pre-wrap">
            Sẵn sàng tối ưu hóa quy trình làm việc?
          </h3>
          <Image
            src="/assets/illustrations/cta.svg"
            alt="VSmart CTA"
            width={359}
            height={394}
            className="hidden max-md:block mx-auto max-w-[300px] -my-[24px]"
          />
          <p className="font-normal relative shrink-0 text-[18px]/[normal] text-black max-w-[500px] whitespace-pre-wrap">
            Tham gia cùng các đội ngũ đang sử dụng VSmart để quản lý dự án hiệu quả hơn. Bắt đầu ngay hôm nay.
          </p>
          <Button
            href="/dashboard"
            variant="primary"
            className="py-[19px] mb-[2px] max-sm:w-full justify-center"
          >
            Bắt đầu miễn phí
          </Button>
        </div>
        <div className="flex-2 w-full max-w-[494px] flex items-center justify-center shrink-0 relative pr-[40px] -my-[24px] max-md:hidden">
          <Image
            src="/assets/illustrations/cta.svg"
            alt="VSmart CTA"
            width={359}
            height={394}
            className="block h-auto w-full max-w-[359px]"
          />
        </div>
      </div>
    </div>
  );
}
