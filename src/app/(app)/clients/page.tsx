import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, SearchX, Star } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listClients } from "@/lib/queries/clients";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientsToolbar } from "@/components/clients/clients-toolbar";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";

const STATUS_TONE = {
  active: "accent",
  lead: "neutral",
  inactive: "muted",
} as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const clients = await listClients(sp.q);
  const filtered =
    sp.status && sp.status !== "all"
      ? clients.filter((c) => c.status === sp.status)
      : clients;

  const favorites = filtered.filter((c) => c.favorite);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {filtered.length} {filtered.length === 1 ? "client" : "clients"}
            {sp.q ? ` matching “${sp.q}”` : ""}
          </p>
        </div>
      </div>

      <ClientsToolbar
        initialQuery={sp.q}
        initialStatus={sp.status}
      />

      {favorites.length > 0 && !sp.q && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Favorites
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={
            sp.q
              ? `No clients match “${sp.q}”`
              : "No clients yet"
          }
          description={
            sp.q
              ? "Try a different search or clear filters."
              : "Add your first client to start tracking projects, invoices, and proposals."
          }
          action={{ label: "Add client", href: "/clients?new=1" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .filter((c) => !c.favorite)
            .map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Link href={`/clients/${client.id}`}>
      <Card hoverable className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink-soft">
              {client.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{client.name}</p>
              <p className="truncate text-xs text-ink-soft">{client.company ?? "—"}</p>
            </div>
          </div>
          {client.favorite && <Star className="h-4 w-4 fill-accent text-accent" />}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[client.status]}>{client.status}</Badge>
          {client.tags.slice(0, 2).map((t) => (
            <Badge key={t} tone="muted">
              {t}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
          {client.email && <span className="truncate">{client.email}</span>}
          <span className="ml-auto">
            Contact {formatDate(client.last_contact_date, "never")}
          </span>
        </div>
      </Card>
    </Link>
  );
}
