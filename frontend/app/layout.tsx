import React from 'react';

export const metadata = {
  title: 'RepoAtlas AI — See your codebase. Not just search it.',
  description:
    'Paste a GitHub repo. RepoAtlas AIs agents explore it, trace how features actually work, and hand you an interactive visual map — architecture, dependencies, and execution flow.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-[#111114] font-sans antialiased selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
