"use client";

import { useState } from "react";
import { MessageSquare, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPENWA_URL = "http://localhost:2886";

export default function OpenWAPage() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">WhatsApp</h1>
          <p className="mt-1 text-sm text-ink-soft">
            OpenWA dashboard — send and receive WhatsApp messages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoaded(false);
              setError(false);
              const iframe = document.getElementById("openwa-frame") as HTMLIFrameElement;
              if (iframe) iframe.src = OPENWA_URL;
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          <a href={OPENWA_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              Open in new tab
            </Button>
          </a>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-surface-raised py-20">
          <AlertCircle className="h-12 w-12 text-ink-muted" />
          <p className="mt-4 text-sm font-medium text-ink">
            OpenWA is not running
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Start OpenWA on port 2886, then click Refresh.
          </p>
          <code className="mt-3 rounded-lg bg-surface px-3 py-1.5 text-xs text-ink-soft">
            cd C:\Windows\System32\OpenWA &amp;&amp; npm run start:prod
          </code>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised">
          {!loaded && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="ml-3 text-sm text-ink-soft">Loading OpenWA...</span>
            </div>
          )}
          <iframe
            id="openwa-frame"
            src={OPENWA_URL}
            className="h-[calc(100vh-12rem)] w-full border-0"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            title="OpenWA Dashboard"
          />
        </div>
      )}
    </div>
  );
}
