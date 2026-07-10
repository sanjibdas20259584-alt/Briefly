"use client";

import { useEffect, useState } from "react";
import { HardDrive, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getGoogleDriveStatusAction,
  getGoogleDriveAuthUrlAction,
  disconnectGoogleDriveAction,
} from "@/lib/actions/settings";

export function GoogleDriveForm() {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    connected: boolean;
    email: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    getGoogleDriveStatusAction().then((s) => {
      setStatus(s);
      setLoading(false);
    });
    // Check URL params for OAuth result
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast("Google Drive connected!", "success");
      window.history.replaceState({}, "", "/settings");
    }
    if (params.get("google") === "error") {
      toast(params.get("msg") ?? "Google Drive connection failed", "error");
      window.history.replaceState({}, "", "/settings");
    }
  }, [toast]);

  async function handleConnect() {
    const { url, error } = await getGoogleDriveAuthUrlAction();
    if (error) {
      toast(error, "error");
      return;
    }
    if (url) {
      window.location.href = url;
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectGoogleDriveAction();
    setDisconnecting(false);
    if (result.ok) {
      setStatus({ connected: false, email: null });
      toast("Google Drive disconnected", "success");
    } else {
      toast(result.error ?? "Failed to disconnect", "error");
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft">Loading...</div>;
  }

  return (
    <div className="max-w-lg space-y-3">
      {status?.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Connected
            {status.email && (
              <span className="text-ink-soft">({status.email})</span>
            )}
          </div>
          <p className="text-xs text-ink-soft">
            Your AI assistant can now browse, create, edit, and manage files in
            your Google Drive. You can also use the{" "}
            <a href="/drive" className="text-accent hover:underline">
              Drive browser
            </a>{" "}
            for manual access.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDisconnect}
              loading={disconnecting}
            >
              Disconnect
            </Button>
            <a href="/drive">
              <Button type="button" variant="secondary" size="sm">
                <HardDrive className="mr-1 h-4 w-4" />
                Open Drive Browser
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <AlertCircle className="h-4 w-4" />
            Not connected
          </div>
          <p className="text-xs text-ink-soft">
            Connect Google Drive to give your AI assistant full access to your
            files. The assistant can list, search, read, create, rename, move,
            delete, and share files and folders.
          </p>
          <Button type="button" onClick={handleConnect}>
            <HardDrive className="mr-1 h-4 w-4" />
            Connect Google Drive
          </Button>
        </div>
      )}
    </div>
  );
}
