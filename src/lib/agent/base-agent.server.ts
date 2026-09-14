import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildSystemPrompt, type ModeId } from "./modes";
import { resolveModel } from "./provider.server";

/**
 * Quench AI base agent.
 *
 * Deliberately a single-step loop: prompt -> system instruction -> LLM -> stream.
 * Extension points for later: inject `tools`, add a planner before the call,
 * add memory retrieval before `convertToModelMessages`, add `stopWhen` for
 * multi-step tool loops.
 */
export interface AgentRunInput {
  messages: UIMessage[];
  mode: ModeId;
}

export async function runBaseAgent({ messages, mode }: AgentRunInput) {
  const { model } = resolveModel();

  return streamText({
    model,
    system: buildSystemPrompt(mode),
    messages: await convertToModelMessages(messages),
    // Extension point: tools: {}, stopWhen: stepCountIs(50)
  });
}
