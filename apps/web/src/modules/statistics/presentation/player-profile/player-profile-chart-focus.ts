import type { MouseEvent } from "react";

import "./player-profile-chart.css";

export function preventChartMouseFocus(event: MouseEvent) {
  event.preventDefault();
}
