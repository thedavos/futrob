-- Actor foreign keys (ADR-0021). Now that `actors` lives in the product database,
-- every column that stores an ActorId references it. RESTRICT: an actor with
-- product history is never deleted implicitly.

ALTER TABLE organizations
  ADD CONSTRAINT organizations_created_by_actor_id_fkey
  FOREIGN KEY (created_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_invited_by_actor_id_fkey
  FOREIGN KEY (invited_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_accepted_by_actor_id_fkey
  FOREIGN KEY (accepted_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE organization_invitation_redemptions
  ADD CONSTRAINT organization_invitation_redemptions_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE actor_onboarding
  ADD CONSTRAINT actor_onboarding_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE player_profiles
  ADD CONSTRAINT player_profiles_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE active_team_preferences
  ADD CONSTRAINT active_team_preferences_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_created_by_actor_id_fkey
  FOREIGN KEY (created_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE competition_memberships
  ADD CONSTRAINT competition_memberships_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE teams
  ADD CONSTRAINT teams_created_by_actor_id_fkey
  FOREIGN KEY (created_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE team_external_club_connections
  ADD CONSTRAINT team_external_club_connections_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE roster_invitations
  ADD CONSTRAINT roster_invitations_invited_by_actor_id_fkey
  FOREIGN KEY (invited_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE roster_invitations
  ADD CONSTRAINT roster_invitations_accepted_by_actor_id_fkey
  FOREIGN KEY (accepted_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE roster_invitations
  ADD CONSTRAINT roster_invitations_invitee_actor_id_fkey
  FOREIGN KEY (invitee_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE roster_invitation_redemptions
  ADD CONSTRAINT roster_invitation_redemptions_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE platform_role_assignments
  ADD CONSTRAINT platform_role_assignments_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE platform_role_assignments
  ADD CONSTRAINT platform_role_assignments_assigned_by_actor_id_fkey
  FOREIGN KEY (assigned_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE authorization_grants
  ADD CONSTRAINT authorization_grants_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE authorization_grants
  ADD CONSTRAINT authorization_grants_granted_by_actor_id_fkey
  FOREIGN KEY (granted_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE authorization_audit_log
  ADD CONSTRAINT authorization_audit_log_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE authorization_audit_log
  ADD CONSTRAINT authorization_audit_log_target_actor_id_fkey
  FOREIGN KEY (target_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE official_match_selections
  ADD CONSTRAINT official_match_selections_proposed_by_actor_id_fkey
  FOREIGN KEY (proposed_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE official_results
  ADD CONSTRAINT official_results_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fixture_encounter_audit
  ADD CONSTRAINT fixture_encounter_audit_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE schedule_change_requests
  ADD CONSTRAINT schedule_change_requests_initiated_by_actor_id_fkey
  FOREIGN KEY (initiated_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE schedule_change_proposals
  ADD CONSTRAINT schedule_change_proposals_proposed_by_actor_id_fkey
  FOREIGN KEY (proposed_by_actor_id) REFERENCES actors (id) ON DELETE RESTRICT;
