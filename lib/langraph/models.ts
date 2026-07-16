import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatCohere } from "@langchain/cohere";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { logger } from "@/lib/logger";
import type { RouterProvider } from "./model-router";

const _models: Record<string, BaseChatModel> = {};

function getModelInstance(provider: RouterProvider, model: string): BaseChatModel {
  const key = `${provider}:${model}`;
  if (!_models[key]) {
    switch (provider) {
      case "openrouter":
        _models[key] = new ChatOpenAI({
          modelName: model,
          apiKey: process.env.OPENROUTER_API_KEY,
          configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer": "https://thetapm.site",
              "X-Title": "Nova AI",
            },
          },
          temperature: 0.7,
          maxTokens: 4096,
        });
        break;

      case "openai":
        _models[key] = new ChatOpenAI({
          modelName: model,
          apiKey: process.env.OPENAI_API_KEY,
          temperature: 0.7,
          maxTokens: 4096,
        });
        break;

      case "gemini":
        _models[key] = new ChatGoogleGenerativeAI({
          model,
          apiKey: process.env.GEMINI_API_KEY,
          temperature: 0.7,
          maxOutputTokens: 4096,
        });
        break;

      case "cohere":
        _models[key] = new ChatCohere({
          model,
          apiKey: process.env.COHERE_API_KEY,
          temperature: 0.7,
        });
        break;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    logger.info(`[LangChain] Initialized ${provider}/${model}`);
  }

  return _models[key]!;
}

export function getLangChainModel(provider: RouterProvider, model: string): BaseChatModel {
  return getModelInstance(provider, model);
}

export function clearModelCache(): void {
  for (const key of Object.keys(_models)) {
    delete _models[key];
  }
}
