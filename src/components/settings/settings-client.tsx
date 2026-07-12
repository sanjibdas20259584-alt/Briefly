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
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Personalize Briefly and connect services.
        </p>
      </div>

      <Card>
        <CardHeader title="Profile" description="Your name shows across the app." />
        <CardBody className="px-4 sm:px-6">
          <ProfileForm ownerName={ownerName} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          description="Light, dark, or match your system."
        />
        <CardBody className="px-4 sm:px-6">
          <ThemeForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Telegram"
          description="Connect your bot for AI chat and reminders."
        />
        <CardBody className="px-4 sm:px-6">
          <TelegramForm chatId={telegramChatId} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="AI Model"
          description="OpenAI-compatible endpoint for the assistant."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          }
        />
        <CardBody className="px-4 sm:px-6">
          <ProviderList providers={providers} />
          {providers.length === 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              No providers configured. Add one to use the Assistant.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Google Drive"
          description="AI access to your Drive files."
        />
        <CardBody className="px-4 sm:px-6">
          <GoogleDriveForm />
        </CardBody>
      </Card>

      <ProviderFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
