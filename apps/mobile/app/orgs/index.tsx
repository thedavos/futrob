import { NativeDestination } from "@/modules/authorization/native-destination";

export default function OrganizationPickerRoute() {
  return <NativeDestination destination={{ kind: "picker" }} />;
}
