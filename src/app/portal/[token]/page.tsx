import { notFound } from "next/navigation";
import { File, ExternalLink, Folder } from "lucide-react";
import { getPortalData } from "@/lib/actions/portal";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/utils";

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default async function PortalPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = await params;
  const data = await getPortalData(token);
  if (!data) notFound();

  const { client, projects, invoices, proposals, files } = data;

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">
            {client.name}
          </h1>
          {client.company && (
            <p className="text-ink-soft">{client.company}</p>
          )}
          <Badge tone="accent">{client.status}</Badge>
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Projects</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <Card key={p.id} className="p-4">
                  <p className="font-medium text-ink">{p.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">{p.status}</p>
                  {p.due_date && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Due: {formatDate(p.due_date)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Invoices</h2>
            <div className="overflow-hidden rounded-xl border border-surface-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
                  <tr>
                    <th className="p-3">Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-surface-border">
                      <td className="p-3 font-medium text-ink">
                        {inv.invoice_number}
                      </td>
                      <td className="p-3">
                        <Badge tone={inv.status === "paid" ? "accent" : "muted"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-ink-soft">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="p-3 text-right text-ink">
                        {formatMoney(inv.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Proposals */}
        {proposals.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Proposals</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {proposals.map((p) => (
                <Card key={p.id} className="p-4">
                  <p className="font-medium text-ink">{p.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">{p.status}</p>
                  {p.sent_at && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Sent: {formatDate(p.sent_at)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Files */}
        {files.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Files</h2>
            <div className="space-y-2">
              {files.map((file) => (
                <Card key={file.id} className="flex items-center gap-3 p-3">
                  <File className="h-5 w-5 shrink-0 text-ink-muted" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-ink hover:text-accent"
                    >
                      {file.file_name}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      {file.folder && (
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {file.folder}
                        </span>
                      )}
                      {formatSize(file.file_size) && (
                        <span>{formatSize(file.file_size)}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {projects.length === 0 &&
          invoices.length === 0 &&
          proposals.length === 0 &&
          files.length === 0 && (
            <Card>
              <CardBody className="py-12 text-center">
                <p className="text-sm text-ink-soft">
                  No content available in this portal yet.
                </p>
              </CardBody>
            </Card>
          )}
      </div>
    </div>
  );
}
