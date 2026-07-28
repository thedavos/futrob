import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/table";

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
    <div className="mx-auto w-full max-w-5xl">
      <Table dense>
        <TableHeader>
          <TableRow>
            <TableHead>Partido</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Visitante</TableHead>
            <TableHead>Marcador</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">{match.id}</TableCell>
              <TableCell className="font-medium">{match.home}</TableCell>
              <TableCell>{match.away}</TableCell>
              <TableCell className="font-semibold">{match.score}</TableCell>
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
                  <MoreHorizontal />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
