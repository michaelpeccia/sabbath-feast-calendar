# Free Trial and $4.99 Unlock (version 0.10)

How it works:
- The app is a **free download**. Everything works for **14 days** from the day it is installed.
- After 14 days a screen asks for a **one-time $4.99 unlock** through Google Play. No subscription.
- The unlock is tied to the buyer's Google account, so "Restore purchase" brings it back on a new phone.
- Clearing the app's data does not restart the trial (it counts from the install date).
- Once unlocked, the app remembers it and keeps working offline.
- In a web browser (the preview page) there is no trial and nothing locks.

The Play Store product ID is: `full_unlock` (it must match exactly).

---

## 1. Put the new files in place (Termux)

Download the new `sabbath-feast-calendar.zip`, then:

```
cd ~
cp /storage/emulated/0/Download/sabbath-feast-calendar.zip ~
unzip -o sabbath-feast-calendar.zip
cd sabbath-feast-calendar
```

## 2. Push it and build

```
git add .
git commit -m "Version 0.10: 14-day free trial and one-time unlock"
git push
sleep 15
gh run watch
```

Pick the run that says **a few seconds ago**.

If it fails, show me the error:

```
gh run list --workflow="android.yml" --limit 1
gh run view --log-failed | grep -i -A6 "what went wrong\|error:"
```

## 3. Update the privacy policy page

The policy now mentions the trial and the Google Play check.

```
cp ~/sabbath-feast-calendar/privacy-site/index.html ~/kingdom-life-privacy/index.html
cd ~/kingdom-life-privacy
git add .
git commit -m "Policy: free trial and unlock"
git push
```

---

## 4. Google Play Console (once your account is verified)

Do these in order:

1. **Set the app to Free.** Monetize with Play > Pricing (or "App pricing"): choose **Free**.
   Important: an app published as Free can never be changed to Paid, which is fine, because the $4.99 is the in-app unlock now.
2. **Set up a payments profile** if Play Console asks for one (needed to sell anything).
3. **Upload a build first.** Play Console only lets you create the product after you upload an .aab that includes billing (version 0.10 or later) to a testing track.
4. **Create the product:** Monetize with Play > Products > **One-time products** > Create.
   - Product ID: `full_unlock`
   - Name: `Full unlock`
   - Description: `Unlock the full app after the 14-day free trial. One-time purchase.`
   - Price: **$4.99**
   - Then **Activate** it.
5. **App content:** when asked, say the app **contains in-app purchases**.
6. **Testing a purchase without paying:** Settings > **License testing**, add your Gmail and Rebekah's. Testers see a test card at checkout and are not charged.

## Testing tips

- Purchases only work when the app is **installed from Google Play** (your closed test). A sideloaded APK still runs the trial, but buying may not work from it.
- To see the locked screen without waiting 14 days, set the phone's date 15 days ahead, open the app, then set the date back.
