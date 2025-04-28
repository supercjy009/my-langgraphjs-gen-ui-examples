import {
  Annotation,
  LangGraphRunnableConfig,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { GenerativeUIAnnotation } from "../types";
import { ChatAnthropic } from "@langchain/anthropic";
import type ComponentMap from "../../agent-uis/index";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";
import { v4 as uuidv4 } from "uuid";
import { AIMessageChunk, type BaseMessageLike } from "@langchain/core/messages";
import { StructuredToolParams } from "@langchain/core/tools";
import { z } from "zod";

const AgentState = Annotation.Root({
  ...GenerativeUIAnnotation.spec,
});

// TODO: should we upstream this to @langchain/core?
const getFindTypedTool = <TTools extends StructuredToolParams[]>(_: TTools) => {
  return <T extends TTools[number]["name"]>(
    message: AIMessageChunk | undefined,
    toolName: T,
  ) => {
    type SchemaRaw = TTools[number]["schema"] & { name: T };
    type Args = SchemaRaw extends z.ZodSchema
      ? z.infer<SchemaRaw>
      : Record<string, any>;

    const toolCall = message?.tool_calls?.find(
      (tool) => tool.name === toolName,
    ) as { name: string; args: Partial<Args>; id?: string } | undefined;

    return toolCall;
  };
};

const typedTools = <TTool extends StructuredToolParams>(tools: TTool[]) => {
  return [tools, getFindTypedTool(tools)] as const;
};

async function writer(
  state: typeof AgentState.State,
  config: LangGraphRunnableConfig,
): Promise<typeof AgentState.Update> {
  const ui = typedUi<typeof ComponentMap>(config);
  const [tools, findTool] = typedTools([
    {
      name: "create_text_document",
      description:
        "Prepare a text document for the user with a short title and description for browsing purposes.",
      schema: z.object({ title: z.string(), description: z.string() }),
    } as const,
  ]);

  const messages: BaseMessageLike[] = state.messages.slice();

  // create an initial draft of the document
  const initStream = await new ChatAnthropic({
    model: "claude-3-5-sonnet-latest",
  })
    .bindTools(tools)
    .stream(state.messages);

  let message: AIMessageChunk | undefined;
  const artifactId = uuidv4();

  for await (const chunk of initStream) {
    message = message?.concat(chunk) ?? chunk;

    const tool = findTool(message, "create_text_document")?.args;
    if (tool) {
      ui.push(
        {
          id: artifactId,
          name: "writer",
          props: { ...tool, isGenerating: true },
        },
        { message },
      );
    }
  }
  if (message) messages.push(message);

  // great, now we can actually create a big document
  const contentStream = await new ChatAnthropic({
    model: "claude-3-5-sonnet-latest",
  })
    .withConfig({ tags: ["nostream"] }) // do not stream to the UI
    .stream([
      {
        role: "system",
        content:
          "Write a text document based on the user's request. Only output the content, do not ask any additional questions.",
      },
      ...state.messages,
    ]);

  let contentMessage: AIMessageChunk | undefined;
  for await (const chunk of contentStream) {
    contentMessage = contentMessage?.concat(chunk) ?? chunk;

    ui.push(
      {
        id: artifactId,
        name: "writer",
        props: {
          ...findTool(message, "create_text_document")?.args,
          content: contentMessage?.text ?? "",
          isGenerating: true,
        },
      },
      { message },
    );
  }

  ui.push(
    {
      id: artifactId,
      name: "writer",
      props: {
        ...findTool(message, "create_text_document")?.args,
        content: contentMessage?.text ?? "",
        isGenerating: false,
      },
    },
    { message },
  );

  for (const toolCall of message?.tool_calls ?? []) {
    if (!toolCall.id) continue;
    messages.push({
      type: "tool",
      content: "Finished",
      tool_call_id: toolCall.id,
    });
  }

  const finish = await new ChatAnthropic({
    model: "claude-3-5-sonnet-latest",
  }).invoke([
    {
      type: "system",
      content:
        "Add any additional actions the user may take after finishing up writing the document",
    },
    ...messages,
  ]);
  messages.push(finish);

  return { messages };
}

export const graph = new StateGraph(AgentState)
  .addNode("writer", writer)
  .addEdge(START, "writer")
  .compile();
