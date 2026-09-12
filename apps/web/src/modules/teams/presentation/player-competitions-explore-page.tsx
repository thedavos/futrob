import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  breadcrumb: {
    marginBottom: "1rem",
  },
});

export function PlayerCompetitionsExplorePage() {
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.breadcrumb)}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/player/competitions" />}>
                Competiciones
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Explorar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <PageHeader>
        <PageHeaderTitle>Explorar competiciones</PageHeaderTitle>
        <PageHeaderDescription>
          Descubre torneos para seguir y compartir con tu club.
        </PageHeaderDescription>
      </PageHeader>
    </main>
  );
}
