"use client";

import { useActionState } from "react";
import { useTransition } from "react";

export function useFormAction<State, Payload = FormData>(
  action: (state: Awaited<State>, payload: Payload) => State | Promise<State>,
  initialState: Awaited<State>
): [Awaited<State>, (payload: Payload) => void, boolean] {
  const [state, formAction] = useActionState<State, Payload>(action, initialState);
  const [pending, startTransition] = useTransition();

  const submit = (payload: Payload) => {
    startTransition(() => {
      void formAction(payload);
    });
  };

  return [state, submit, pending];
}