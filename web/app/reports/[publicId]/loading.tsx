export default function Loading() {
  return (
    <main>
      <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 6, marginBottom: 12 }} />
      <section className="hero">
        <div className="skeleton" style={{ width: "60%", height: "2rem", borderRadius: 8 }} />
        <div className="skeleton" style={{ width: "40%", height: "1rem", borderRadius: 6, marginTop: 8 }} />
      </section>
      <div className="reportDetailGrid">
        <div className="card skeleton" style={{ height: 340 }} />
        <div className="reportDetailSidebar">
          <div className="card skeleton" style={{ height: 200 }} />
          <div className="card skeleton" style={{ height: 160 }} />
        </div>
      </div>
    </main>
  );
}
