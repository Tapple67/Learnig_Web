import type { AIProvider } from "./types";
import { OpenAIProvider } from "./provider.openai";

export function getAIProvider(): AIProvider {
  return OpenAIProvider // gpt 연결
}