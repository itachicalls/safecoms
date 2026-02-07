/**
 * safeComms — Risk Engine (Rule-Based First)
 * Categories: scam_link, impersonation, malicious_fud, coordinated_spam
 * FUD scoring: phrase match, no evidence, urgency, redirect, coordination.
 */

import type { NormalizedPost } from '../types';
import type { RiskCategory } from '../types';
import { FUD_PHRASES, URGENCY_TRIGGERS } from './fud-phrases';

const SCAM_DOMAINS = [
  'pumpfun',
  'dexscreener',
  'phishing',
  'wallet-drain',
  'fake-contract',
  'solana-airdrop',
  'claim-now',
  'free-tokens',
].map((d) => d.toLowerCase());

const IMPERSONATION_SIGNALS = ['official', 'team', 'dev ', 'founder', 'ceo', 'admin'];

/** FUD scoring weights — cap at 1.0 */
const WEIGHTS = {
  phraseMatch: 0.25,
  noEvidence: 0.2,
  urgency: 0.15,
  redirect: 0.25,
  coordination: 0.3,
};

const THRESHOLDS = {
  publicFlag: 0.75,
  modAlert: 0.6,
};

type Assessment = {
  category: RiskCategory;
  score: number;
  signals: string[];
  threshold: 'flag' | 'mod_alert' | 'log_only';
};

function cap(score: number): number {
  return Math.min(1, Math.max(0, score));
}

/** Scam link detection — known drain/phishing patterns */
function assessScamLink(post: NormalizedPost): Assessment | null {
  const text = post.text.toLowerCase();
  const links = post.links.map((l) => l.toLowerCase());
  const allText = [text, ...links].join(' ');

  for (const domain of SCAM_DOMAINS) {
    if (allText.includes(domain)) {
      return {
        category: 'scam_link',
        score: 0.85,
        signals: [`scam_domain:${domain}`],
        threshold: 'flag',
      };
    }
  }

  // Generic suspicious link pattern
  const hasLink = post.links.length > 0;
  const hasUrgency = URGENCY_TRIGGERS.some((u) => text.includes(u.toLowerCase()));
  if (hasLink && hasUrgency && text.length < 200) {
    return {
      category: 'scam_link',
      score: 0.65,
      signals: ['link_with_urgency'],
      threshold: 'mod_alert',
    };
  }

  return null;
}

/** Impersonation — claims to be official/team without proof */
function assessImpersonation(post: NormalizedPost): Assessment | null {
  const text = post.text.toLowerCase();
  // Skip if FUD context: "dev is selling", "team dumped" etc are FUD, not impersonation
  const fudContext = /dev is (sell|dump|rugg)/i.test(post.text) || /team (dump|sell|rugg)/i.test(post.text);
  if (fudContext) return null;

  const hasSignal = IMPERSONATION_SIGNALS.some((s) => text.includes(s.toLowerCase()));
  const hasEvidence = /0x[a-fA-F0-9]{40}|tx\s*[a-zA-Z0-9]+|etherscan|solscan/i.test(post.text);

  if (hasSignal && !hasEvidence) {
    return {
      category: 'impersonation',
      score: 0.7,
      signals: ['impersonation_claim_no_evidence'],
      threshold: 'flag',
    };
  }

  return null;
}

/** FUD scoring — explicit malicious FUD / redirect FUD */
function assessFud(post: NormalizedPost, recentPostsByAuthor?: string[]): Assessment | null {
  const text = post.text.toLowerCase();
  let score = 0;
  const signals: string[] = [];

  // Phrase match
  const phraseMatches = FUD_PHRASES.filter((p) => text.includes(p.toLowerCase()));
  if (phraseMatches.length > 0) {
    score += WEIGHTS.phraseMatch;
    signals.push(`phrase:${phraseMatches.join(',')}`);
  }

  // No evidence
  const hasTxHash = /0x[a-fA-F0-9]{64}|tx\s*[a-zA-Z0-9]+|etherscan|solscan|bscscan/i.test(post.text);
  if (!hasTxHash && phraseMatches.length > 0) {
    score += WEIGHTS.noEvidence;
    signals.push('no_evidence');
  }

  // Urgency
  const hasUrgency = URGENCY_TRIGGERS.some((u) => text.includes(u.toLowerCase()));
  if (hasUrgency) {
    score += WEIGHTS.urgency;
    signals.push('urgency');
  }

  // Redirect (negative claim + alternative token/contract) — "dev is selling buy the og" etc
  const hasNegative = /dump|sell|selling|scam|rugged|dead|zero/i.test(text);
  const hasRedirect = /buy |get |swap |new contract|migrate to|rotate into|buy the og/i.test(text);
  if (hasNegative && hasRedirect) {
    score += WEIGHTS.redirect;
    signals.push('redirect_fud');
  }

  // Coordination (repeated by same author)
  const coordinationBoost = recentPostsByAuthor?.filter((t) =>
    FUD_PHRASES.some((p) => t.toLowerCase().includes(p))
  ).length ?? 0;
  if (coordinationBoost >= 2) {
    score += WEIGHTS.coordination;
    signals.push('coordinated_repetition');
  }

  if (score === 0) return null;

  // Redirect FUD gets higher score so we reply publicly
  if (signals.includes('redirect_fud')) score = Math.max(score, 0.78);
  score = cap(score);
  const threshold: Assessment['threshold'] =
    score >= THRESHOLDS.publicFlag ? 'flag' : score >= THRESHOLDS.modAlert ? 'mod_alert' : 'log_only';

  const category: RiskCategory = signals.includes('redirect_fud') ? 'redirect_fud' : 'malicious_fud';

  return {
    category,
    score,
    signals,
    threshold,
  };
}

/** Main assessor — returns highest-risk assessment */
export function assessPost(post: NormalizedPost, context?: { recentByAuthor?: string[] }): Assessment | null {
  const scam = assessScamLink(post);
  const imp = assessImpersonation(post);
  const fud = assessFud(post, context?.recentByAuthor);

  const candidates = [scam, imp, fud].filter(Boolean) as Assessment[];
  if (candidates.length === 0) return null;

  return candidates.reduce((a, b) => (a.score >= b.score ? a : b));
}
