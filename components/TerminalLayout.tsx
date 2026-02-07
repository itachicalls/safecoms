import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

interface TerminalLayoutProps {
  title: string;
  children: React.ReactNode;
  showNav?: boolean;
}

export default function TerminalLayout({ title, children, showNav = true }: TerminalLayoutProps) {
  return (
    <>
      <Head>
        <title>{title} — safeComms</title>
      </Head>
      <div className="min-h-screen bg-terminal-bg text-terminal-text">
        {/* Top bar — terminal style */}
        <header className="border-b border-terminal-border bg-terminal-surface">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="safeComms"
                  width={40}
                  height={40}
                  className="object-contain group-hover:opacity-90 transition-opacity"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-semibold text-sm tracking-wide">
                  safeComms<span className="text-terminal-red ml-1">//</span>
                </span>
                <span className="font-mono text-xs text-terminal-muted">
                  X Community Safeguard
                </span>
              </div>
            </Link>

            {showNav && (
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="font-mono text-xs text-terminal-muted hover:text-terminal-green transition-colors"
                >
                  HOME
                </Link>
                <Link
                  href="/dashboard"
                  className="font-mono text-xs text-terminal-muted hover:text-terminal-green transition-colors"
                >
                  DASHBOARD
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </>
  );
}
