"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { TelegramForm } from "@/components/settings/telegram-form";
import { ProviderFormDialog } from "@/components/settings/provider-form-dialog";
import { ProviderList } from "@/components/settings/provider-list";
import { ThemeForm } from "@/components/settings/theme-form";
import { GoogleDriveForm } from "@/components/settings/google-drive-form";
import type { ModelProviderPublic } from "@/lib/types";

export function SettingsClient({
  ownerName,
  telegramChatId,
  providers,
}: {
  ownerName: string;
  telegramChatId: string;
  providers: ModelProviderPublic[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Personalize Briefly and connect services.
        </p>
      </div>

      <Card>
        <CardHeader title="Profile" description="Your name shows across the app." />
        <CardBody>
          <ProfileForm ownerName={ownerName} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          description="Light, dark, or match your system. Default is System."
        />
        <CardBody>
          <ThemeForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Telegram reminders"
          description="Get pings from your bot. Find your chat id via @userinfobot."
        />
        <CardBody>
          <TelegramForm chatId={telegramChatId} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Model providers"
          description="OpenAI-compatible endpoints for your assistant. Keys are encrypted. Connection is tested before save."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add provider
            </Button>
          }
        />
        <CardBody>
          <ProviderList providers={providers} />
          {providers.length === 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              No providers yet. Add your local model at{" "}
              <code className="rounded bg-surface px-1 text-xs">
                http://localhost:20128/v1
              </code>{" "}
              to use the Assistant.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Google Drive"
          description="Give your AI assistant full access to your Drive files."
        />
        <CardBody>
          <GoogleDriveForm />
        </CardBody>
      </Card>

      <ProviderFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
