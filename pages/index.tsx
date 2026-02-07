import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import TerminalLayout from '../components/TerminalLayout';
import TerminalPanel from '../components/TerminalPanel';

export default function Home() {
  return (
    <>
      <Head>
        <title>safeComms — X Community Safeguard</title>
        <meta name="description" content="Autonomous community safeguard for X Communities" />
      </Head>
      <TerminalLayout title="Home" showNav={true}>
        {/* Hero — logo + headline */}
        <div className="flex flex-col items-center text-center py-12 md:py-20">
          <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6">
            <Image
              src="/logo.png"
              alt="safeComms — X Community Safeguard"
              width={160}
              height={160}
              className="object-contain drop-shadow-glow-red"
            />
          </div>
          <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tight mb-2">
            safeComms<span className="text-terminal-red">//</span>
          </h1>
          <p className="font-mono text-terminal-muted text-sm md:text-base mb-8 max-w-xl">
            Autonomous community safeguard for X Communities. Detects scams, impersonation, and malicious FUD.
          </p>
          <Link
            href="/dashboard"
            className="font-mono text-sm px-6 py-3 bg-terminal-green/20 border border-terminal-green/50 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
          >
            OPEN DASHBOARD
          </Link>
        </div>

        {/* Info panels — terminal style */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          <TerminalPanel title="OPT_IN">
            <p className="font-mono text-sm text-terminal-muted">
              Bot never auto-activates. Mod posts <code className="text-terminal-green">@Safe_Coms activate</code> to enable.
            </p>
          </TerminalPanel>
          <TerminalPanel title="RISK_ENGINE">
            <p className="font-mono text-sm text-terminal-muted">
              Rule-based: scam_link, impersonation, malicious_fud, redirect_fud. FUD scoring with thresholds.
            </p>
          </TerminalPanel>
          <TerminalPanel title="TRANSPARENCY">
            <p className="font-mono text-sm text-terminal-muted">
              Reports every 6h + daily summary. Public flags for high-risk; mod-only alerts for medium.
            </p>
          </TerminalPanel>
        </div>

        {/* How it works — full width */}
        <TerminalPanel title="HOW_IT_WORKS" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6 font-mono text-sm">
            <div>
              <p className="text-terminal-muted mb-2">Activation flow</p>
              <ul className="space-y-1 text-terminal-muted">
                <li>1. Bot added → inactive</li>
                <li>2. Mod posts @Safe_Coms activate</li>
                <li>3. Verified → monitoring starts</li>
                <li>4. Deactivate: @Safe_Coms deactivate</li>
              </ul>
            </div>
            <div>
              <p className="text-terminal-muted mb-2">Pipeline</p>
              <ul className="space-y-1 text-terminal-muted">
                <li>Ingest → Parse commands → Assess risk</li>
                <li>Reply (if public flag) → Store</li>
                <li>LLM layer: bounded, fixed prompts</li>
                <li>Rate limits + circuit breaker</li>
              </ul>
            </div>
          </div>
        </TerminalPanel>
      </TerminalLayout>
    </>
  );
}
