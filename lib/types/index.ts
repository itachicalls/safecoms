/**
 * safeComms — Core type definitions
 * All shared types used across ingestion, risk engine, bot, and dashboard.
 */

/** Risk categories detected by the rule-based engine */
export type RiskCategory =
  | 'scam_link'
  | 'impersonation'
  | 'malicious_fud'
  | 'coordinated_spam'
  | 'redirect_fud';

/** Normalized post from X Community timeline */
export interface NormalizedPost {
  post_id: string;
  author_id: string;
  author_metadata: AuthorMetadata;
  text: string;
  links: string[];
  timestamp: string; // ISO 8601
  community_id: string;
}

export interface AuthorMetadata {
  username?: string;
  follower_count?: number;
  account_age_days?: number;
  verified?: boolean;
}

/** Risk assessment output from the engine */
export interface RiskAssessment {
  category: RiskCategory;
  score: number; // 0–1
  signals: string[];
  threshold: 'flag' | 'mod_alert' | 'log_only';
}

/** Bot reply style guide — tone must stay within these bounds */
export interface BotReplyStyle {
  scam: string;
  fud: string;
  redirect_fud: string;
  impersonation: string;
}

/** Activation record — community must be explicitly activated by mod */
export interface ActivationRecord {
  community_id: string;
  activated_at: string; // ISO 8601
  activated_by: string; // mod user_id
  status: 'active' | 'inactive';
}

/** Learning loop — store for feedback without drift */
export interface LearningRecord {
  post_id: string;
  original_classification: RiskCategory;
  original_score: number;
  final_outcome: 'confirmed' | 'overturned' | 'appeal_pending';
  appeal_status?: 'none' | 'pending' | 'approved' | 'rejected';
  updated_at: string;
}
