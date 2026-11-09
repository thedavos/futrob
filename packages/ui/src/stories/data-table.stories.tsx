import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { DotsThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, vis } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Score } from "../components/score/score.tsx";
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
  // `stickyHeader` makes the container the vertical scroller; the caller sets its height.
  scroller: { maxHeight: "16rem" },
  points: { fontWeight: "var(--font-weight-bold)" },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
});

const meta = {
  title: "Patterns/Data table",
  tags: ["autodocs"],
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

const standings = [
  { team: "Nova FC", played: 6, goalDifference: 9, points: 16 },
  { team: "Atlas", played: 6, goalDifference: 4, points: 13 },
  { team: "Cuervos", played: 6, goalDifference: 1, points: 10 },
  { team: "Volt FC", played: 6, goalDifference: -3, points: 7 },
  { team: "Nómadas", played: 6, goalDifference: -11, points: 2 },
];

const signed = new Intl.NumberFormat("es", { signDisplay: "exceptZero" });

/**
 * Figures and their headers share `align="end"` (right-aligned, tabular, no wrap). Row
 * figures use the 500 table scale; only the column that ranks the table steps up to 700.
 */
export const AlignedFigures: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.wrap)}>
      <Table dense>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Equipo</TableHead>
            <TableHead align="end" scope="col">
              <abbr title="Partidos jugados">PJ</abbr>
            </TableHead>
            <TableHead align="end" scope="col">
              <abbr title="Diferencia de goles">DG</abbr>
            </TableHead>
            <TableHead align="end" scope="col">
              <abbr title="Puntos">Pts</abbr>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((row) => (
            <TableRow key={row.team}>
              <TableCell>{row.team}</TableCell>
              <TableCell align="end">
                <Score align="end" as="span" size="table">
                  {row.played}
                </Score>
              </TableCell>
              <TableCell align="end">
                <Score align="end" as="span" size="table">
                  {signed.format(row.goalDifference)}
                </Score>
              </TableCell>
              <TableCell align="end">
                <Score align="end" as="span" className={styles.points} size="table">
                  {row.points}
                </Score>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const heads = canvasElement.querySelectorAll("[data-slot='table-head'][data-align='end']");
    await expect(heads).toHaveLength(3);
    for (const head of heads) {
      await expect(getComputedStyle(head).textAlign).toBe("end");
    }
  },
};

const longTable = Array.from({ length: 24 }, (_, index) => ({
  id: `M-${1100 + index}`,
  home: matches[index % matches.length]!.home,
  away: matches[index % matches.length]!.away,
  goals: (index * 7) % 5,
}));

/** Long operator lists keep the header row visible while the rows scroll inside the container. */
export const StickyHeader: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.wrap)}>
      <Table containerClassName={styles.scroller} dense stickyHeader>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Partido</TableHead>
            <TableHead scope="col">Local</TableHead>
            <TableHead scope="col">Visitante</TableHead>
            <TableHead align="end" scope="col">
              Goles
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {longTable.map((match) => (
            <TableRow key={match.id}>
              <TableCell {...applyProps(undefined, undefined, styles.matchId)}>
                {match.id}
              </TableCell>
              <TableCell>{match.home}</TableCell>
              <TableCell>{match.away}</TableCell>
              <TableCell align="end">{match.goals}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const head = canvasElement.querySelector("[data-slot='table-head']")!;
    await expect(getComputedStyle(head).position).toBe("sticky");
  },
};
