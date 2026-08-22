import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { getSession } from "@/modules/identity/session-store";

/**
 * Session gate: while the stored session is checked the native splash stays
 * up; then we route to home (authenticated) or login.
 */
export default function Index() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) {
          return;
        }
        router.replace(session ? "/(home)" : "/(auth)/login");
      })
      .catch(() => {
        if (!cancelled) {
          router.replace("/(auth)/login");
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
