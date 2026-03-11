/**
 * Message Card Serializer
 *
 * Parses markdown for card fenced code blocks and serializes cards back to
 * markdown. Cards are fenced code blocks whose language tag matches a known
 * CardType from the protocol.
 */

import type { MessageCard, CardType } from './protocol.js';
import { CARD_TYPES } from './protocol.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedBlock {
  /** Language tag from the fenced code block. */
  type: CardType | string;
  /** Original content inside the fences (untouched). */
  raw: string;
  /** Parsed card object when the block is a recognized and valid card. */
  card?: MessageCard;
  /** Error message when the block is a recognized card type but fails to parse. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Regex that matches fenced code blocks.
 *
 * Captures:
 *   1 — the fence characters (3+ backticks) to match the closing fence
 *   2 — the language / info-string (trimmed)
 *   3 — the content between the fences
 *
 * The closing fence must use at least as many backticks as the opening fence.
 * Using a function to get a fresh regex each call (stateful with /g flag).
 */
function fencedBlockRegex(): RegExp {
  return /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1\s*$/gm;
}

/**
 * Attempt to parse a JSON string into a MessageCard, injecting the `type`
 * field when it is absent.
 */
function tryParseCard(
  json: string,
  cardType: CardType,
): { card: MessageCard; error?: undefined } | { card?: undefined; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: `Invalid JSON: ${message}` };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'Card payload must be a JSON object' };
  }

  // Inject `type` if the author omitted it.
  const record = parsed as Record<string, unknown>;
  if (!('type' in record)) {
    record['type'] = cardType;
  }

  // Validate that the type field matches a known CardType
  const declaredType = record['type'];
  if (typeof declaredType !== 'string' || !CARD_TYPES.has(declaredType)) {
    return { error: `Unknown card type: ${String(declaredType)}` };
  }

  // Ensure declared type matches the fenced block language tag
  if (declaredType !== cardType) {
    return { error: `Card type mismatch: block says "${cardType}" but payload says "${declaredType}"` };
  }

  return { card: record as unknown as MessageCard };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse markdown text and extract **all** fenced code blocks.
 *
 * - Blocks whose language tag is a known `CardType` are parsed as JSON cards.
 *   A successful parse populates `card`; a failure populates `error`.
 * - Blocks with unknown language tags are returned as-is (no `card`, no
 *   `error`) — they are regular code blocks the caller may render verbatim.
 */
export function parseMessageCards(markdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const re = fencedBlockRegex();

  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    const langTag = (match[2] ?? '').trim();
    const content = match[3] ?? '';

    if (CARD_TYPES.has(langTag)) {
      const cardType = langTag as CardType;
      const result = tryParseCard(content, cardType);

      if (result.card !== undefined) {
        blocks.push({ type: cardType, raw: content, card: result.card });
      } else {
        blocks.push({ type: cardType, raw: content, error: result.error });
      }
    } else {
      // Regular code block — pass through unchanged.
      // Note: 'code_block' is NOT a card type; this is just a fallback label
      // for blocks with no language tag.
      blocks.push({ type: langTag || 'unknown', raw: content });
    }
  }

  return blocks;
}

/**
 * Serialize a single card to a fenced markdown code block.
 *
 * The language tag is set to `card.type`, and the body is pretty-printed JSON.
 */
export function serializeCard(card: MessageCard): string {
  const tag = card.type;
  const json = JSON.stringify(card, null, 2);
  return `\`\`\`${tag}\n${json}\n\`\`\``;
}

/**
 * Serialize an array of cards, joining each fenced block with a blank line.
 */
export function serializeCards(cards: MessageCard[]): string {
  return cards.map(serializeCard).join('\n\n');
}
