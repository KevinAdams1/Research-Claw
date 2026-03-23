import { Type } from "@sinclair/typebox";
import type { ChannelAgentTool } from "openclaw/plugin-sdk";

import {
  DEFAULT_ILINK_BOT_TYPE,
  WEIXIN_DEFAULT_SESSION_KEY,
  startWeixinLoginWithQr,
  waitForWeixinLogin,
} from "../auth/login-qr.js";
import { loadWeixinAccount, DEFAULT_BASE_URL } from "../auth/accounts.js";

/**
 * Agent tool for WeChat QR-code login.
 * Mirrors the WhatsApp `whatsapp_login` tool pattern from OC core.
 *
 * Usage flow (from agent):
 *   1. Call weixin_login { action: "start" } → returns QR code URL
 *   2. Display QR as markdown image: ![qr](url)
 *   3. Call weixin_login { action: "wait" } → blocks until user scans or timeout
 */
export function createWeixinLoginTool(): ChannelAgentTool {
  return {
    label: "WeChat Login",
    name: "weixin_login",
    ownerOnly: true,
    description:
      "Generate a WeChat QR code for linking, or wait for the scan to complete.",
    parameters: Type.Object({
      action: Type.Unsafe<"start" | "wait">({
        type: "string",
        enum: ["start", "wait"],
      }),
      timeoutMs: Type.Optional(Type.Number()),
      force: Type.Optional(Type.Boolean()),
      accountId: Type.Optional(Type.String()),
    }),
    execute: async (_toolCallId, args) => {
      const typedArgs = args as {
        action?: string;
        timeoutMs?: number;
        force?: boolean;
        accountId?: string;
      };
      const action = typedArgs.action ?? "start";

      if (action === "wait") {
        const sessionKey =
          typedArgs.accountId || WEIXIN_DEFAULT_SESSION_KEY;
        const savedBaseUrl = typedArgs.accountId
          ? loadWeixinAccount(typedArgs.accountId)?.baseUrl?.trim()
          : "";
        const result = await waitForWeixinLogin({
          sessionKey,
          apiBaseUrl: savedBaseUrl || DEFAULT_BASE_URL,
          timeoutMs: typedArgs.timeoutMs,
          botType: DEFAULT_ILINK_BOT_TYPE,
        });
        return {
          content: [{ type: "text", text: result.message }],
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

      if (!result.qrcodeUrl) {
        return {
          content: [{ type: "text", text: result.message }],
          details: { qr: false },
        };
      }

      const text = [
        result.message,
        "",
        "打开微信扫描以下二维码：",
        "",
        `![weixin-qr](${result.qrcodeUrl})`,
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        details: { qr: true },
      };
    },
  };
}
