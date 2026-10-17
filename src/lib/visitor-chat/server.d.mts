export type ChatConfig = {
  id: string; name: string; purpose: string; rules: string;
  sources: Array<{ title: string; href: string; text: string }>;
};
export function createChatHandler(config: ChatConfig): (request: Request) => Promise<Response>;
