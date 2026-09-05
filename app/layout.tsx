import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '此刻 · MOMENT',
  description: '让选择与直觉相遇。一个可以亲手操纵的沉浸式 3D 塔罗体验。',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
