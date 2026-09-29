# Auth

Auth lets a visitor create a credentials account or sign in, then lands inside the authenticated app (onboarding or a post-auth destination) with a Better Auth cookie. A wrong password stays on `/login` with a safe error.

## Sub-features

- `auth-login-form` shows email and password fields and submits `Iniciar sesión`.
- `auth-login-reject` keeps the visitor on `/login` for a bad password and shows an alert.
- `auth-signup-form` collects name, email, and password and submits `Crear cuenta`.
- `auth-signup-destination` sends a new account to `/onboarding` without consulting prior memberships.
- `auth-gate` sends an anonymous visit to `/login` when opening an `_app` route such as `/player`.
- `auth-cross-link` moves between `/login` and `/signup` via `Crear una cuenta` and `Iniciar sesión`.

## How to get to it (user POV)

- Open `/login` or choose `Iniciar sesión` on the landing header.
- Open `/signup` or choose `Crear cuenta` on the landing header or hero.
- Open `/player` (or another `_app` route) with no session; the gate redirects to `/login`.
- After signup, the product sends the actor to onboarding.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- Use a disposable email `verify-<run-id>@example.test` that does not already exist for signup proofs.
- Do not reuse the operator's personal account.

- **Gate.** Open `/player` with no session. The URL becomes `/login` (optional `redirectTo`). The page shows `Comprobando sesión…` only briefly, then `Inicia sesión`.
- **Cross-link.** On `/login`, choose `Crear una cuenta`. The URL is `/signup` and the heading is `Crea tu cuenta`. Choose `Iniciar sesión` in the footer. The URL is `/login`.
- **Reject login.** On `/login`, fill the textbox named `Correo electrónico` (placeholder `ejemplo@correo.com`) with `nobody-verify@example.test` and the textbox named `Contraseña` (placeholder `Ingresa tu contraseña`) with `wrong-password-verify`. Choose `Iniciar sesión`. A `role=alert` reads `El correo o la contraseña no son correctos.` The URL stays `/login`.
- **Signup.** On `/signup`, fill the textbox named `Nombre completo` with `Verify Player`, `Correo electrónico` with the disposable address, and `Contraseña` with a value that meets the visible hint (`Mínimo 8 caracteres, incluyendo letras y números.`). Choose `Crear cuenta`. After success the URL is `/onboarding` (or `/onboarding/intention`). The heading `¿Qué quieres hacer primero?` appears. The actor must not land on `/orgs` or `/player` yet.
- **Login existing.** Sign out if a session remains (reload `/login` in a fresh profile if there is no UI sign-out in this run). Sign in with the disposable credentials. Destination follows `actor_onboarding`: incomplete → `/onboarding`; complete without memberships → `/player`.
- **Proof.** Screenshot + ARIA of the login reject alert, and of the post-signup onboarding heading. Record the disposable email in `NOTES.md` (not the password).

## Gotchas

- A 200 login followed by `Comprobando sesión…` forever or a bounce back to `/login` is usually `BETTER_AUTH_SECRET` mismatch between web and auth, not a bad password.
- Signup validation is client-side first. An empty submit is not an auth-backend proof.
- Auth textboxes are labelled (`Correo electrónico`, `Contraseña`, `Nombre completo`). Placeholders (`ejemplo@correo.com`, `Ingresa tu contraseña`, `Crea una contraseña`) are hints, not the accessible name. Target the FieldLabel.
- Signup password policy is 8+ characters **and** at least one letter and one number. `12345678` fails client validation.
- Do not put the password, session cookie, or Better Auth token in evidence files.
- Password-reset is not a shipped entry in this map. Do not invent it.
- Mobile `/login` is a different surface. This feature is web only.
