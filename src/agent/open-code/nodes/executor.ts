import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { AIMessage } from "@langchain/langgraph-sdk";
import { OpenCodeState, OpenCodeUpdate } from "../types";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import type ComponentMap from "../../../agent-uis/index";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";

export const SUCCESSFULLY_COMPLETED_STEPS_CONTENT =
  "Successfully completed all the steps in the plan. Please let me know if you need anything else!";

export async function executor(
  state: OpenCodeState,
  config: LangGraphRunnableConfig,
): Promise<OpenCodeUpdate> {
  console.log("executor running");
  const ui = typedUi<typeof ComponentMap>(config);
  const lastPlanToolCall = state.messages.findLast(
    (m) =>
      m.getType() === "ai" &&
      (m as unknown as AIMessage).tool_calls?.some((tc) => tc.name === "plan"),
  ) as AIMessage | undefined;
  const planToolCallArgs = lastPlanToolCall?.tool_calls?.[0]?.args;
  const nextPlanItem = planToolCallArgs?.remainingPlans?.[0] as
    | string
    | undefined;
  const numSeenPlans =
    [
      ...(planToolCallArgs?.executedPlans ?? []),
      ...(planToolCallArgs?.rejectedPlans ?? []),
    ]?.length ?? 0;

  if (!nextPlanItem) {
    // All plans have been executed
    const successfullyFinishedMsg: AIMessage = {
      type: "ai",
      id: uuidv4(),
      content: SUCCESSFULLY_COMPLETED_STEPS_CONTENT,
    };
    return { messages: [successfullyFinishedMsg] };
  }

  let updateFileContents = "";
  switch (numSeenPlans) {
    case 0:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-1.txt",
        "utf-8",
      );
      break;
    case 1:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-2.txt",
        "utf-8",
      );
      break;
    case 2:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-3.txt",
        "utf-8",
      );
      break;
    case 3:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-4.txt",
        "utf-8",
      );
      break;
    case 4:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-5.txt",
        "utf-8",
      );
      break;
    case 5:
      updateFileContents = await fs.readFile(
        "src/agent/open-code/nodes/plan-code/step-6.txt",
        "utf-8",
      );
      break;
    default:
      updateFileContents = "";
  }

  if (!updateFileContents) {
    throw new Error("No file updates found!");
  }

  const toolCallId = uuidv4();
  const aiMessage: AIMessage = {
    type: "ai",
    id: uuidv4(),
    content: "",
    tool_calls: [
      {
        name: "update_file",
        args: {
          new_file_content: updateFileContents,
          executed_plan_item: nextPlanItem,
        },
        id: toolCallId,
        type: "tool_call",
      },
    ],
  };

  const fullWriteAccess = !!config.configurable?.permissions?.full_write_access;

  ui.push(
    {
      name: "proposed-change",
      props: {
        toolCallId,
        change: updateFileContents,
        planItem: nextPlanItem,
        fullWriteAccess,
      },
    },
    { message: aiMessage },
  );

  return {
    messages: [aiMessage],
    ui: ui.items,
    timestamp: Date.now(),
  };
}
