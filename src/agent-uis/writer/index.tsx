import { useArtifact } from "../utils/use-artifact";
import { useEffect, useRef, useState } from "react";

export function Writer(props: {
  title?: string;
  content?: string;
  description?: string;
  isGenerating: boolean;
}) {
  const [Artifact, { open, setOpen }] = useArtifact();
  const [content, setContent] = useState(props.content ?? "");

  // TODO: is there a cooler way how to avoid useEffect?
  useEffect(() => {
    setContent(props.content ?? "");
  }, [props.content]);

  const prevOpened = useRef(false);
  const shouldAutoOpen = !open && content.length > 0 && props.isGenerating;
  useEffect(() => {
    if (shouldAutoOpen && !prevOpened.current) {
      prevOpened.current = true;
      setOpen(true);
    }
  }, [shouldAutoOpen, setOpen]);

  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        className="border p-4 rounded-lg cursor-pointer"
      >
        <p className="font-medium">{props.title}</p>
        <p className="text-sm text-gray-500">{props.description}</p>

        {props.isGenerating && <p>Generating...</p>}
      </div>

      <Artifact title={props.title}>
        <textarea
          className="absolute inset-0 w-full h-full p-4 outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Artifact>
    </>
  );
}
