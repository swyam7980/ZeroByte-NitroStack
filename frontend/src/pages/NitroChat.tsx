import { Icon } from "../components/Icon.js";

const NITROCHAT_URL =
  "https://nitrochat-penteste-zerobyte-amrita-university-amritapuri-campus.app.nitrocloud.ai";

/**
 * NitroChat page. The NitroChat widget script is loaded in index.html as a
 * floating chat bubble on every page. This page just provides info and a link
 * to open the full-screen version.
 */
export function NitroChat() {
  return (
    <section className="flex flex-col items-center justify-center gap-stack-lg min-h-[calc(100vh-8rem)] max-w-lg mx-auto text-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
        <Icon name="chat" size={32} className="text-on-primary-container" />
      </div>
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">NitroChat</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          The NitroChat floating widget is available on every page — look for the chat bubble in the bottom-right corner.
          Click it to start interacting with the pentester agents.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        <a
          href={NITROCHAT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container px-6 py-3 rounded-lg text-body-lg font-semibold transition-colors shadow-sm"
        >
          <Icon name="open_in_new" size={20} />
          Open Full Chat
        </a>
      </div>
    </section>
  );
}
