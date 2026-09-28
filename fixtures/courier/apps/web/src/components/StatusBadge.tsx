const COLOURS: Record<string, string> = {
  booked: "#9aa0a6",
  collected: "#f9ab00",
  delivered: "#1e8e3e",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className="badge" style={{ background: COLOURS[status] }} />;
}
