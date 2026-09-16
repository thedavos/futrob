import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { LOGIN_ROUTE, resolveSessionGate } from "@/modules/identity/session-gate";

export default function Index() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolveSessionGate()
      .then((destination) => {
        if (!cancelled) {
          router.replace(destination);
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(LOGIN_ROUTE);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checked) {
    return null;
  }

  return <View style={{ flex: 1 }} />;
}
