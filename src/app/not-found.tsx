import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6 text-center">
      <p className="text-3xl font-semibold text-ink">404</p>
      <p className="mt-2 text-sm text-ink-soft">This page could not be found.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Back to Briefly
      </Link>
    </div>
  );
}
