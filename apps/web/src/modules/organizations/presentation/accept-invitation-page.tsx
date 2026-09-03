"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { AcceptInvitationForm } from "./accept-invitation-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
});

export function AcceptInvitationPage({ initialToken }: Readonly<{ initialToken?: string }>) {
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Únete a una competición</PageHeaderTitle>
        <PageHeaderDescription>
          Escribe el código que recibiste para acceder directamente a la competición.
        </PageHeaderDescription>
      </PageHeader>
      <AcceptInvitationForm initialToken={initialToken} />
    </main>
  );
}
