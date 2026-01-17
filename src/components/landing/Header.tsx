import { cn } from "@/lib/utils";
import Button from "./Button";
import Image from "next/image";

export default function Header({ className }: { className?: string }) {
  return (
    <main
      className={cn(
        "flex items-center max-md:flex-col justify-between gap-[20px] px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div className="flex flex-col gap-[35px] max-xl:gap-[25px] items-start relative shrink-0 flex-1 pb-[34px] max-md:pb-0 max-w-[600px] max-md:max-w-none">
        <h1 className="font-medium relative shrink-0 text-[60px]/[normal] max-xl:text-[48px]/[1] whitespace-pre-wrap">
          VSmart - Hệ Thống Quản Lý Công Việc Thông Minh
        </h1>
        <Image
          src="/assets/illustrations/header.svg"
          alt="VSmart Header Illustration"
          width={601}
          height={515}
          className="hidden max-md:block mx-auto max-w-[480px] -mb-[25px]"
        />
        <p className="font-normal relative shrink-0 text-[20px]/[28px] max-xl:text-[16px]/[24px] max-w-[550px] max-md:max-w-none whitespace-pre-wrap">
          Hệ thống quản lý công việc với AI, giúp tự động gợi ý phân công, dự báo rủi ro trễ hạn, và hỗ trợ chat với AI assistant.
        </p>
        <Button
          variant="primary"
          href="/dashboard"
          className="py-[19px] pr-[36px] max-md:w-full justify-center"
        >
          Bắt đầu ngay
        </Button>
      </div>
      <div className="relative shrink-0 flex-1 max-md:hidden">
        <Image
          src="/assets/illustrations/header.svg"
          alt="VSmart Header Illustration"
          width={601}
          height={515}
          className="block max-w-full h-auto ml-auto"
        />
      </div>
    </main>
  );
}
