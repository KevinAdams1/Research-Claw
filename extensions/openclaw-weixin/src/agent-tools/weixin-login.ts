import {
  DEFAULT_ILINK_BOT_TYPE,
  WEIXIN_DEFAULT_SESSION_KEY,
  startWeixinLoginWithQr,
  waitForWeixinLogin,
} from "../auth/login-qr.js";
import { loadWeixinAccount, DEFAULT_BASE_URL } from "../auth/accounts.js";
import { renderQrDataUrl } from "../util/qr-image.js";

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
 * Agent tool for WeChat QR-code login (secondary path — primary is Dashboard QR modal).
 * Works with models that can pass through markdown images (Claude, GPT-4).
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
      const typedArgs = args as {
        action?: string;
        timeoutMs?: number;
        force?: boolean;
        accountId?: string;
      };
      const action = typedArgs.action ?? "start";

      if (action === "wait") {
        const sessionKey = typedArgs.accountId || WEIXIN_DEFAULT_SESSION_KEY;
        const savedBaseUrl = typedArgs.accountId
          ? loadWeixinAccount(typedArgs.accountId)?.baseUrl?.trim()
          : "";
        const result = await waitForWeixinLogin({
          sessionKey,
          apiBaseUrl: savedBaseUrl || DEFAULT_BASE_URL,
          timeoutMs: typedArgs.timeoutMs ?? 120_000,
          botType: DEFAULT_ILINK_BOT_TYPE,
        });
        return {
          content: [{ type: "text" as const, text: result.message }],
          details: { connected: result.connected },
        };
      }

      // action === "start"
      const savedBaseUrl = typedArgs.accountId
        ? loadWeixinAccount(typedArgs.accountId)?.baseUrl?.trim()
        : "";
      const result = await startWeixinLoginWithQr({
        accountId: typedArgs.accountId,
        apiBaseUrl: savedBaseUrl || DEFAULT_BASE_URL,
        botType: DEFAULT_ILINK_BOT_TYPE,
        force: typedArgs.force,
        timeoutMs: typedArgs.timeoutMs,
      });

      if (!result.qrcode) {
        return {
          content: [{ type: "text" as const, text: result.message }],
          details: { qr: false },
        };
      }

      let qrDataUrl: string;
      try {
        qrDataUrl = renderQrDataUrl(result.qrcode);
      } catch {
        return {
          content: [{ type: "text" as const, text: `二维码生成失败，请在浏览器中打开此链接扫码：\n\n${result.qrcodeUrl}` }],
          details: { qr: false },
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
      return {
        content: [{ type: "text" as const, text }],
        details: { qr: true },
      };
    },
  };
}
