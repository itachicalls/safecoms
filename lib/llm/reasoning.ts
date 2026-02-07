/**
 * safeComms — LLM Reasoning Layer (BOUNDED)
 * Use LLM ONLY for: context interpretation, intent classification, reply generation.
 * CANNOT: change thresholds, rules, self-modify prompts.
 */

import OpenAI from 'openai';
import { SYSTEM_PROMPT, REPLY_GUIDE } from './prompts';
import type { RiskCategory } from '../types';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** Generate a reply within strict tone bounds (optional LLM polish) */
const CATEGORY_MAP: Partial<Record<RiskCategory, keyof typeof REPLY_GUIDE>> = {
  scam_link: 'scam',
  impersonation: 'impersonation',
  malicious_fud: 'fud',
  redirect_fud: 'redirect_fud',
  coordinated_spam: 'fud',
};

export async function generateReply(
  category: RiskCategory,
  postText: string
): Promise<string> {
  const key = CATEGORY_MAP[category] ?? 'fud';
  const base = REPLY_GUIDE[key] ?? REPLY_GUIDE.fud;

  if (!openai) {
    return base;
  }

  try {
    const excerpt = postText.slice(0, 200).trim();
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a SHORT reply (max 200 chars) for a ${category} flag. Reference the SPECIFIC claims in the post. Base tone: "${base}"

Post content: "${excerpt}"

Your reply must directly address what the post says (e.g. if it says "dev is selling buy the og", call out that sell+buy redirect pattern). Keep tone within bounds. Do not invent facts.`,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const text = res.choices[0]?.message?.content?.trim();
    if (text && text.length <= 280) return text;
  } catch (err) {
    console.error('[LLM] Reply generation failed:', err);
  }

  return base;
}
