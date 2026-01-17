import { cn } from "@/lib/utils";
import Image from "next/image";

const logos = [
  {
    src: "/assets/icons/companies/amazon.svg",
    alt: "Amazon",
    width: 124,
    widthClass: "w-[124.113px]",
  },
  {
    src: "/assets/icons/companies/dribbble.svg",
    alt: "Dribbble",
    width: 126,
    widthClass: "w-[126.369px]",
  },
  {
    src: "/assets/icons/companies/hubspot.svg",
    alt: "HubSpot",
    width: 128,
    widthClass: "w-[128.626px]",
  },
  {
    src: "/assets/icons/companies/notion.svg",
    alt: "Notion",
    width: 145,
    widthClass: "w-[145.551px]",
  },
  {
    src: "/assets/icons/companies/netflix.svg",
    alt: "Netflix",
    width: 125,
    widthClass: "w-[125.241px]",
  },
  {
    src: "/assets/icons/companies/zoom.svg",
    alt: "Zoom",
    width: 110,
    widthClass: "w-[110.573px]",
  },
];

export default function Logotypes({ className }: { className?: string }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-start justify-between px-[100px] max-xl:px-[60px] max-sm:px-[40px] max-xl:gap-[35px] overflow-x-auto [scrollbar-width:none] py-0 w-full max-w-[1440px] mx-auto",
          className
        )}
      >
        {logos.map(({ src, alt, width, widthClass }, index) => (
          <div
            key={index}
            className={cn(
              "h-[48px] grayscale overflow-clip relative shrink-0 flex items-center justify-center",
              widthClass
            )}
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={48}
              className="block max-w-none w-full h-auto"
            />
          </div>
        ))}
      </div>
      <div className="absolute left-0 top-0 h-full w-[60px] max-sm:w-[30px] bg-linear-to-r from-white to-transparent"></div>
      <div className="absolute right-0 top-0 h-full w-[60px] max-sm:w-[30px] bg-linear-to-l from-white to-transparent"></div>
    </div>
  );
}
