/**
 * Pin learn UI to the viewport under the navbar (h-22).
 * Avoids 100vh/calc subpixel overflow that still allowed a tiny page scroll.
 */
export default function CourseLearnLayout({ children }) {
  return (
    <div className="fixed inset-x-0 top-22 bottom-0 z-1 flex flex-col overflow-hidden bg-white">
      {children}
    </div>
  );
}
