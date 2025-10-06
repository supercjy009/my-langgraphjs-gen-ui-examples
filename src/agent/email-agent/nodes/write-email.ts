import { z } from "zod";
import { EmailAgentState, EmailAgentUpdate } from "../types";
import { ChatDeepSeek } from "@langchain/deepseek";
import { formatMessages } from "@/agent/utils/format-messages";

const SEND_EMAIL_PROMPT = `You're an AI email assistant, tasked with writing an email for the user.
Use the entire conversation history between you, and the user to craft the email for them.

<conversation>
{CONVERSATION}
</conversation>

If there is NOT enough information to send an email, respond to the user requesting the missing information.
Required fields:
- subject - The subject of the email
- body - The body of the email
- to - The recipient of the email`;

const sendEmailSchema = z.object({
  subject: z.string().describe("The subject of the email"),
  body: z.string().describe("The body of the email"),
  to: z.string().describe("The recipient of the email"),
});

export async function writeEmail(
  state: EmailAgentState,
): Promise<EmailAgentUpdate> {
  const model = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0,
  }).bindTools([
    {
      name: "write_email",
      description: "Write an email based on the conversation history",
      schema: sendEmailSchema,
    },
  ]);

  const prompt = SEND_EMAIL_PROMPT.replace(
    "{CONVERSATION}",
    formatMessages(state.messages),
  );

  const response = await model.invoke([{ role: "user", content: prompt }]);

  const toolCall = response.tool_calls?.[0]?.args as
    | z.infer<typeof sendEmailSchema>
    | undefined;
  if (!toolCall) {
    return {
      messages: [response],
    };
  }

  return {
    email: toolCall,
    messages: [response],
  };
}
