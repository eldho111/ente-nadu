import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="hero">
        <h1>Report Not Found</h1>
        <p>This report may have been removed or is not publicly visible.</p>
        <Link href="/" className="button secondary">
          Back to map
        </Link>
      </section>
    </main>
  );
}