import { Share } from "react-native";
import { Redirect } from "expo-router";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { API_BASE_URL } from "@/config/env";

/** Sends a 401 back to login; the session was already cleared where the read failed. */
export function LoginRedirect() {
  return <Redirect href={LOGIN_ROUTE} />;
}

/** Invitation links open the web app, which hands them to the native app when installed. */
export const INVITATION_ORIGIN = API_BASE_URL;

/** The system share sheet; the link is also visible on screen when sharing is unavailable. */
export function shareInvitation(message: string, url: string) {
  void Share.share({ message, url }).catch(() => undefined);
}
