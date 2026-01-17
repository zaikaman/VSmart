import { cn } from "@/lib/utils";

export default function Attribution({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "w-full px-[100px] pr-[99px] max-xl:px-[60px] max-sm:px-[30px] max-w-[1440px] mx-auto",
        className
      )}
    >
      <div
        className={cn(
          "bg-[#292a32] text-white flex gap-x-[20px] gap-y-[10px] max-lg:flex-wrap justify-center items-center relative",
          "px-[20px] py-[15px]",
          "[&_a]:text-[#b9ff66] [&_a]:font-medium [&_a]:decoration-solid [&_a]:decoration-[#b9ff66] [&_a]:hover:text-[#cfff7f]"
        )}
      >
        <p>
          Powered by{" "}
          <a
            href="https://loom.com" // Placeholder
            target="_blank"
            rel="noopener noreferrer"
          >
            Loom
          </a>
        </p>
      </div>
    </footer>
  );
}
