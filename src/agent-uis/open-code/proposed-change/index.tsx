import "./index.css";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { UIMessage, useStreamContext } from "@langchain/langgraph-sdk/react-ui";
import { Message } from "@langchain/langgraph-sdk";
import { useEffect, useState } from "react";
import { getToolResponse } from "../../utils/get-tool-response";
import { useArtifact } from "../../utils/use-artifact";
import { cn } from "@/lib/utils";
import { DO_NOT_RENDER_ID_PREFIX } from "@/constants";

interface ProposedChangeProps {
  toolCallId: string;
  change: string;
  planItem: string;
  /**
   * Whether or not to show the "Accept"/"Reject" buttons
   * If true, this means the user selected the "Accept, don't ask again"
   * button for this session.
   */
  fullWriteAccess: boolean;
}

const ACCEPTED_CHANGE_CONTENT =
  "User accepted the proposed change. Please continue.";
const REJECTED_CHANGE_CONTENT =
  "User rejected the proposed change. Please continue.";

export default function ProposedChange(props: ProposedChangeProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  const thread = useStreamContext<
    { messages: Message[]; ui: UIMessage[] },
    { MetaType: { ui: UIMessage | undefined } }
  >();

  const [Artifact, { open, setOpen }] = useArtifact();
  const handleReject = () => {
    thread.submit({
      messages: [
        {
          type: "tool",
          tool_call_id: props.toolCallId,
          id: `${DO_NOT_RENDER_ID_PREFIX}${uuidv4()}`,
          name: "update_file",
          content: REJECTED_CHANGE_CONTENT,
        },
        {
          type: "human",
          content: `Rejected change.`,
        },
      ],
    });

    setIsRejected(true);
  };

  const handleAccept = (shouldGrantFullWriteAccess = false) => {
    const humanMessageContent = `Accepted change. ${shouldGrantFullWriteAccess ? "Granted full write access." : ""}`;
    thread.submit(
      {
        messages: [
          {
            type: "tool",
            tool_call_id: props.toolCallId,
            id: `${DO_NOT_RENDER_ID_PREFIX}${uuidv4()}`,
            name: "update_file",
            content: ACCEPTED_CHANGE_CONTENT,
          },
          {
            type: "human",
            content: humanMessageContent,
          },
        ],
      },
      {
        config: {
          configurable: {
            permissions: {
              full_write_access: shouldGrantFullWriteAccess,
            },
          },
        },
      },
    );

    setIsAccepted(true);
  };

  useEffect(() => {
    if (typeof window === "undefined" || isAccepted) return;
    const toolResponse = getToolResponse(props.toolCallId, thread);
    if (toolResponse) {
      if (toolResponse.content === ACCEPTED_CHANGE_CONTENT) {
        setIsAccepted(true);
      } else if (toolResponse.content === REJECTED_CHANGE_CONTENT) {
        setIsRejected(true);
      }
    }
  }, []);

  if (isAccepted || isRejected) {
    return (
      <>
        <div
          className={cn(
            "flex flex-col gap-4 w-full max-w-4xl p-4 border-[1px] rounded-xl",
            isAccepted ? "border-green-300" : "border-red-300",
          )}
          onClick={() => setOpen((open) => !open)}
        >
          <div className="flex flex-col items-start justify-start gap-2">
            <p className="text-lg font-medium">
              {isAccepted ? "Accepted" : "Rejected"} Change
            </p>
            <p className="text-sm font-mono">{props.planItem}</p>
          </div>
        </div>
        <Artifact title={props.planItem}>
          <ReactMarkdown
            children={props.change}
            components={{
              code(props) {
                const { children, className, node: _node } = props;
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    style={coldarkDark}
                    customStyle={{ margin: 0 }}
                  />
                ) : (
                  <code className={className}>{children}</code>
                );
              },
            }}
          />
        </Artifact>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-4 w-full max-w-4xl p-4 border-[1px] rounded-xl border-slate-200 transition-all cursor-pointer",
          open && "border-blue-400",
        )}
        onClick={() => setOpen((open) => !open)}
      >
        <div className="flex flex-col items-start justify-start gap-2">
          <p className="text-lg font-medium">Proposed Change</p>
          <p className="text-sm font-mono">{props.planItem}</p>
        </div>
      </div>
      <Artifact title={props.planItem}>
        <ReactMarkdown
          children={props.change}
          components={{
            code(props) {
              const { children, className, node: _node } = props;
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, "")}
                  language={match[1]}
                  style={coldarkDark}
                  customStyle={{ margin: 0 }}
                />
              ) : (
                <code className={className}>{children}</code>
              );
            },
          }}
        />
        {!props.fullWriteAccess && (
          <div className="flex gap-2 items-center w-full">
            <Button
              className="cursor-pointer w-full"
              variant="destructive"
              onClick={handleReject}
            >
              Reject
            </Button>
            <Button
              className="cursor-pointer w-full"
              onClick={() => handleAccept()}
            >
              Accept
            </Button>
            <Button
              className="cursor-pointer w-full bg-blue-500 hover:bg-blue-500/90"
              onClick={() => handleAccept(true)}
            >
              Accept, don&apos;t ask again
            </Button>
          </div>
        )}
      </Artifact>
    </>
  );
}
