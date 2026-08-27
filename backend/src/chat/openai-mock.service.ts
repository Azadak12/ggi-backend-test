import { Injectable } from '@nestjs/common';

const CANNED_RESPONSES = [
  "That's an interesting question. Based on what you've described, I'd suggest starting small and iterating.",
  "Here's a mocked answer standing in for a real OpenAI completion — wire in a real API key to replace it.",
  'Great question! In short: it depends on your constraints, but the general approach is sound.',
  "I don't have live data, but conceptually the answer breaks down into a few key steps.",
  'Consider the tradeoffs carefully — there are a few valid ways to approach this.',
];

export interface MockCompletion {
  answer: string;
  tokens: number;
}

@Injectable()
export class OpenAiMockService {
  /**
   * Stands in for a real OpenAI call: waits a random delay (like real
   * network/inference latency) and returns a canned answer with a token
   * count estimated from question + answer length.
   */
  async complete(question: string): Promise<MockCompletion> {
    const delayMs = 300 + Math.floor(Math.random() * 900);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const answer =
      CANNED_RESPONSES[Math.floor(Math.random() * CANNED_RESPONSES.length)];
    const tokens = estimateTokens(question) + estimateTokens(answer);

    return { answer, tokens };
  }
}

function estimateTokens(text: string): number {
  // Rough heuristic (~4 chars/token), same ballpark real tokenizers land in.
  return Math.max(1, Math.ceil(text.length / 4));
}
