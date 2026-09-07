import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  AWS_REGION,
  PASSWORD_PARAM,
  TOKEN_SECRET_PARAM,
} from "./config.js";

export interface SecretProvider {
  password(): Promise<string>;
  tokenSecret(): Promise<string>;
}

// ---------------------------------------------------------------------------
// SSM Parameter Store (used in Lambda). Values are cached for the lifetime of
// the execution environment with a short TTL so a rotation is picked up without
// a redeploy.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

export class SsmSecretProvider implements SecretProvider {
  private client = new SSMClient({ region: AWS_REGION });
  private cache = new Map<string, { value: string; expires: number }>();

  private async fetch(name: string): Promise<string> {
    const hit = this.cache.get(name);
    if (hit && hit.expires > Date.now()) return hit.value;
    const res = await this.client.send(
      new GetParameterCommand({ Name: name, WithDecryption: true }),
    );
    const value = res.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter ${name} has no value`);
    this.cache.set(name, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  }

  password() {
    return this.fetch(PASSWORD_PARAM);
  }
  tokenSecret() {
    return this.fetch(TOKEN_SECRET_PARAM);
  }
}

// ---------------------------------------------------------------------------
// Environment variables (used by the local dev server and tests)
// ---------------------------------------------------------------------------

export class EnvSecretProvider implements SecretProvider {
  constructor(
    private pw = process.env.WORDLE_PASSWORD ?? "letmein",
    private secret = process.env.WORDLE_TOKEN_SECRET ?? "dev-secret-not-for-prod",
  ) {}
  async password() {
    return this.pw;
  }
  async tokenSecret() {
    return this.secret;
  }
}
