"use client";

import { useActionState } from "react";
import { Button } from "@/core/ui";
import { createDriverLink } from "../actions";

export function DriverLink({ tripId }: { tripId: string }) {
  const [state, action, pending] = useActionState(createDriverLink.bind(null, tripId), "");
  return (
    <div className="mt-4">
      <form action={action}><Button type="submit" variant="secondary" disabled={pending}>Ссылка для водителя</Button></form>
      {state && <input readOnly value={state} onFocus={(e) => e.currentTarget.select()} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm" aria-label="Ссылка для водителя" />}
    </div>
  );
}
