/**
 * AI Provider Diagnostic Script v2
 * Tests with the EXACT streaming pipeline used by the route handler
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const OPENROUTER_KEY = process.env.OPENROUTER;
console.log('=== AI PROVIDER DIAGNOSTIC v2 ===');
console.log(`OPENROUTER key present: ${!!OPENROUTER_KEY}`);
console.log(`OPENROUTER key length: ${OPENROUTER_KEY?.length ?? 0}`);

if (!OPENROUTER_KEY) {
  console.error('FATAL: No OpenRouter API key found');
  process.exit(1);
}

const provider = createOpenAI({
  apiKey: OPENROUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://thetapm.site',
    'X-Title': 'Nova AI',
  },
});

const model = provider('openai/gpt-4o-mini');
console.log(`Model created: openai/gpt-4o-mini`);

// Simulate a system prompt similar to the actual route handler
const SYSTEM_PROMPT = `
THETA NOVA CONSTITUTION V1

SECTION 1 — IDENTITY

Purpose: Autonomous AI operator for Theta project management platform.
Roles: Operator, Analyst, Assistant, Advisor.
Current Stage: Nova Alpha — Core Capabilities.

Identity Rules (Must):
  • Always identify as Nova
  • Always be professional, data-driven, and proactive
  • Execute tools when asked — never just acknowledge
  • Use bold for entity names, markdown tables for data
  
[OPERATING GUIDELINES]
1. PRIORITIZE ACTION: Use tools immediately when a user request can be fulfilled by them.
2. EXPLAINABILITY: Always explain *why* you are taking an action.
3. FORMATTING: Use bold for entity names. Use markdown tables for data.

[DECISION FRAMEWORK EVALUATION]
- Intent: READ
- Risk Level: low
- Strategy: PATH_A_IMMEDIATE
- Priority: Action/Outcome first, then Explanation last.

[CHAT MODE] This is a general conversation. Respond naturally and helpfully. You do not have access to workspace tools in this mode.
`;

async function testPipeline(label, promptText) {
  console.log(`\n=== TEST: ${label} ===`);
  console.log(`Prompt: "${promptText}"`);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(`Timeout`);
  }, 60000);

  const start = Date.now();
  let finishReason = 'unknown';
  let finishText = '';
  let finishToolCalls = [];

  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: promptText,
      tools: undefined,
      maxRetries: 2,
      abortSignal: abortController.signal,
      onError: ({ error }) => {
        console.error(`[${label}] onError:`, error instanceof Error ? error.message : error);
      },
      onFinish: ({ text, finishReason: fr, toolCalls }) => {
        finishReason = fr;
        finishText = text || '';
        finishToolCalls = toolCalls || [];
        clearTimeout(timeoutId);
        console.log(`[${label}] onFinish:`);
        console.log(`  finishReason: ${fr}`);
        console.log(`  text length: ${text?.length ?? 0}`);
        console.log(`  toolCalls: ${toolCalls?.length ?? 0}`);
      },
    });

    console.log(`[${label}] typeof result.textStream: ${typeof result.textStream}`);
    console.log(`[${label}] constructor: ${result.textStream?.constructor?.name}`);

    if (!result.textStream) {
      console.error(`[${label}] FATAL: textStream is null`);
      return;
    }

    // === EXACT PIPELINE USED BY ROUTE HANDLER ===
    let hasContent = false;
    let totalChunks = 0;
    let totalBytes = 0;

    const safeStream = result.textStream.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        hasContent = true;
        totalChunks++;
        totalBytes += chunk.length;
        controller.enqueue(chunk);
      },
      flush(controller) {
        console.log(`[${label}] TransformStream flush:`);
        console.log(`  hasContent: ${hasContent}`);
        console.log(`  totalChunks: ${totalChunks}`);
        console.log(`  totalBytes: ${totalBytes}`);
        if (!hasContent) {
          console.error(`[${label}] EMPTY STREAM - enqueuing fallback`);
          controller.enqueue('Nova could not generate a response. Check logs.');
        }
      },
    }));

    // Read the safeStream
    const reader = safeStream.getReader();
    let outputChunks = 0;
    let outputText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        outputChunks++;
        outputText += value;
      }
    } catch (e) {
      console.error(`[${label}] safeStream read error:`, e instanceof Error ? e.message : e);
    }

    const elapsed = Date.now() - start;
    console.log(`[${label}] Result:`);
    console.log(`  input chunks via transform: ${totalChunks}`);
    console.log(`  output chunks from safeStream: ${outputChunks}`);
    console.log(`  output chars: ${outputText.length}`);
    console.log(`  elapsed ms: ${elapsed}`);
    
    if (outputText.length > 0 && outputText !== 'Nova could not generate a response. Check logs.') {
      console.log(`  preview: "${outputText.substring(0, 200)}"`);
    } else if (outputText === 'Nova could not generate a response. Check logs.') {
      console.error(`  [${label}] FALLBACK TEXT RETURNED`);
    } else {
      console.error(`  [${label}] EMPTY OUTPUT`);
    }

    // Check if result.text (Promise) resolves
    try {
      const resolvedText = await result.text;
      console.log(`[${label}] result.text resolved: length=${resolvedText?.length ?? 0}`);
      if (resolvedText) {
        console.log(`  result.text: "${resolvedText.substring(0, 100)}"`);
      }
    } catch (e) {
      console.error(`[${label}] result.text error:`, e instanceof Error ? e.message : e);
    }

    return { outputText, totalChunks, finishReason, elapsed };

  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`[${label}] streamText threw:`, e instanceof Error ? e.message : e);
    return { outputText: '', totalChunks: 0, finishReason: 'error', elapsed: Date.now() - start };
  }
}

// Run tests
async function main() {
  const results = [];
  results.push(await testPipeline('Hello', 'Hello'));
  results.push(await testPipeline('Who are you', 'What is your name?'));
  results.push(await testPipeline('Explain Agile', 'Explain Agile'));

  console.log('\n=== SUMMARY ===');
  results.forEach((r, i) => {
    const labels = ['Hello', 'Who are you', 'Explain Agile'];
    console.log(`${labels[i]}: chunks=${r.totalChunks}, chars=${r.outputText.length}, finish=${r.finishReason}, elapsed=${r.elapsed}ms`);
  });

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(e => {
  console.error('Script error:', e);
  process.exit(1);
});
