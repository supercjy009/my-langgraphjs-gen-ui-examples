import { Message } from "@langchain/langgraph-sdk";
import { useStreamContext, UIMessage } from "@langchain/langgraph-sdk/react-ui";

// eslint-disable-next-line react-refresh/only-export-components
const NoopPreview = () => null;

// eslint-disable-next-line react-refresh/only-export-components
const NoopSetOpen = () => void 0;

export const useArtifact = () => {
  const thread = useStreamContext<
    { messages: Message[]; ui: UIMessage[] },
    {
      MetaType: {
        artifact: {
          content: (props: {
            children: React.ReactNode;
            title?: React.ReactNode;
          }) => React.ReactNode;
          open: boolean;
          setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
        };
      };
    }
  >();

  return [
    thread.meta?.artifact?.content ?? NoopPreview,
    {
      open: thread.meta?.artifact?.open ?? false,
      setOpen: thread.meta?.artifact?.setOpen ?? NoopSetOpen,
    },
  ] as const;
};
