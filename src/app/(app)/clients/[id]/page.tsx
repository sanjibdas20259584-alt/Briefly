import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Globe, ExternalLink, LinkIcon } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClientDetail } from "@/lib/queries/clients";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { ClientActionsBar } from "@/components/clients/client-actions-bar";
import { NoteEditor } from "@/components/clients/note-editor";
import { InteractionsTab } from "@/components/clients/interactions-tab";
import { CustomFields } from "@/components/clients/custom-fields";
import { FileList } from "@/components/files/file-list";
import { listFileAttachments } from "@/lib/actions/file-attachments";
import { getPortalTokens } from "@/lib/actions/portal";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { client, projects, invoices, proposals, notes, interactions, customFields, customFieldValues, error } =
    await getClientDetail((await params).id);
  if (!client || error) notFound();

  const [files, portalTokens] = await Promise.all([
    listFileAttachments("client", client.id),
    getPortalTokens(client.id),
  ]);

  const SocialRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <a
        href={value.startsWith("http") ? value : `https://${value}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-sm text-ink-soft hover:text-accent"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="capitalize">{label}</span>
      </a>
    ) : null;

  const Overview = (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardBody className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Contact</h3>
          <div className="space-y-2 text-sm">
            {client.email && (
              <p className="flex items-center gap-2 text-ink-soft">
                <Mail className="h-4 w-4" /> {client.email}
              </p>
            )}
            {client.phone && (
              <p className="flex items-center gap-2 text-ink-soft">
                <Phone className="h-4 w-4" /> {client.phone}
              </p>
            )}
            {client.website && (
              <p className="flex items-center gap-2 text-ink-soft">
                <Globe className="h-4 w-4" />
                <a href={client.website} className="hover:text-accent" target="_blank">
                  {client.website.replace(/https?:\/\//, "")}
                </a>
              </p>
            )}
            {Object.entries(client.social).length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {Object.entries(client.social).map(([k, v]) => (
                  <SocialRow key={k} label={k} value={v} />
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Details</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{client.status}</Badge>
            {client.tags.map((t) => (
              <Badge key={t} tone="muted">
                {t}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-ink-soft">
            Last contact: {formatDate(client.last_contact_date, "never")}
          </p>
          {client.notes && (
            <p className="text-sm text-ink">{client.notes}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const ProjectsTab = projects.length ? (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((p) => (
        <Link key={p.id} href={`/projects/${p.id}`}>
          <Card hoverable className="p-4">
            <p className="font-medium text-ink">{p.title}</p>
            <p className="mt-1 text-xs text-ink-soft">{p.status}</p>
          </Card>
        </Link>
      ))}
    </div>
  ) : (
    <EmptyState title="No projects yet" description="Create a project for this client." action={{ label: "New project", href: `/projects?new=1&client=${client.id}` }} />
  );

  const InvoicesTab = invoices.length ? (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
          <tr>
            <th className="p-3">Number</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-surface-border">
              <td className="p-3">
                <Link href={`/invoices/${inv.id}`} className="text-ink hover:text-accent">
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="p-3 text-ink-soft">{inv.status}</td>
              <td className="p-3 text-right text-ink">{formatMoney(inv.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title="No invoices" description="Generate an invoice for this client." action={{ label: "New invoice", href: `/invoices?new=1&client=${client.id}` }} />
  );

  const ProposalsTab = proposals.length ? (
    <div className="grid gap-3 sm:grid-cols-2">
      {proposals.map((pr) => (
        <Link key={pr.id} href={`/proposals/${pr.id}`}>
          <Card hoverable className="p-4">
            <p className="font-medium text-ink">{pr.title}</p>
            <p className="mt-1 text-xs text-ink-soft">{pr.status}</p>
          </Card>
        </Link>
      ))}
    </div>
  ) : (
    <EmptyState title="No proposals" description="Write a proposal for this client." action={{ label: "New proposal", href: `/proposals?new=1&client=${client.id}` }} />
  );

  const NotesTab = (
    <div className="space-y-4">
      <NoteEditor clientId={client.id} />
      {notes.length ? (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="p-4">
              <p className="text-sm font-medium text-ink">{n.title ?? "Note"}</p>
              <p className="mt-1 text-sm text-ink-soft">{n.body}</p>
              <p className="mt-2 text-xs text-ink-muted">{formatDate(n.created_at)}</p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No notes yet.</p>
      )}
    </div>
  );

  const Interactions = (
    <InteractionsTab interactions={interactions} clientId={client.id} />
  );

  const CustomFieldsTabContent = (
    <CustomFields fields={customFields} values={customFieldValues} entityId={client.id} />
  );

  const FilesTab = (
    <div className="space-y-6">
      {/* Portal Link Section */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Client Portal</h3>
              <p className="text-xs text-ink-soft">
                Share a secure link with your client to view their data
              </p>
            </div>
            <Link href={`/portal/${portalTokens[0]?.token ?? ""}`} target="_blank">
              <Button variant="secondary" size="sm">
                <LinkIcon className="mr-1 h-4 w-4" />
                Open Portal
              </Button>
            </Link>
          </div>
          {portalTokens.length > 0 && (
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-ink-muted break-all">
                {`/portal/${portalTokens[0].token}`}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* File Attachments */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-ink">Attachments</h3>
        <FileList entityType="client" entityId={client.id} initialFiles={files} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">{client.name}</h1>
            <p className="text-sm text-ink-soft">{client.company ?? "No company"}</p>
          </div>
        </div>
        <ClientActionsBar client={client} />
      </div>

      <ClientDetailTabs
        Overview={Overview}
        Projects={ProjectsTab}
        Invoices={InvoicesTab}
        Proposals={ProposalsTab}
        Interactions={Interactions}
        CustomFields={CustomFieldsTabContent}
        Notes={NotesTab}
        Files={FilesTab}
      />
    </div>
  );
}
