import { ChatDeepSeek } from "@langchain/deepseek";
import { TripPlannerState, TripPlannerUpdate } from "../types";
import { z } from "zod";
import { formatMessages } from "@/agent/utils/format-messages";

export async function classify(
  state: TripPlannerState,
): Promise<TripPlannerUpdate> {
  if (!state.tripDetails) {
    // Can not classify if tripDetails are undefined
    return {};
  }

  const schema = z.object({
    isRelevant: z
      .boolean()
      .describe(
        "Whether the trip details are still relevant to the user's request.",
      ),
  });

  const model = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 }).bindTools(
    [
      {
        name: "classify",
        description:
          "A tool to classify whether or not the trip details are still relevant to the user's request.",
        schema,
      },
    ],
    {
      tool_choice: "classify",
    },
  );

  const prompt = `You're an AI assistant for planning trips. The user has already specified the following details for their trip:
- location - ${state.tripDetails.location}
- startDate - ${state.tripDetails.startDate}
- endDate - ${state.tripDetails.endDate}
- numberOfGuests - ${state.tripDetails.numberOfGuests}

Your task is to carefully read over the user's conversation, and determine if their trip details are still relevant to their most recent request.
You should set is relevant to false if they are now asking about a new location, trip duration, or number of guests.
If they do NOT change their request details (or they never specified them), please set is relevant to true.
`;

  const humanMessage = `Here is the entire conversation so far:\n${formatMessages(state.messages)}`;

  const response = await model.invoke(
    [
      { role: "system", content: prompt },
      { role: "human", content: humanMessage },
    ],
    { tags: ["langsmith:nostream"] },
  );

  const classificationDetails = response.tool_calls?.[0]?.args as
    | z.infer<typeof schema>
    | undefined;

  if (!classificationDetails) {
    throw new Error("Could not classify trip details");
  }

  if (!classificationDetails.isRelevant) {
    return {
      tripDetails: undefined,
    };
  }

  // If it is relevant, return the state unchanged
  return {};
}
