import { applyStyles, Skeleton } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { BRACKET_GEOMETRY } from "./bracket-model.ts";
import { px } from "./bracket-page-shared.ts";
import { BRACKET_HEADINGS_HEIGHT, styles } from "./bracket-page.styles.ts";

/** Representative knockout: quarters, semis, final. Unknown draws still get a tree, not a blank slab. */
const COLUMN_COUNTS = [4, 2, 1] as const;

type SkeletonNode = {
  readonly id: string;
  readonly columnIndex: number;
  readonly x: number;
  readonly y: number;
};

type SkeletonColumn = {
  readonly count: number;
  readonly x: number;
};

function elbow(source: SkeletonNode, target: SkeletonNode): string {
  const startX = source.x + BRACKET_GEOMETRY.nodeWidth;
  const endX = target.x;
  const bendX = endX - BRACKET_GEOMETRY.columnGap / 2;
  return `M${startX} ${source.y} H${bendX} V${target.y} H${endX}`;
}

function skeletonCanvasLayout() {
  const { nodeWidth, nodeHeight, rowGap, columnGap } = BRACKET_GEOMETRY;
  const pitch = nodeHeight + rowGap;
  const height = Math.max(...COLUMN_COUNTS) * pitch;
  const columns: readonly SkeletonColumn[] = COLUMN_COUNTS.map((count, columnIndex) => ({
    count,
    x: columnIndex * (nodeWidth + columnGap),
  }));
  const nodes: readonly SkeletonNode[] = columns.flatMap((column, columnIndex) => {
    const slot = height / column.count;
    return Array.from({ length: column.count }, (_, index) => ({
      id: `${columnIndex}:${index}`,
      columnIndex,
      x: column.x,
      y: slot * (index + 0.5),
    }));
  });
  const wires: { readonly id: string; readonly path: string }[] = [];
  for (let columnIndex = 1; columnIndex < columns.length; columnIndex += 1) {
    const targets = nodes.filter((node) => node.columnIndex === columnIndex);
    const sources = nodes.filter((node) => node.columnIndex === columnIndex - 1);
    for (const [targetIndex, target] of targets.entries()) {
      const home = sources[targetIndex * 2];
      const away = sources[targetIndex * 2 + 1];
      if (home) wires.push({ id: `${home.id}->${target.id}:home`, path: elbow(home, target) });
      if (away) wires.push({ id: `${away.id}->${target.id}:away`, path: elbow(away, target) });
    }
  }
  return {
    width: columns.length * nodeWidth + (columns.length - 1) * columnGap,
    height,
    columns,
    nodes,
    wires,
  };
}

function BracketCardSkeleton() {
  return (
    <div {...applyStyles(styles.card)}>
      <span {...applyStyles(styles.cardMeta)}>
        <Skeleton {...applyStyles(styles.cardNumber)} />
        <Skeleton {...applyStyles(styles.cardWhen)} />
      </span>
      <span {...applyStyles(styles.sideRow)}>
        <Skeleton {...applyStyles(styles.cardSide)} />
      </span>
      <span {...applyStyles(styles.sideRow)}>
        <Skeleton {...applyStyles(styles.cardSide)} />
      </span>
      <span {...applyStyles(styles.cardFooter)}>
        <Skeleton {...applyStyles(styles.cardStatus)} />
      </span>
    </div>
  );
}

const SKELETON_LAYOUT = skeletonCanvasLayout();

function BracketCanvasSkeleton() {
  const { nodeWidth } = BRACKET_GEOMETRY;
  return (
    <div
      {...applyStyles(
        styles.canvas,
        styles.canvasSize(
          px(SKELETON_LAYOUT.width),
          px(SKELETON_LAYOUT.height + BRACKET_HEADINGS_HEIGHT),
        ),
      )}
    >
      <svg
        aria-hidden="true"
        height={SKELETON_LAYOUT.height}
        viewBox={`0 0 ${SKELETON_LAYOUT.width} ${SKELETON_LAYOUT.height}`}
        width={SKELETON_LAYOUT.width}
        {...applyStyles(styles.wires, styles.at("0px", px(BRACKET_HEADINGS_HEIGHT)))}
      >
        {SKELETON_LAYOUT.wires.map((wire) => (
          <path key={wire.id} d={wire.path} {...applyStyles(styles.wire)} />
        ))}
      </svg>
      {SKELETON_LAYOUT.columns.map((column, columnIndex) => {
        const nodes = SKELETON_LAYOUT.nodes.filter((node) => node.columnIndex === columnIndex);
        return (
          <div key={columnIndex}>
            <div
              {...applyStyles(
                styles.columnHeading,
                styles.nodeWidth(px(nodeWidth)),
                styles.at(px(column.x), "0px"),
              )}
            >
              <Skeleton {...applyStyles(styles.columnTitle)} />
              <Skeleton {...applyStyles(styles.columnMeta)} />
            </div>
            <ol {...applyStyles(styles.column)}>
              {nodes.map((node) => (
                <li
                  key={node.id}
                  {...applyStyles(
                    styles.node,
                    styles.nodeWidth(px(nodeWidth)),
                    styles.at(px(node.x), px(node.y + BRACKET_HEADINGS_HEIGHT)),
                  )}
                >
                  <BracketCardSkeleton />
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

/** Knockout loading layout. Live status stays outside `aria-busy`; decorative tree is `inert`. */
export function BracketPageSkeleton() {
  const { t } = useI18n();
  const label = t("bracket.loading");
  return (
    <div aria-busy="true" aria-label={label} inert {...applyStyles(styles.stack)}>
      <div aria-hidden="true" {...applyStyles(styles.toolbar)}>
        <Skeleton {...applyStyles(styles.timezone)} />
        <div {...applyStyles(styles.filter)}>
          <Skeleton {...applyStyles(styles.filterLabel)} />
          <Skeleton {...applyStyles(styles.filterControl)} />
        </div>
      </div>
      <section aria-hidden="true" {...applyStyles(styles.stage)}>
        <div {...applyStyles(styles.stageHeader)}>
          <Skeleton {...applyStyles(styles.stageTitle)} />
          <div {...applyStyles(styles.facts)}>
            <Skeleton {...applyStyles(styles.fact)} />
            <Skeleton {...applyStyles(styles.fact)} />
          </div>
        </div>
        <Skeleton {...applyStyles(styles.hint)} />
        <div data-slot="bracket-skeleton-scroller" {...applyStyles(styles.scroller)}>
          <BracketCanvasSkeleton />
        </div>
        <Skeleton {...applyStyles(styles.listToggle)} />
      </section>
    </div>
  );
}
