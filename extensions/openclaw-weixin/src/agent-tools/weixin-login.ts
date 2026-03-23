import {
  DEFAULT_ILINK_BOT_TYPE,
  WEIXIN_DEFAULT_SESSION_KEY,
  startWeixinLoginWithQr,
  waitForWeixinLogin,
} from "../auth/login-qr.js";
import { loadWeixinAccount, DEFAULT_BASE_URL } from "../auth/accounts.js";
import { renderQrDataUrl } from "../util/qr-image.js";

/**
 * Raw JSON Schema for the tool parameters.
 * Cannot use @sinclair/typebox here — it lives in OC's node_modules which is
 * outside this plugin's module resolution path.
 */
const PARAMETERS_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["start", "wait"] },
    timeoutMs: { type: "number" },
    force: { type: "boolean" },
    accountId: { type: "string" },
  },
  required: ["action"],
};

/**
 * Agent tool for WeChat QR-code login.
 *
 * Two-step flow:
 *   1. weixin_login { action: "start" } → returns inline QR code image (data URL)
 *   2. weixin_login { action: "wait" } → blocks until user scans or timeout
 *
 * The agent MUST display the QR image from step 1, then IMMEDIATELY call step 2.
 */
export function createWeixinLoginTool() {
  return {
    label: "WeChat Login",
    name: "weixin_login",
    ownerOnly: true,
    description:
      "Connect WeChat: action='start' generates an inline QR code image, action='wait' blocks until user scans. You MUST call start first, display the returned QR image to the user, then IMMEDIATELY call wait.",
    parameters: PARAMETERS_SCHEMA,
    execute: async (_toolCallId: string, args: unknown) => {
      const log = (msg: string) => console.log(`[weixin_login] ${msg}`);

      const typedArgs = args as {
        action?: string;
        timeoutMs?: number;
        force?: boolean;
        accountId?: string;
      };
      const action = typedArgs.action ?? "start";
      log(`execute called: action=${action} accountId=${typedArgs.accountId ?? "(none)"} force=${typedArgs.force ?? false}`);

      if (action === "wait") {
        const sessionKey =
          typedArgs.accountId || WEIXIN_DEFAULT_SESSION_KEY;
        const savedBaseUrl = typedArgs.accountId
          ? loadWeixinAccount(typedArgs.accountId)?.baseUrl?.trim()
          : "";
        log(`wait: sessionKey=${sessionKey} baseUrl=${savedBaseUrl || DEFAULT_BASE_URL}`);
        const result = await waitForWeixinLogin({
          sessionKey,
          apiBaseUrl: savedBaseUrl || DEFAULT_BASE_URL,
          timeoutMs: typedArgs.timeoutMs ?? 120_000,
          botType: DEFAULT_ILINK_BOT_TYPE,
        });
        log(`wait result: connected=${result.connected} message=${result.message}`);
        return {
          content: [{ type: "text" as const, text: result.message }],
          details: { connected: result.connected },
        };
      }

      // action === "start"
      const savedBaseUrl = typedArgs.accountId
        ? loadWeixinAccount(typedArgs.accountId)?.baseUrl?.trim()
        : "";
      log(`start: baseUrl=${savedBaseUrl || DEFAULT_BASE_URL}`);
      const result = await startWeixinLoginWithQr({
        accountId: typedArgs.accountId,
        apiBaseUrl: savedBaseUrl || DEFAULT_BASE_URL,
        botType: DEFAULT_ILINK_BOT_TYPE,
        force: typedArgs.force,
        timeoutMs: typedArgs.timeoutMs,
      });
      log(`start result: qrcode=${result.qrcode ? `${result.qrcode.length}chars` : "MISSING"} qrcodeUrl=${result.qrcodeUrl ? `${result.qrcodeUrl.length}chars` : "MISSING"} message=${result.message}`);

      if (!result.qrcode) {
        log(`ERROR: no qrcode in result, returning error message`);
        return {
          content: [{ type: "text" as const, text: result.message }],
          details: { qr: false },
        };
      }

      // Generate inline data URL from raw QR data (not the web page URL)
      log(`rendering QR data URL from qrcode (${result.qrcode.length} chars)...`);
      let qrDataUrl: string;
      try {
        qrDataUrl = renderQrDataUrl(result.qrcode);
        log(`QR data URL generated: ${qrDataUrl.length} chars, starts with: ${qrDataUrl.substring(0, 40)}`);
      } catch (err) {
        log(`ERROR rendering QR: ${err}`);
        // Fallback to web page URL
        const text = `二维码生成失败，请在浏览器中打开此链接扫码：\n\n${result.qrcodeUrl}`;
        return {
          content: [{ type: "text" as const, text }],
          details: { qr: false, renderError: String(err) },
        };
      }

      const text = [
        "二维码已生成，请用微信扫描：",
        "",
        `![微信二维码](${qrDataUrl})`,
        "",
        "DO NOT repeat the image data URL above. Just tell the user to scan the QR code,",
        "then IMMEDIATELY call weixin_login with action='wait' to await the scan result.",
      ].join("\n");
      log(`returning tool result: text length=${text.length}`);
      return {
        content: [{ type: "text" as const, text }],
        details: { qr: true },
      };
    },
  };
}
