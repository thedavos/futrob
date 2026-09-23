import { NativeDestination } from "@/modules/authorization/native-destination";

export default function PlayerRoute() {
  return <NativeDestination destination={{ kind: "player" }} />;
}
