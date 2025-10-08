import { v4 as uuidv4 } from "uuid";
import { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { OpenCodeState, OpenCodeUpdate } from "../types";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import type ComponentMap from "../../../agent-uis/index";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";
import { DO_NOT_RENDER_ID_PREFIX } from "@/constants";

const PLAN = [
  "Set up project scaffolding using Create React App and implement basic folder structure for components, styles, and utilities.",
  "Create reusable UI components for TodoItem, including styling with CSS modules.",
  "Implement state management using React Context to handle todo items, including actions for adding, updating, and deleting todos.",
  "Add form functionality for creating new todos with input validation and error handling.",
  "Create filtering and sorting capabilities to allow users to view completed, active, or all todos.",
  "Implement local storage integration to persist todo items between page refreshes.",
];

export async function planner(
  state: OpenCodeState,
  config: LangGraphRunnableConfig,
): Promise<OpenCodeUpdate> {
  console.log("planner running");
  
  const ui = typedUi<typeof ComponentMap>(config);

  const lastUpdateCodeToolCall = state.messages.findLast(
    (m) =>
      m.getType() === "ai" &&
      (m as unknown as AIMessage).tool_calls?.some(
        (tc) => tc.name === "update_file",
      ),
  ) as AIMessage | undefined;
  const lastUpdateToolCallResponse = state.messages.findLast(
    (m) =>
      m.getType() === "tool" &&
      (m as unknown as ToolMessage).tool_call_id ===
        lastUpdateCodeToolCall?.tool_calls?.[0]?.id,
  ) as ToolMessage | undefined;
  const lastPlanToolCall = state.messages.findLast(
    (m) =>
      m.getType() === "ai" &&
      (m as unknown as AIMessage).tool_calls?.some((tc) => tc.name === "plan"),
  ) as AIMessage | undefined;

  const wasPlanRejected = (
    lastUpdateToolCallResponse?.content as string | undefined
  )
    ?.toLowerCase()
    .includes("rejected");

  const planToolCallArgs = lastPlanToolCall?.tool_calls?.[0]?.args;
  const executedPlans: string[] = planToolCallArgs?.executedPlans ?? [];
  const rejectedPlans: string[] = planToolCallArgs?.rejectedPlans ?? [];
  let remainingPlans: string[] = planToolCallArgs?.remainingPlans ?? PLAN;

  const proposedChangePlanItem: string | undefined =
    lastUpdateCodeToolCall?.tool_calls?.[0]?.args?.executed_plan_item;
  if (proposedChangePlanItem) {
    if (wasPlanRejected) {
      rejectedPlans.push(proposedChangePlanItem);
    } else {
      executedPlans.push(proposedChangePlanItem);
    }

    remainingPlans = remainingPlans.filter((p) => p !== proposedChangePlanItem);
  }

  const content = proposedChangePlanItem
    ? `I've updated the plan list based on the last proposed change.`
    : `I've come up with a detailed plan for building the todo app.`;

  const toolCallId = uuidv4();
  const aiMessage: AIMessage = {
    type: "ai",
    id: uuidv4(),
    content,
    tool_calls: [
      {
        name: "plan",
        args: {
          executedPlans,
          rejectedPlans,
          remainingPlans,
        },
        id: toolCallId,
        type: "tool_call",
      },
    ],
  };

  ui.push(
    {
      name: "code-plan",
      props: {
        toolCallId,
        executedPlans,
        rejectedPlans,
        remainingPlans,
      },
    },
    { message: aiMessage },
  );

  const toolMessage: ToolMessage = {
    type: "tool",
    id: `${DO_NOT_RENDER_ID_PREFIX}${uuidv4()}`,
    tool_call_id: toolCallId,
    content: "User has approved the plan.",
  };

  return {
    messages: [aiMessage, toolMessage],
    ui: ui.items,
    timestamp: Date.now(),
  };
}
