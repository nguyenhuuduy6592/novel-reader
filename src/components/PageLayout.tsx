import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
}

export default function PageLayout({
  children,
  maxWidth = 'max-w-4xl',
  padding = 'py-8 px-4'
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${padding}`}>
      <div className={`${maxWidth} mx-auto`}>
        {children}
      </div>
    </div>
  );
}