/**
 * MCP client (§6). The backend is an MCP client authenticated via API key/JWT
 * through the NitroStack Gateway; opens one MCP session per active scan. Agents
 * call tools through this client — they hold no tools themselves (§4).
 *
 * The Gateway also enforces which agent identity may call which server (§11), so
 * `requester` is passed on every call.
 */
export interface McpCallOptions {
  server: string;             // "pentester-mcp" | "reporting-mcp"
  tool: string;
  args: Record<string, unknown>;
  requester: string;          // agent identity — enforced at gateway
}

export class McpClient {
  constructor(
    private readonly gatewayUrl: string,
    private readonly apiKey: string,
    readonly scanSessionId: string,
  ) {}

  /** Discover available tools from the NitroStack registry rather than hardcoding. */
  async listTools(_server: string): Promise<string[]> {
    void this.gatewayUrl;
    void this.apiKey;
    // TODO: GET {gateway}/registry/{server}/tools
    throw new Error("not implemented");
  }

  async call<T = unknown>(_opts: McpCallOptions): Promise<T> {
    void this.gatewayUrl;
    void this.apiKey;
    // TODO: POST to gateway with scanSessionId + scope context + auth header.
    throw new Error("not implemented");
  }

  static openSession(gatewayUrl: string, apiKey: string, scanSessionId: string): McpClient {
    return new McpClient(gatewayUrl, apiKey, scanSessionId);
  }
}
