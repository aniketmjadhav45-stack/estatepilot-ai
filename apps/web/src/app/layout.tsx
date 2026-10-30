import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EstatePilot AI — Your AI-Powered Real Estate Business Operating System',
  description:
    'Commercial multi-tenant Real Estate CRM and AI Agent Automation platform for agents, brokerages, and enterprises.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
