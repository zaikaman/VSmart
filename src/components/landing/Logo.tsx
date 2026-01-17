import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Logo({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-label="VSmart Logo"
      {...props}
      className={cn("flex items-center gap-2", className)}
    >
      <Image
        src="/assets/icons/logo-icon.svg"
        alt="VSmart Logo"
        width={30}
        height={30}
        className="block shrink-0"
      />
      <span className="text-[30px] font-medium leading-none">VSmart</span>
    </div>
  );
}
