import { useEffect, useState } from 'react';
import TerminalLayout from '../components/TerminalLayout';
import TabBar from '../components/TabBar';
import TerminalPanel from '../components/TerminalPanel';

interface Community {
  id: string;
  name: string | null;
  status: string;
  activatedAt: string | null;
}

interface Flag {
  id: number;
  postId: string;
  communityId: string;
  category: string;
  score: number;
  threshold: string;
  createdAt: string;
}

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'test', label: 'TEST BOT' },
  { id: 'communities', label: 'COMMUNITIES' },
  { id: 'flags', label: 'FLAGS / ALERTS' },
  { id: 'risk-engine', label: 'RISK ENGINE' },
  { id: 'activation', label: 'ACTIVATION' },
  { id: 'metrics', label: 'METRICS' },
  { id: 'compliance', label: 'COMPLIANCE' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('dev is selling, rotate into the new contract');
  const [addCommunityId, setAddCommunityId] = useState('');
  const [addCommunityName, setAddCommunityName] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [pipelineResult, setPipelineResult] = useState<{
    ingested?: number;
    flagsCreated?: number;
    repliesAttempted?: number;
    repliesSucceeded?: number;
    replyErrors?: string[];
  } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    results?: Record<string, { ok: boolean; message: string }>;
    summary?: { canUseCommunities: boolean; canUseCommunityTweets: boolean; canUseMentions: boolean; suggestion: string };
  } | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    risk: { category: string; score: number; threshold: string; signals: string[] } | null;
    reply: string | null;
    llmUsed: boolean;
    message: string;
    error?: string;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/communities').then((r) => r.json()),
      fetch('/api/flags').then((r) => r.json()),
    ])
      .then(([c, f]) => {
        setCommunities(c.communities ?? []);
        setFlags(f.flags ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeCount = communities.filter((c) => c.status === 'active').length;
  const flagCount = flags.length;
  const publicFlags = flags.filter((f) => f.threshold === 'flag').length;

  return (
    <TerminalLayout title="Dashboard">
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TerminalPanel title="SYSTEM_STATUS">
            <div className="space-y-4">
              <div className="data-row">
                <span className="data-label">Bot Handle</span>
                <span className="data-value text-terminal-green">@Safe_Coms</span>
              </div>
              <div className="data-row">
                <span className="data-label">Mode</span>
                <span className="data-value">Opt-in (mod-activated)</span>
              </div>
              <div className="data-row">
                <span className="data-label">Ingestion</span>
                <span className="data-value">&lt;5s per post</span>
              </div>
            </div>
          </TerminalPanel>
          <TerminalPanel title="QUICK_STATS">
            <div className="space-y-4">
              <div className="data-row">
                <span className="data-label">Communities Protected</span>
                <span className="data-value text-terminal-green">{activeCount}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Total Flags (24h)</span>
                <span className="data-value">{flagCount}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Public Flags</span>
                <span className="data-value text-terminal-red">{publicFlags}</span>
              </div>
            </div>
          </TerminalPanel>
          <TerminalPanel title="PIPELINE">
            <div className="space-y-2 text-terminal-muted text-xs font-mono">
              <p>Ingest → Parse Commands → Assess Risk → Reply (if flag) → Store</p>
              <p className="text-terminal-green">Circuit breaker: closed</p>
              <p>Rate limits: per-community, per-user, global</p>
              <p className="text-amber-400/80">Mention flow: reply to a post with @Safe_Coms to tag the bot.</p>
              <button
                onClick={async () => {
                  setPipelineStatus('loading');
                  setPipelineResult(null);
                  try {
                    const r = await fetch('/api/pipeline/run', { method: 'POST' });
                    const data = await r.json();
                    setPipelineStatus(data.error ? 'err' : 'ok');
                    if (!data.error) {
                      setPipelineResult({
                        ingested: data.ingested,
                        flagsCreated: data.flagsCreated,
                        repliesAttempted: data.repliesAttempted,
                        repliesSucceeded: data.repliesSucceeded,
                        replyErrors: data.replyErrors,
                      });
                      fetch('/api/flags').then((f) => f.json()).then((d) => setFlags(d.flags ?? []));
                      fetch('/api/communities').then((c) => c.json()).then((d) => setCommunities(d.communities ?? []));
                    }
                  } catch {
                    setPipelineStatus('err');
                  }
                }}
                disabled={pipelineStatus === 'loading'}
                className="mt-3 font-mono text-sm px-4 py-2 bg-terminal-green/20 border border-terminal-green/50 text-terminal-green rounded hover:bg-terminal-green/30 disabled:opacity-50"
              >
                {pipelineStatus === 'loading' ? 'Running...' : 'Run pipeline now'}
              </button>
              {pipelineStatus === 'ok' && (
                <div className="text-terminal-green text-xs mt-2 space-y-1">
                  <p>Pipeline ran. Check Flags tab.</p>
                  {pipelineResult && (
                    <>
                      <p className="font-mono text-terminal-muted">
                        ingested: {pipelineResult.ingested ?? 0} · flags: {pipelineResult.flagsCreated ?? 0} · replies: {pipelineResult.repliesSucceeded ?? 0}/{pipelineResult.repliesAttempted ?? 0}
                      </p>
                      {pipelineResult.replyErrors && pipelineResult.replyErrors.length > 0 && (
                        <p className="font-mono text-terminal-red text-[11px] break-all">
                          Reply failed: {pipelineResult.replyErrors[0]}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              {pipelineStatus === 'err' && <p className="text-terminal-red text-xs mt-2">Pipeline failed.</p>}
              <button
                onClick={async () => {
                  try {
                    const r = await fetch('/api/debug/mentions');
                    const d = await r.json();
                    if (d.ok)
                      alert(d.count > 0 ? `Found ${d.count} mention(s). Run pipeline to process.` : d.hint);
                    else alert(d.error || 'Failed');
                  } catch {
                    alert('Debug failed');
                  }
                }}
                className="mt-2 ml-2 font-mono text-xs px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded hover:bg-amber-500/30"
              >
                Test mentions
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await fetch('/api/debug/mentions-raw');
                    const d = await r.json();
                    if (d.ok) {
                      const s = d.summary;
                      alert(`${s?.tweetCount ?? 0} mention(s) from X API.\n\n${s?.hint ?? ''}`);
                      if (s?.tweetCount === 0) console.log('Raw response:', d.rawBody);
                    } else alert(d.error || 'Failed');
                  } catch {
                    alert('Debug failed');
                  }
                }}
                className="mt-2 ml-2 font-mono text-xs px-3 py-1.5 bg-slate-600/50 border border-slate-500 text-slate-400 rounded hover:bg-slate-600/70"
              >
                Debug raw
              </button>
            </div>
          </TerminalPanel>
          <TerminalPanel title="VERIFY_X_API_ACCESS">
            <p className="text-terminal-muted font-mono text-sm mb-4">
              Check which X API endpoints your app can access. Confirms Communities vs tier limits.
            </p>
            <button
              onClick={async () => {
                setVerifyLoading(true);
                setVerifyResult(null);
                try {
                  const r = await fetch('/api/verify-x-api');
                  const data = await r.json();
                  setVerifyResult(data);
                } catch (e) {
                  setVerifyResult({ ok: false });
                } finally {
                  setVerifyLoading(false);
                }
              }}
              disabled={verifyLoading}
              className="font-mono text-sm px-4 py-2 bg-terminal-cyan/20 border border-terminal-cyan/50 text-terminal-cyan rounded hover:bg-terminal-cyan/30 disabled:opacity-50"
            >
              {verifyLoading ? 'Checking...' : 'Verify X API access'}
            </button>
            {verifyResult && (
              <div className="mt-4 space-y-2 font-mono text-xs">
                {verifyResult.results && Object.entries(verifyResult.results).map(([k, v]) => (
                  <div key={k} className={v.ok ? 'text-terminal-green' : 'text-terminal-red'}>
                    {k}: {v.message}
                  </div>
                ))}
                {verifyResult.summary && (
                  <p className="text-terminal-muted mt-2">{verifyResult.summary.suggestion}</p>
                )}
              </div>
            )}
          </TerminalPanel>
        </div>
      )}

      {activeTab === 'test' && (
        <TerminalPanel title="TEST_BOT">
          <p className="text-terminal-muted font-mono text-sm mb-4">
            Run sample text through risk engine + LLM reply (no X posting). Verifies OpenAI key and risk detection.
          </p>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter sample post text..."
            className="w-full font-mono text-sm bg-terminal-elevated border border-terminal-border rounded p-3 text-terminal-text placeholder-terminal-muted mb-4 min-h-[80px]"
            rows={3}
          />
          <div className="flex gap-2 mb-4">
            <button
              onClick={async () => {
                setTestLoading(true);
                setTestResult(null);
                try {
                  const r = await fetch(`/api/test?text=${encodeURIComponent(testText)}`);
                  const data = await r.json();
                  setTestResult(data);
                } catch (e) {
                  setTestResult({ ok: false, risk: null, reply: null, llmUsed: false, message: '', error: String(e) });
                } finally {
                  setTestLoading(false);
                }
              }}
              disabled={testLoading}
              className="font-mono text-sm px-4 py-2 bg-terminal-green/20 border border-terminal-green/50 text-terminal-green rounded hover:bg-terminal-green/30 disabled:opacity-50"
            >
              {testLoading ? 'Running...' : 'Run test'}
            </button>
            <button
              onClick={() => setTestText('dev is selling, rotate into the new contract')}
              className="font-mono text-sm px-4 py-2 border border-terminal-border text-terminal-muted rounded hover:text-terminal-text"
            >
              Reset sample
            </button>
          </div>
          {testResult && (
            <div className="border-t border-terminal-border pt-4 space-y-4 font-mono text-sm">
              {testResult.ok ? (
                <>
                  {testResult.risk && (
                    <div>
                      <p className="text-terminal-muted mb-1">Risk:</p>
                      <p><span className="text-terminal-red">{testResult.risk.category}</span> — score {testResult.risk.score.toFixed(2)} — {testResult.risk.threshold}</p>
                      {testResult.risk.signals?.length > 0 && (
                        <p className="text-terminal-muted text-xs mt-1">signals: {testResult.risk.signals.join(', ')}</p>
                      )}
                    </div>
                  )}
                  {testResult.reply && (
                    <div>
                      <p className="text-terminal-muted mb-1">Reply {testResult.llmUsed ? '(LLM)' : '(template)'}:</p>
                      <p className="text-terminal-green">{testResult.reply}</p>
                    </div>
                  )}
                  <p className="text-terminal-muted text-xs">{testResult.message}</p>
                </>
              ) : (
                <p className="text-terminal-red">{testResult.error || 'Test failed'}</p>
              )}
            </div>
          )}
        </TerminalPanel>
      )}

      {activeTab === 'communities' && (
        <div className="space-y-6">
          <TerminalPanel title="ADD_COMMUNITY_FOR_TESTING">
            <p className="text-terminal-muted font-mono text-sm mb-4">
              Add your X Community ID to ingest and monitor. Find it in the community URL: x.com/i/communities/<span className="text-terminal-green">12345</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                value={addCommunityId}
                onChange={(e) => setAddCommunityId(e.target.value)}
                placeholder="Community ID (e.g. 12345)"
                className="font-mono text-sm bg-terminal-elevated border border-terminal-border rounded px-3 py-2 text-terminal-text placeholder-terminal-muted w-48"
              />
              <input
                value={addCommunityName}
                onChange={(e) => setAddCommunityName(e.target.value)}
                placeholder="Name (optional)"
                className="font-mono text-sm bg-terminal-elevated border border-terminal-border rounded px-3 py-2 text-terminal-text placeholder-terminal-muted w-40"
              />
              <button
                onClick={async () => {
                  if (!addCommunityId.trim()) return;
                  setAddStatus('loading');
                  try {
                    const r = await fetch('/api/communities/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ communityId: addCommunityId.trim(), name: addCommunityName.trim() || undefined }),
                    });
                    const data = await r.json();
                    setAddStatus(data.ok ? 'ok' : 'err');
                    if (data.ok) {
                      setCommunities((prev) => [...prev, { id: addCommunityId.trim(), name: addCommunityName.trim() || null, status: 'active', activatedAt: new Date().toISOString() }]);
                      setAddCommunityId('');
                      setAddCommunityName('');
                    }
                  } catch {
                    setAddStatus('err');
                  }
                }}
                disabled={addStatus === 'loading' || !addCommunityId.trim()}
                className="font-mono text-sm px-4 py-2 bg-terminal-green/20 border border-terminal-green/50 text-terminal-green rounded hover:bg-terminal-green/30 disabled:opacity-50"
              >
                {addStatus === 'loading' ? 'Adding...' : 'Add & activate'}
              </button>
            </div>
            {addStatus === 'ok' && <p className="text-terminal-green font-mono text-sm">Community added. Run pipeline to ingest.</p>}
            {addStatus === 'err' && <p className="text-terminal-red font-mono text-sm">Failed to add.</p>}
          </TerminalPanel>
          <TerminalPanel title="PROTECTED_COMMUNITIES">
          {loading ? (
            <p className="text-terminal-muted font-mono text-sm">Loading...</p>
          ) : communities.length === 0 ? (
            <p className="text-terminal-muted font-mono text-sm">
              No communities yet. Add one above or have a mod post @Safe_Coms activate.
            </p>
          ) : (
            <div className="space-y-3">
              {communities.map((c) => (
                <div key={c.id} className="data-row">
                  <div>
                    <span className="data-value font-medium">{c.name || c.id}</span>
                    <span className="text-terminal-muted ml-2 font-mono text-xs">{c.id}</span>
                  </div>
                  <span
                    className={`status-badge ${
                      c.status === 'active' ? 'status-active' : 'status-inactive'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TerminalPanel>
        </div>
      )}

      {activeTab === 'flags' && (
        <TerminalPanel title="RECENT_FLAGS">
          {loading ? (
            <p className="text-terminal-muted font-mono text-sm">Loading...</p>
          ) : flags.length === 0 ? (
            <p className="text-terminal-muted font-mono text-sm">No flags yet.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {flags.map((f) => (
                <div key={f.id} className="border-b border-terminal-border pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-terminal-muted">{f.postId}</span>
                    <span
                      className={`status-badge ${
                        f.threshold === 'flag' ? 'status-flag' : 'status-alert'
                      }`}
                    >
                      {f.threshold}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-terminal-green">{f.category}</span>
                    <span className="text-terminal-muted">score {f.score.toFixed(2)}</span>
                    <span className="text-terminal-muted">
                      {new Date(f.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TerminalPanel>
      )}

      {activeTab === 'risk-engine' && (
        <div className="grid gap-6 md:grid-cols-2">
          <TerminalPanel title="RISK_CATEGORIES">
            <div className="space-y-3 font-mono text-sm">
              <div className="data-row">
                <span className="text-terminal-red">scam_link</span>
                <span className="text-terminal-muted">Known drain/phishing</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-red">impersonation</span>
                <span className="text-terminal-muted">Official claim, no proof</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-warn">malicious_fud</span>
                <span className="text-terminal-muted">Panic, no evidence</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-warn">redirect_fud</span>
                <span className="text-terminal-muted">Negative + redirect</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-warn">coordinated_spam</span>
                <span className="text-terminal-muted">Coordinated repetition</span>
              </div>
            </div>
          </TerminalPanel>
          <TerminalPanel title="FUD_SCORING">
            <div className="space-y-2 font-mono text-xs">
              <p className="text-terminal-muted">Weights (cap 1.0):</p>
              <p>Phrase match: +0.25 | No evidence: +0.20 | Urgency: +0.15</p>
              <p>Redirect: +0.25 | Coordination: +0.30</p>
              <p className="mt-4 text-terminal-muted">Thresholds:</p>
              <p className="text-terminal-green">≥0.75 → public flag</p>
              <p className="text-terminal-warn">0.6–0.74 → mod-only alert</p>
              <p>&lt;0.6 → log only</p>
            </div>
          </TerminalPanel>
          <TerminalPanel title="SEED_FUD_PHRASES" className="md:col-span-2">
            <p className="font-mono text-xs text-terminal-muted mb-2">
              dev is selling | team dumped | large bundle | liquidity pulled | to zero | dead coin |
              sell this | rotate into | buy the og | new contract is legit
            </p>
          </TerminalPanel>
        </div>
      )}

      {activeTab === 'activation' && (
        <div className="grid gap-6 md:grid-cols-2">
          <TerminalPanel title="ACTIVATION_FLOW">
            <div className="space-y-4 font-mono text-sm">
              <div className="data-row">
                <span className="text-terminal-muted">1.</span>
                <span>Bot added to community → inactive</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-muted">2.</span>
                <span>Mod posts: <code className="text-terminal-green">@Safe_Coms activate</code></span>
              </div>
              <div className="data-row">
                <span className="text-terminal-muted">3.</span>
                <span>Verify mod/admin → store → reply confirm</span>
              </div>
              <div className="data-row">
                <span className="text-terminal-muted">4.</span>
                <span className="text-terminal-green">Monitoring starts (community only)</span>
              </div>
            </div>
          </TerminalPanel>
          <TerminalPanel title="DEACTIVATION">
            <p className="font-mono text-sm">
              Mod posts <code className="text-terminal-red">@Safe_Coms deactivate</code> — cooldown 1 min between commands.
            </p>
          </TerminalPanel>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="grid gap-6 md:grid-cols-2">
          <TerminalPanel title="TRANSPARENCY_REPORTS">
            <div className="space-y-4 font-mono text-sm">
              <div className="data-row">
                <span className="data-label">6h Report</span>
                <span className="data-value">Cron every 6 hours</span>
              </div>
              <div className="data-row">
                <span className="data-label">Daily Summary</span>
                <span className="data-value">00:00 UTC</span>
              </div>
              <p className="text-terminal-muted text-xs mt-4">
                Tracks: scam links, FUD attempts, impersonators, avg response time, communities protected.
              </p>
            </div>
          </TerminalPanel>
          <TerminalPanel title="REPORT_FORMAT">
            <pre className="font-mono text-xs text-terminal-muted whitespace-pre-wrap">
{`🛡️ safeComms Report (6h)
• 14 scam links flagged
• 9 FUD attempts blocked
• 3 impersonators detected
Avg response: 3.6s`}
            </pre>
          </TerminalPanel>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="grid gap-6 md:grid-cols-2">
          <TerminalPanel title="ACCOUNT_MARKING">
            <p className="font-mono text-sm text-terminal-muted">
              Account marked as automated. Transparent behavior. No harassment. No protected class targeting.
            </p>
          </TerminalPanel>
          <TerminalPanel title="TONE_BOUNDS">
            <p className="font-mono text-sm">
              Authoritative, sharp, dismissive of bad behavior. Never abusive toward protected traits or poverty.
              Attack behavior, not identity.
            </p>
          </TerminalPanel>
          <TerminalPanel title="LOGGING" className="md:col-span-2">
            <p className="font-mono text-sm text-terminal-muted">
              All flags, replies, activations, and learning outcomes are stored for audit.
            </p>
          </TerminalPanel>
        </div>
      )}
    </TerminalLayout>
  );
}
