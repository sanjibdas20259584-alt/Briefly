"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createProviderAction,
  updateProviderAction,
} from "@/lib/actions/settings";
import type { ModelProviderPublic } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: ModelProviderPublic | null;
}

interface Result {
  ok: boolean;
  error?: string;
}

const LOCAL_DEFAULTS = {
  name: "Local LLM",
  base_url: "http://localhost:20128/v1",
  model_name: "local-model",
};

export function ProviderFormDialog({ open, onClose, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testedOk, setTestedOk] = useState(false);
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateProviderAction(initial.id, prevState, fd)
        : await createProviderAction(prevState, fd)) as Result,
    {} as Result
  );

  const [headers, setHeaders] = useState(
    initial ? JSON.stringify(initial.headers, null, 2) : "{}"
  );
  const [baseUrl, setBaseUrl] = useState(
    initial?.base_url ?? LOCAL_DEFAULTS.base_url
  );
  const [modelName, setModelName] = useState(
    initial?.model_name ?? LOCAL_DEFAULTS.model_name
  );
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState(initial?.name ?? LOCAL_DEFAULTS.name);

  useEffect(() => {
    if (open) {
      setTestedOk(false);
      setName(initial?.name ?? LOCAL_DEFAULTS.name);
      setBaseUrl(initial?.base_url ?? LOCAL_DEFAULTS.base_url);
      setModelName(initial?.model_name ?? LOCAL_DEFAULTS.model_name);
      setApiKey("");
      setHeaders(initial ? JSON.stringify(initial.headers, null, 2) : "{}");
    }
  }, [open, initial]);

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(initial ? "Provider updated" : "Provider added", "success");
      onClose();
      router.refresh();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, initial, onClose, router, toast]);

  async function testConnection() {
    setTesting(true);
    setTestedOk(false);
    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(headers || "{}");
      } catch {
        toast("Headers must be valid JSON", "error");
        setTesting(false);
        return;
      }
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial?.id,
          base_url: baseUrl,
          model_name: modelName,
          api_key: apiKey || undefined,
          headers: parsedHeaders,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast(json.error ?? "Connection failed", "error");
        setTestedOk(false);
      } else {
        toast(json.message ?? "Connection OK", "success");
        setTestedOk(true);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test failed", "error");
      setTestedOk(false);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Edit provider" : "Add model provider"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Provider name" required>
            <Input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Local LLM"
            />
          </Field>
          <Field label="Model name" required>
            <Input
              name="model_name"
              required
              value={modelName}
              onChange={(e) => {
                setModelName(e.target.value);
                setTestedOk(false);
              }}
              placeholder="local-model"
            />
          </Field>
        </div>
        <Field
          label="Base URL"
          required
          hint="OpenAI-compatible root, e.g. http://localhost:20128/v1"
        >
          <Input
            name="base_url"
            required
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setTestedOk(false);
            }}
            placeholder="http://localhost:20128/v1"
          />
        </Field>
        <Field label="API key" hint="Encrypted at rest. Never sent to the browser after save.">
          <Input
            name="api_key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestedOk(false);
            }}
            placeholder={initial?.has_key ? "•••••• (leave blank to keep)" : "sk-..."}
          />
        </Field>
        <Field label="Headers (JSON, optional)">
          <Textarea
            value={headers}
            onChange={(e) => {
              setHeaders(e.target.value);
              setTestedOk(false);
            }}
            name="headers"
            className="font-mono text-xs"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={initial?.is_default ?? true}
            className="h-4 w-4 rounded border-surface-border text-accent"
          />
          Set as default chat model
        </label>

        {testedOk && (
          <p className="rounded-lg bg-accent-subtle px-3 py-2 text-sm text-accent-hover">
            Connection verified. You can save now.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <Button type="button" variant="secondary" loading={testing} onClick={testConnection}>
            Test connection
          </Button>
          <Button type="submit" loading={pending}>
            {initial ? "Save" : "Add provider"}
          </Button>
        </div>
        <p className="text-xs text-ink-muted">
          Save runs a live connection test first. Keep your model server running
          (e.g. at localhost:20128).
        </p>
      </form>
    </Dialog>
  );
}
