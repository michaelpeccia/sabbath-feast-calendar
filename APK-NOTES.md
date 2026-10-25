# Building the Android APK (Termux, no PC needed)

GitHub builds the APK for you every time you push. You only do steps 1 to 5 once.
After that, building a new APK is just step 6 and 7.

App ID: `com.kingdomlifeministry.sabbathfeast` (this becomes permanent once it is on Google Play)

---

## 1. Put the new files in place

Clear old downloads, then download the new `sabbath-feast-calendar.zip` and unzip it:

```
rm /storage/emulated/0/Download/sabbath-feast-calendar*.zip
```

(download the new zip now, then:)

```
cd ~
cp /storage/emulated/0/Download/sabbath-feast-calendar.zip ~
unzip -o sabbath-feast-calendar.zip
cd sabbath-feast-calendar
```

## 2. Let your phone push the build file to GitHub

The build file lives in `.github/workflows/`, and GitHub needs one extra permission for that:

```
gh auth refresh -s workflow
gh auth setup-git
```

It shows a code. Copy it, press Enter, sign in on the page that opens, paste the code.

## 3. Make your signing key (once, ever)

This key signs the app. Google Play will use this same key, so your testers' copies update cleanly into the Play version.

```
pkg install -y openjdk-17
mkdir -p ~/keys
cd ~/keys
keytool -genkeypair -v -keystore kingdom-life-release.jks -alias kingdomlife -keyalg RSA -keysize 2048 -validity 10000
```

It asks:

- **Password** twice. Use letters and numbers, at least 8 characters. Nothing shows on screen while you type; that is normal. **Write it down now.**
- First and last name: `Michael Ben Yah`
- Organizational unit: press Enter
- Organization: `Kingdom Life Ministry`
- City: `Tulsa`  State: `Oklahoma`  Country code: `US`
- Is this correct? type `yes`

## 4. Back up the key (do not skip)

If this key is lost, you can never update the app again on phones that have it.

```
cp ~/keys/kingdom-life-release.jks /storage/emulated/0/Download/
```

Then upload `kingdom-life-release.jks` from your Download folder to your Google Drive (keep it private), and keep one more copy somewhere else (PC or USB drive). Keep the password in a safe place too.

Never put the key file in the app folder or on GitHub. (The app folder is set up to ignore it, just in case.)

## 5. Give the key to GitHub as secrets

```
cd ~/sabbath-feast-calendar
base64 -w 0 ~/keys/kingdom-life-release.jks | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body kingdomlife
gh secret list
```

The second line asks you to paste the key password. `gh secret list` should show all three names.

## 6. Push, and GitHub builds the APK

```
cd ~/sabbath-feast-calendar
git add .
git commit -m "Android build"
git push
gh run watch
```

`gh run watch` shows the build live. It takes about 5 to 10 minutes. Green check = done.

## 7. Download the APK to your phone

```
gh run download --name sabbath-feast-apk -D /storage/emulated/0/Download/sabbath-apk
```

The APK is now in your Download folder, inside `sabbath-apk`. Tap it in the Files app to install.
Android may ask you to allow installs from the Files app, and Play Protect may warn about an unknown app: tap **Install anyway**.

To send it to your tester: upload the APK to Google Drive and share the link, or send the file directly. They also need to allow installing unknown apps.

Before downloading a newer build, clear the old one:

```
rm -r /storage/emulated/0/Download/sabbath-apk
```

## If the build fails

```
gh run view --log-failed | tail -60
```

Copy what it shows and send it to Claude.

## Good to know

- Each build gets a higher version number automatically, so new APKs install right over the old one and keep saved settings and checklists.
- No reminders or widget yet. They come in the next version.
- The phone's Back button closes the app. Use the Back link at the top of feast pages.
- The app icon is a placeholder until we make a real one.
