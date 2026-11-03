# Williamston IT Website

Public support website for Williamston IT users.

## Admin editing

The equipment inventory, laptop build queue, and IT updates are public to
everyone. IT admins can select **IT admin sign in** on any of those pages to
edit inventory and build entries in forms and edit the updates page in place.
There is one admin account, with username `diana` and the existing
`ADMIN_PASSWORD`. Saved changes are stored in Cloudflare D1. The header's
**Admin sign in** tab opens the page editor.

The master password is checked by a Cloudflare Pages Function and is never
included in the website files. Use a strong master password, and rotate it if
it is exposed. After signing in, the same browser remains signed in across
admin-enabled pages on the hosted site for up to eight hours. Content edits are
not yet recorded in an audit history.

Admin sign-in and saving require the hosted Cloudflare Pages site. The GitHub
Pages workflow deploys static files only and cannot run the admin API; opening
an HTML file directly from the computer also cannot sign in or save changes.

All saved content remains public. Do not add employee names, credentials,
personal information, or confidential ticket details to the queues or updates.

## Cloudflare Pages setup

Cloudflare Pages can deploy this repository directly from GitHub. The Pages
project serves the static site and the `functions` directory supplies the
same-origin admin API. A D1 database stores edits.

Cloudflare offers free tiers for Pages and D1 with usage limits. Confirm
current pricing and obtain your organization's approval before deployment.

1. In Cloudflare, create a Pages project connected to this GitHub repository.
   Use the `main` production branch, no build command, and `.` as the build
   output directory. The site will be served at its Cloudflare Pages URL.
2. Create a D1 database named `pelzer-it-content`.
3. Apply the database schema from the repository root:

   ```powershell
   npx wrangler d1 execute pelzer-it-content --remote --file=migrations/0001_initial.sql
   ```

4. In the Pages project settings, add a D1 database binding:
   - Variable name: `DB`
   - D1 database: `pelzer-it-content`
5. Add these encrypted secrets to the Pages project's production environment:
   - `ADMIN_PASSWORD` (or the existing `ADMINPASSWORD` binding): a randomly
     generated password of at least 16 characters.
   - `SESSION_SECRET` (or the existing `SESSIONSECRET` binding): a separate,
     randomly generated secret of at least 32 characters.

   Generate and store both values with your organization's approved password
   manager. Do not put them in this repository or send them in chat.
6. Deploy the project and sign in with username `diana` and the existing
   `ADMIN_PASSWORD`.
7. Verify that public pages load, admin sign-in works, edits persist after
   reloading, and signed-out visitors can still read all content.
8. After Cloudflare Pages is working, disable the GitHub Pages deployment
   workflow in `.github/workflows/static.yml` and update any site links or QR
   codes to use the Cloudflare Pages URL. The workflow is left in place until
   cutover so the existing GitHub Pages deployment is not interrupted.

The D1 migration is safe to run again. Future commits to `main` deploy through
Cloudflare Pages' Git integration. The first deployment requires the D1
binding and encrypted secrets to be configured in Cloudflare.

## Editing data

- **Equipment inventory:** add, remove, or edit entries. Each item includes
  `id`, `name`, `category`, `quantity`, `restockStatus`, `description`, and
  `requestType` (`laptop` or `accessory`). Use Move up and Move down to set
  their display order. Restock status can be set to `Not Yet Requested`,
  `Requested`, `Ordered`, or `Restocked`.
- **Laptop build queue:** add, remove, or edit entries. Each build includes `id`,
  `laptopType`, `status` (`building`, `blocked`, `ready`, or `complete`), a
  `stage` selected from the current-state list, `updated`, `notes`, and a
  `blockers` array. Builds move to the viewable Archived Builds section five
  days after completion; archived entries remain saved.
- **Updates:** add, remove, reorder, and edit only the cards in Projects in
  Progress, including each status label and its circle color. Helpful
  Information and all following content are not editable from the admin panel.
- **Restore published version:** remove saved edits for that page and return
  to the version shipped with the website.
