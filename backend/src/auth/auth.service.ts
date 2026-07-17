import jwt from "jsonwebtoken";

/**
 * Auth Service (§1, §6). Issues/verifies JWTs. The backend authenticates to
 * NitroStack as an MCP client via API key/JWT (NitroStack's built-in auth).
 */
export class AuthService {
  constructor(
    private readonly secret: string,
    private readonly expiry: string,
  ) {}

  issue(subject: string): string {
    return jwt.sign({ sub: subject }, this.secret, { expiresIn: this.expiry } as jwt.SignOptions);
  }

  verify(token: string): { sub: string } {
    return jwt.verify(token, this.secret) as { sub: string };
  }
}
