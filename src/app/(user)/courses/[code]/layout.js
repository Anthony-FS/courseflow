import Footer from "@/components/footer";

export default function CourseDetailLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-1 flex-col bg-white">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
