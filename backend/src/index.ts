// Lambda Function URL entry point.
import { handleRequest, type HttpEvent, type HttpResult } from "./handler.js";
import { DynamoPuzzleStore } from "./store.js";
import { SsmSecretProvider } from "./secrets.js";

const deps = {
  store: new DynamoPuzzleStore(),
  secrets: new SsmSecretProvider(),
};

export async function handler(event: HttpEvent): Promise<HttpResult> {
  return handleRequest(event, deps);
}
