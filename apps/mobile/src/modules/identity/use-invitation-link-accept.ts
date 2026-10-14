import { useSyncExternalStore } from "react";
import {
  getInvitationLinkAccept,
  subscribeInvitationLinkAccept,
  type InvitationLinkAcceptState,
} from "./invitation-link-accept";

export function useInvitationLinkAccept(token: string): InvitationLinkAcceptState {
  return useSyncExternalStore(
    (onChange) => subscribeInvitationLinkAccept(token, onChange),
    () => getInvitationLinkAccept(token),
    () => getInvitationLinkAccept(token),
  );
}
