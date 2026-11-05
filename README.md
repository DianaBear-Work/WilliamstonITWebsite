# Williamston IT Website

This is the IT support website for Pelzer 2. It gives employees a place to
find IT resources, check updates, and see the equipment and laptop build
queues.

## Admin tools

The equipment inventory, laptop build queue, and updates are visible to
everyone. IT admins can sign in from those pages to make content changes.

The master admin signs in with username `dianabear` and the existing
`ADMIN_PASSWORD`. Only the master admin can create IT admin accounts or set
and reset their passwords. Other IT admins can edit site content, but they
cannot manage accounts. Account details and saved edits are stored in
Cloudflare D1.

The master password is checked by the Cloudflare Pages Function. It is not
stored in the website files. Use a strong password and change it if it may
have been exposed. Admins stay signed in on the same browser for up to eight
hours. Content edits are not currently recorded in an audit history.

Admin sign-in and editing work on the hosted Cloudflare Pages site. They will
not work from a local HTML file or the GitHub Pages site, because those do not
run the admin API.

Please keep confidential information out of the website. Saved content is
public, so don't add passwords, personal information, employee names, or
confidential ticket details to the queues or updates.

## Setting up Cloudflare Pages

Cloudflare Pages hosts the website and runs the admin API in the `functions`
folder. The API uses a D1 database to save edits and admin accounts.

Cloudflare has usage limits, even on free plans. Check the current pricing and
get any required approval before setting it up.

1. Create a Cloudflare Pages project connected to this GitHub repository. Set
   the production branch to `main`, leave the build command empty, and use `.`
   as the build output directory.
2. Create a D1 database named `pelzer-it-content`.
3. From the repository's main folder, apply both database migrations:

   ```powershell
   npx.cmd wrangler d1 execute pelzer-it-content --remote --file=migrations/0001_initial.sql
   npx.cmd wrangler d1 execute pelzer-it-content --remote --file=migrations/0002_admin_users.sql
   npx.cmd wrangler d1 execute pelzer-it-content --remote --file=migrations/0003_admin_account_controls.sql
   ```

4. In the Pages project settings, add a D1 database binding:
   - Variable name: `DB`
   - Database: `pelzer-it-content`
5. Add these encrypted secrets to the Pages project's production environment:
   - `ADMIN_PASSWORD` (or the existing `ADMINPASSWORD` binding): use a random
     password with at least 16 characters.
   - `SESSION_SECRET` (or the existing `SESSIONSECRET` binding): use a
     different random secret with at least 32 characters.

   Save both values in your organization's approved password manager. Don't
   put them in the repository or send them in chat.
6. Deploy the site. Sign in with username `dianabear` and the existing
   `ADMIN_PASSWORD`. Use **Admin Dashboard** to create accounts, reset their
   passwords, lock or delete accounts, and review last sign-in times. Admin
   passwords must be at least 12 characters.
   The Admin Dashboard is available only while signed in as the master admin.
7. Check that the public pages load, admin sign-in works, and saved edits are
   still there after you reload the page.
8. Once Cloudflare Pages is working, turn off the GitHub Pages workflow in
   `.github/workflows/static.yml`. Update any links or QR codes to use the
   Cloudflare Pages address. Leave the workflow on until the site is ready to
   switch over.

Run each D1 migration once, in order, for each database. Future commits to
`main` deploy through Cloudflare Pages' Git integration. Before the first
deployment, make sure the `DB` binding and encrypted secrets are set up in
Cloudflare.

## Editing site content

- **Equipment inventory:** Add, remove, or edit items. Each item has an `id`,
  `name`, `category`, `quantity`, `restockStatus`, `description`, and
  `requestType` (`laptop` or `accessory`). Use **Move up** and **Move down** to
  change the order. Restock statuses are `Not Yet Requested`, `Requested`,
  `Ordered`, and `Restocked`.
- **Laptop build queue:** Add, remove, or edit builds. Each build has an `id`,
  `laptopType`, `status` (`building`, `blocked`, `ready`, or `complete`),
  `stage`, `updated`, manager/contact and user/recipient details, accessory
  information, `notes`, and a `blockers` list. Manager, user, and accessory
  details appear publicly on the queue, so only add information approved for
  public display. Completed builds move to **Archived Builds** after five days
  and stay saved there.
- **Updates:** Add, remove, reorder, and edit the cards under **Projects in
  Progress**, including their status labels and circle colors. The **Helpful
  Information** section and the content below it can't be edited from the
  admin panel.
- **Restore published version:** Remove saved edits for a page and show the
  version included with the website again.
