import NavigationBar from "@/components/landing/NavigationBar";
import Header from "@/components/landing/Header";
import Logotypes from "@/components/landing/Logotypes";
import Attribution from "@/components/landing/Attribution";
import HeadingSubheading from "@/components/landing/HeadingSubheading";
import Services from "@/components/landing/Services";
import CTA from "@/components/landing/CTA";
import CaseStudies from "@/components/landing/CaseStudies";
import Process from "@/components/landing/Process";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="relative pt-[60px] max-sm:pt-[30px]">
      <NavigationBar />
      <Header className="mt-[70px] max-sm:mt-[40px]" />
      <Logotypes className="mt-[70px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]"
        heading="Tính năng nổi bật"
        subheading="Mọi thứ bạn cần để quản lý dự án hiệu quả, minh bạch và thông minh."
      />
      <Services className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <CTA className="mt-[100px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]"
        heading="Ai sử dụng VSmart?"
        subheading="Được thiết kế cho các đội ngũ hiện đại, từ startup đến doanh nghiệp lớn."
      />
      <CaseStudies className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px] max-md:flex-col"
        heading="Cách thức hoạt động"
        subheading="Biến các cuộc thảo luận thành kế hoạch hành động trong tích tắc."
        subheadingClassName="max-w-[500px]"
      />
      <Process className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />

      <HeadingSubheading
        className="mt-[100px] max-lg:mt-[80px] max-sm:mt-[60px]"
        heading="Được tin dùng bởi cộng đồng"
        subheading="Lắng nghe chia sẻ từ những người đang xây dựng sản phẩm với VSmart."
        subheadingClassName="max-w-[473px]"
      />
      <Testimonials className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />

      <Footer className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]" />
      <Attribution />
    </div>
  );
}
