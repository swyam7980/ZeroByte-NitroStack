import { Icon } from "../components/Icon.js";

const NITROCHAT_EMBED_URL =
  "https://nitrochat-penteste-zerobyte-amrita-university-amritapuri-campus.app.nitrocloud.ai/embed";

export function NitroChat() {
  return (
    <section className="flex flex-col gap-stack-md min-h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">NitroChat</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Live MCP chat surface for ZeroByte. Final agent output appears in the embedded conversation.
          </p>
        </div>
        <a
          href={NITROCHAT_EMBED_URL}
          target="_blank"
          rel="noreferrer"
          className="border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high px-4 py-2 rounded text-body-md transition-colors flex items-center gap-2"
        >
          <Icon name="open_in_new" size={18} />
          Open NitroChat
        </a>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex-1 min-h-[620px]">
        <iframe
          src={NITROCHAT_EMBED_URL}
          title="NitroChat"
          className="block w-full h-full min-h-[620px] bg-background"
          style={{ border: "none" }}
          allow="microphone *"
        />
      </div>
    </section>
  );
}
