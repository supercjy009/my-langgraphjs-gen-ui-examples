import { z } from "zod";
import { EmailAgentState, EmailAgentUpdate } from "../types";
import { ChatDeepSeek } from "@langchain/deepseek";

const REWRITE_EMAIL_PROMPT = `You're an AI email assistant, tasked with rewriting an email for the user.
Here is the current state of the email for the user:
<email>
  <subject>
    {SUBJECT}
  </subject>
  <body>
    {BODY}
  </body>
  <to>
    {TO}
  </to>
</email>

Here is the user's response, which should contain some request for changes to the email:
<user-response>
{USER_RESPONSE}
</user-response>

Given that, please rewrite the email. Do NOT modify anything the user does not request to be changed.`;

const sendEmailSchema = z.object({
  subject: z.string().describe("The subject of the email"),
  body: z.string().describe("The body of the email"),
  to: z.string().describe("The recipient of the email"),
});

export async function rewriteEmail(
  state: EmailAgentState,
): Promise<EmailAgentUpdate> {
  if (
    !state.humanResponse?.args ||
    typeof state.humanResponse.args !== "string"
  ) {
    throw new Error(
      "Can not rewrite email if human response args is not defined, or type string.",
    );
  }
  if (!state.email) {
    throw new Error("Can not rewrite email if email is undefined.");
  }

  const model = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0,
  }).bindTools(
    [
      {
        name: "write_email",
        description: "Write an email based on the conversation history",
        schema: sendEmailSchema,
      },
    ],
    {
      tool_choice: "write_email",
    },
  );

  const prompt = REWRITE_EMAIL_PROMPT.replace("{SUBJECT}", state.email.subject)
    .replace("{BODY}", state.email.body)
    .replace("{TO}", state.email.to)
    .replace("{USER_RESPONSE}", state.humanResponse.args);

  const response = await model.invoke([{ role: "user", content: prompt }]);

  const toolCall = response.tool_calls?.[0]?.args as
    | z.infer<typeof sendEmailSchema>
    | undefined;
  if (!toolCall) {
    throw new Error("Failed to generate email");
  }

  return {
    email: toolCall,
    messages: [response],
  };
}
