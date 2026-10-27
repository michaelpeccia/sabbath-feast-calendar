# Free Trial and $4.99 Unlock: Play Console Steps

Version 0.10.0 and up. The app is a **free download** with a **14-day free trial**.
After 14 days it asks for a **one-time $4.99 unlock** through Google Play.

## How it works in the app

- The trial starts the first time someone opens the app.
- Home shows "Free trial: X days left" with an Unlock button.
- Settings has a "Full version" card with **Unlock** and **Restore purchase**.
- After 14 days a screen asks for the unlock. Reminders and the widget pause until it is unlocked.
- Restore purchase finds the unlock on the same Google account (new phone, reinstall).
- The web preview link is never locked.

Product ID in the app: `full_unlock` (it must match Play Console exactly)

---

## 1. Keep the app FREE in Play Console

Monetize with Play › App pricing › **Free**.

Do not set a price on the app itself. The $4.99 is the in-app unlock.
(Google never lets a free app become paid, but this setup never needs that.)

## 2. Payments profile

In-app products need a Google payments profile (Play Console › Setup › Payments profile).

**Heads up:** on a personal developer account, any app that makes money
(paid app OR in-app purchase) shows your address on the store listing.
If you do not want your home address public, sort that out before you turn on the unlock
(an LLC and organization account, or a business address you are OK showing).

## 3. Upload this build first

Google only lets you create in-app products after a build with Google Play Billing is uploaded.

1. Push this version and let GitHub build it (APK-NOTES.md step 6).
2. Download the AAB:

```
rm -r /storage/emulated/0/Download/sabbath-aab
gh run download --name sabbath-feast-aab -D /storage/emulated/0/Download/sabbath-aab
```

3. Upload it to your **Closed testing** track and roll it out.

## 4. Create the unlock product

Monetize with Play › Products › **One-time products** › Create one-time product

- Product ID: `full_unlock` (cannot be changed later)
- Name: `Full version unlock`
- Description: `Unlock Sabbath & Feast Days for good. One payment, no subscription.`
- Add a purchase option: **Buy**, price **$4.99 USD** (let Google fill in other countries)
- Save and **Activate**

## 5. Let testers unlock for free (optional)

Testers already get the 14-day trial, which covers the whole test.
If you want them to try the Unlock button without paying:

Play Console home (All apps) › Settings › **License testing** › add their Gmail addresses.

License testers see "Test card, always approves" in the purchase window and are never charged.

## 6. Testing checklist

- Fresh install: Home shows "Free trial: 14 days left"
- Settings › Full version › Unlock opens Google Play's purchase window
- After buying: the trial bar disappears and Settings says "Full version unlocked"
- Uninstall, reinstall, tap Restore purchase: it unlocks again

## Good to know

- Google refunds a purchase automatically if the app does not confirm it within 3 days. The app confirms it right away and checks again every time it opens.
- Clearing the app's data restarts the trial. That is normal for small apps and not worth fighting.
