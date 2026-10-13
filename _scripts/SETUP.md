# ART in Orvieto applications: setup

The application form on the site (`application.js`) takes the CAD $90 fee through
PayPal, then sends the application to a Google Apps Script
(`art-in-orvieto-applications.gs`). The script checks the payment with PayPal,
then for each applicant:

- creates a folder in Google Drive containing their uploaded work samples and a
  PDF of their answers,
- adds a row to the **ART in Orvieto Applications** Google Sheet,
- emails the application (PDF attached) to academic-registrar@ and haceroferrer@,
- emails the applicant a confirmation.

Until step 6 is done, the form shows a "write to the Registrar" notice and takes no
payments, so it's safe to publish the site before setup.

Setup takes about 15 minutes. Do every step signed in as
**ics-communications@icscanada.edu**.

---

## 1. Create the script

1. Go to <https://script.google.com> → **New project**.
2. Rename it (top left) to `ART in Orvieto applications`.
3. Delete everything in `Code.gs`, and paste in the whole of
   `_scripts/art-in-orvieto-applications.gs`. Save (⌘S / Ctrl+S).
4. **Project Settings** (gear icon) → set **Time zone** to
   `(GMT-05:00) Eastern Time - Toronto`.

## 2. PayPal (nothing to do at launch)

The script already contains ICS's PayPal client ID, the same one the F2BF courses
page uses, so payments go to the same ICS PayPal account.

At launch, the script doesn't check payments with PayPal itself. Every
application is saved and marked **CHECK PAYMENT**, and the Registrar confirms the
$90 by finding its PayPal order ID in PayPal. See
[Turning on automatic payment checks](#turning-on-automatic-payment-checks) below
for how to switch this on later.

## 3. Create the folder and sheet

1. In the editor, choose the function **`setup`** from the dropdown next to
   **Run**, and click **Run**.
2. Google asks for permission. Click **Review permissions**, choose
   ics-communications@, then **Allow**. If you see "Google hasn't verified this
   app", click **Advanced** → **Go to ART in Orvieto applications**. That's
   normal for your own scripts.
3. The log at the bottom should show three lines:
   - `Folder:` a link to **ART in Orvieto Applications** in your Drive
   - `Sheet:` a link to the Sheet, which sits inside that folder
   - `PayPal: not checked automatically …`, which is expected at launch

`setup` shares the folder (and so the Sheet and every applicant folder inside it)
with academic-registrar@ and haceroferrer@ as editors. They'll receive Google's
"shared with you" email. Running `setup` again is harmless.

## 4. Publish the script as a web app

1. **Deploy** → **New deployment** → gear icon → **Web app**.
2. Description: `Application form`.
   **Execute as:** `Me (ics-communications@icscanada.edu)`.
   **Who has access:** `Anyone`.
3. **Deploy**, and copy the **Web app URL**. It ends in `/exec`.

## 5. Check it

Open the Web app URL in a browser. You should see:

```
{"ok":true,"service":"ART in Orvieto applications","storage":true,"paypal":"not checked automatically"}
```

## 6. Connect the website

In `application.js`, near the top, paste the URL between the quotes:

```js
SCRIPT_URL: 'https://script.google.com/macros/s/…/exec',
```

Commit and push. The PayPal buttons now appear at the end of the form.

## 7. Test once with a real payment

1. Fill in the form on the live site as a Studio Residency applicant with an image
   attached, and pay the $90.
2. Check that:
   - a folder appeared in **ART in Orvieto Applications** with the image and the PDF,
   - a row was added to the Sheet,
   - the staff email arrived with the PDF attached,
   - the confirmation email reached the test address.
3. Refund the test payment in PayPal: **Activity** → the payment → **Issue a refund**.
4. Delete the test row and folder.

---

## Day to day

- **New applications** arrive by email, and as a row and a folder in Drive.
- **Payment status** column:
  - `CHECK PAYMENT`: every application shows this until automatic checks are on.
    Search PayPal (**Activity**) for the **PayPal order ID** in the row, or for the
    applicant's name, and confirm a completed CAD $90 payment. Once automatic checks
    are on, it only appears if PayPal couldn't be reached when the application
    arrived.
  - `Paid`: confirmed by PayPal automatically. Requires the secret.
  - `Payment pending`: PayPal hasn't cleared it yet, usually a bank-funded payment.
    Check PayPal before admitting. Requires the secret.
- **If an application fails to save**, the script emails ics-communications@ with
  the details. The applicant is told their payment is safe and can press
  **Send application** to try again without paying twice.

## Turning on automatic payment checks

When someone with the ICS PayPal business login is available:

1. Go to <https://developer.paypal.com/dashboard/applications>, log in, and switch to **Live**.
2. Open the app whose Client ID starts with `AdZ0cWK3Bl7…`, and under **Secret key**
   click **Show** and copy it. Use the existing secret. Don't delete it or generate a
   new one, since F2BF may depend on it.
3. In Apps Script: **Project Settings** → **Script properties** → **Add script
   property**: `PAYPAL_SECRET` = the secret. Save.
4. Open the Web app URL. `"paypal"` should now read `"checked automatically"`.

Nothing else changes, and you don't need to redeploy. New applications show
**Paid**, and fake or reused payments are refused before anything is saved.

## Changing the script later

Paste the new code, save, then **Deploy** → **Manage deployments** → pencil icon →
**Version: New version** → **Deploy**. This keeps the same URL. Don't create a new
deployment, which would get a new URL.

## Each new year

Change these together:

| What | `application.js` | `art-in-orvieto-applications.gs` |
|---|---|---|
| Program year | `PROGRAM_YEAR`, `DRAFT_KEY` | `PROGRAM_YEAR` |
| Application fee | `FEE` | `FEE` |
| Staff who get applications | | `STAFF` (then run `setup` to share the folder) |

Also update the heading **Application for Summer 2027** in `index.html`. The page
text that mentions the fee (CAD $90) is in the Apply and Fees sections of
`index.html`.

To start a fresh folder and sheet for a new year, rename the old ones in Drive,
delete the `ROOT_FOLDER_ID` and `SHEET_ID` script properties, and run `setup` again.

## Keeping it safe

- Turn on 2-step verification for ics-communications@ and the ICS PayPal account.
  They are what protects the applications and the PayPal secret.
- Keep editors of the script itself to one or two people. Once the secret is
  added, anyone who can edit the script can see it. Staff only need access to the folder, which `setup`
  gives them.
- The form accepts images and PDFs only, 10 MB each, two at most. Video and audio
  come in as links.
