import { useEffect, useState } from "react";
import { http } from "../../lib/http";

export interface Loan {
  id: string;
  title: string;
  dueOn: string;
}

export function useLoans(userId: string) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void http<Loan[]>(`/users/${userId}/loans`)
      .then(setLoans)
      .finally(() => setLoading(false));
  }, []);

  return { loans, loading };
}
