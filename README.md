# Williamston IT Website

Public support website for Williamston IT users.

## Admin editing

The equipment inventory, laptop build queue, and IT updates are public to
everyone. IT admins can select **IT admin sign in** on any of those pages to
edit inventory and build entries in forms and edit the updates page in place.
Saved changes are stored in Cloudflare D1 and are published to all visitors.

This setup uses one shared admin password rather than individual Microsoft
accounts. The password is checked by a Cloudflare Pages Function and is never
included in the website files. Use a strong password, share it only with
authorized admins, and rotate it if it is exposed. Since admins share it, the
site cannot identify which admin made a change.

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
   - `ADMIN_PASSWORD`: a randomly generated password of at least 16 characters.
   - `SESSION_SECRET`: a separate, randomly generated secret of at least 32
     characters.

   Generate and store both values with your organization's approved password
   manager. Do not put them in this repository or send them in chat.
6. Deploy the project and verify that public pages load, the admin sign-in
   works, edits persist after reloading, and signed-out visitors can still
   read all content.
7. After Cloudflare Pages is working, disable the GitHub Pages deployment
   workflow in `.github/workflows/static.yml` and update any site links or QR
   codes to use the Cloudflare Pages URL. The workflow is left in place until
   cutover so the existing GitHub Pages deployment is not interrupted.

The D1 migration is safe to run again. Future commits to `main` deploy through
Cloudflare Pages' Git integration. The first deployment requires the D1
binding and encrypted secrets to be configured in Cloudflare.

## Editing data

- **Equipment inventory:** add, remove, or edit entries. Each item includes
  `id`, `name`, `category`, `quantity`, `restockStatus`, `description`, and
  `requestType` (`laptop` or `accessory`).
- **Laptop build queue:** add, remove, or edit entries. Each build includes `id`,
  `laptopType`, `status` (`building`, `blocked`, or `complete`), `stage`,
  `updated`, `notes`, and a `blockers` array.
- **Updates:** sign in and edit the visible page text directly. Save publishes
  the edits. Unsafe HTML and event-handler attributes are removed before the
  saved content is displayed.
- **Restore published version:** remove saved edits for that page and return
  to the version shipped with the website.
