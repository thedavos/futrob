import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotsThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, vis } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/table";

const styles = stylex.create({
  wrap: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "64rem",
  },
  actionsHead: { width: "3.5rem" },
  matchId: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "var(--text-xs)",
    color: colors.mutedForeground,
  },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
});

const meta = {
  title: "Patterns/Data table",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const matches = [
  { id: "M-1042", home: "Cuervos", away: "Volt FC", score: "3–1", status: "Aprobado" },
  { id: "M-1043", home: "Nómadas", away: "Zero Eleven", score: "2–2", status: "Auditar" },
  { id: "M-1044", home: "Apex Club", away: "Furia", score: "—", status: "Programado" },
];

export const MatchAuditRows: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.wrap)}>
      <Table dense>
        <TableHeader>
          <TableRow>
            <TableHead>Partido</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Visitante</TableHead>
            <TableHead>Marcador</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead {...applyProps(undefined, undefined, styles.actionsHead)}>
              <span {...applyProps(undefined, undefined, vis.srOnly)}>Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell {...applyProps(undefined, undefined, styles.matchId)}>
                {match.id}
              </TableCell>
              <TableCell {...applyProps(undefined, undefined, styles.medium)}>
                {match.home}
              </TableCell>
              <TableCell>{match.away}</TableCell>
              <TableCell {...applyProps(undefined, undefined, styles.semibold)}>
                {match.score}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    match.status === "Aprobado"
                      ? "approved"
                      : match.status === "Auditar"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {match.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button aria-label={`Acciones para ${match.id}`} dense size="icon" variant="ghost">
                  <DotsThreeIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
