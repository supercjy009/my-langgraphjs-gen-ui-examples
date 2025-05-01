import { Message } from "@langchain/langgraph-sdk";
import { useStreamContext, UIMessage } from "@langchain/langgraph-sdk/react-ui";

// eslint-disable-next-line react-refresh/only-export-components
const NoopPreview = () => null;

// eslint-disable-next-line react-refresh/only-export-components
const NoopSetOpen = () => void 0;

// eslint-disable-next-line react-refresh/only-export-components
const NoopSetContext = () => void 0;

const NoopContext = {};

export function useArtifact<TContext = Record<string, unknown>>() {
  type Component = (props: {
    children: React.ReactNode;
    title?: React.ReactNode;
  }) => React.ReactNode;
  type Context = TContext | undefined;
  type Bag = {
    open: boolean;
    setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;

    context: Context;
    setContext: (value: Context | ((prev: Context) => Context)) => void;
  };

  const thread = useStreamContext<
    { messages: Message[]; ui: UIMessage[] },
    { MetaType: { artifact: { content: Component } & Bag } }
  >();

  return [
    thread.meta?.artifact?.content ?? NoopPreview,
    {
      open: thread.meta?.artifact?.open ?? false,
      setOpen: thread.meta?.artifact?.setOpen ?? NoopSetOpen,

      context: thread.meta?.artifact?.context ?? NoopContext,
      setContext: thread.meta?.artifact?.setContext ?? NoopSetContext,
    },
  ] as [Component, Bag];
}
