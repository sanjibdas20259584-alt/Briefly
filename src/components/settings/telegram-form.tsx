"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  updateTelegramAction,
  setupTelegramWebhookAction,
  getTelegramStatusAction,
} from "@/lib/actions/settings";

interface TelegramStatus {
  configured: boolean;
  botUsername: string | null;
  chatId: string | null;
}

interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_message: string | null;
}

export function TelegramForm({ chatId }: { chatId: string }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<
    unknown,
    FormData
  >(async (_p, fd) => await updateTelegramAction(_p, fd), { ok: false });
  const [webhookState, setWebhookState] = useState<{
    ok?: boolean;
    error?: string;
    webhookUrl?: string;
  } | null>(null);
  const [setupPending, setSetupPending] = useState(false);
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  useEffect(() => {
    getTelegramStatusAction().then(setStatus);
  }, []);

  useEffect(() => {
    if (state && (state as any).ok === true) {
      toast("Telegram saved", "success");
      getTelegramStatusAction().then(setStatus);
    }
    if (state && (state as any).ok === false && (state as any).error)
      toast((state as any).error, "error");
  }, [state, toast]);

  async function handleSetupWebhook() {
    setSetupPending(true);
    setWebhookState(null);
    try {
      const result = await setupTelegramWebhookAction();
      setWebhookState(result);
      if (result.ok) {
        toast("Webhook registered! Your bot can now receive messages.", "success");
      } else {
        toast(result.error ?? "Webhook setup failed", "error");
      }
    } catch {
      toast("Webhook setup failed", "error");
    } finally {
      setSetupPending(false);
    }
  }

  async function handleVerify() {
    setVerifyPending(true);
    try {
      const res = await fetch("/api/telegram/webhook/setup");
      const data = await res.json();
      if (data.ok && data.result) {
        setWebhookInfo(data.result);
        if (data.result.url) {
          toast(`Webhook active: ${data.result.url}`, "success");
        } else {
          toast("No webhook registered. Click Connect AI Assistant.", "error");
        }
      } else {
        toast(data.error ?? "Failed to check webhook", "error");
      }
    } catch {
      toast("Failed to verify webhook", "error");
    } finally {
      setVerifyPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Saved bot info */}
      {status?.configured && (
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
              <Bot className="h-5 w-5 text-accent-hover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">
                @{status.botUsername ?? "bot"}
              </p>
              <p className="text-xs text-ink-soft">
                Chat ID: {status.chatId ?? "not set"}
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
              <CheckCircle className="h-3 w-3" />
              Saved
            </span>
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <Field label="Bot token" hint="From @BotFather. Encrypted before storage.">
          <Input name="telegram_bot_token" type="password" placeholder="123456:ABC-DEF..." />
        </Field>
        <Field label="Chat ID" hint="Your Telegram numeric chat id. Message @userinfobot to get it.">
          <Input name="telegram_chat_id" defaultValue={chatId} placeholder="123456789" />
        </Field>
        <Button type="submit" loading={pending}>
          Save Telegram
        </Button>
      </form>

      <div className="border-t border-surface-border pt-4">
        <h3 className="text-sm font-medium text-ink">AI Assistant in Telegram</h3>
        <p className="mt-1 text-xs text-ink-soft">
          After saving your bot token and chat ID above, click below to connect
          the AI assistant. You&apos;ll be able to message your bot directly and
          it will respond with the same capabilities as the web assistant.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={setupPending}
            onClick={handleSetupWebhook}
          >
            <Bot className="mr-1 h-4 w-4" />
            Connect AI Assistant
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={verifyPending}
            onClick={handleVerify}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Verify Webhook
          </Button>
        </div>

        {webhookInfo && (
          <div className="mt-3 rounded-lg border border-surface-border bg-surface p-3 text-xs">
            <div className="flex items-center gap-2">
              {webhookInfo.url ? (
                <Wifi className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="font-medium text-ink">
                {webhookInfo.url ? "Webhook active" : "No webhook registered"}
              </span>
            </div>
            {webhookInfo.url && (
              <p className="mt-1 text-ink-soft truncate">{webhookInfo.url}</p>
            )}
            {webhookInfo.pending_update_count > 0 && (
              <p className="mt-1 text-amber-600">
                {webhookInfo.pending_update_count} pending updates
              </p>
            )}
            {webhookInfo.last_error_message && (
              <p className="mt-1 text-red-600">
                Last error: {webhookInfo.last_error_message}
              </p>
            )}
          </div>
        )}

        {webhookState?.ok && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Webhook registered
          </div>
        )}
        {webhookState?.error && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">{webhookState.error}</p>
                {webhookState.error.includes("HTTPS") && (
                  <p className="mt-1">
                    For local development, use{" "}
                    <code className="rounded bg-amber-100 px-1">ngrok http 3000</code>{" "}
                    and set <code className="rounded bg-amber-100 px-1">APP_URL</code>{" "}
                    to the ngrok HTTPS URL.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
