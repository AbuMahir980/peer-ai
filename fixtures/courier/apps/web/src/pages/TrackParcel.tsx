import { useEffect, useState } from "react";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";

interface Tracking {
  status: string;
  notes: string;
}

export function TrackParcel({ code }: { code: string }) {
  const [parcel, setParcel] = useState<Tracking | null>(null);

  useEffect(() => {
    void api<Tracking>(`/parcels/track/${code}`).then(setParcel);
  }, [code]);

  if (parcel === null) return <p>Loading…</p>;
  return (
    <section>
      <h1>Your parcel</h1>
      <StatusBadge status={parcel.status} />
      <div dangerouslySetInnerHTML={{ __html: parcel.notes }} />
    </section>
  );
}
