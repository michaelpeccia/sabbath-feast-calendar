# Sabbath & Feast Days Calendar: Phone Setup Notes

Keep this file. Every command you need is here.

## What is in the folder

- `index.html` : the home screen
- `style.css` : colors and layout
- `js/sun.js` : sunset calculator (works offline, checked to within 1 minute)
- `js/astro.js` : new moon, full moon and spring equinox calculator (checked to within a minute)
- `js/feasts.js` : feast and Sabbath dates for all 8 calendars (sighted moon, conjunction, full moon, lunar Sabbath, Enoch, Qumran, Zadok, rabbinic)
- `js/app.js` : Home, Feasts, feast pages and Settings screens, location, saved settings
- `js/content.js` : the Sabbath and feast pages (built by the tool below, do not hand-edit)
- `js/reminders.js` : reminder settings, scheduling and the data sent to the widget
- `js/checklists.js` : the starter prep checklists. Edit the lists at the top of this file to change what new users see
- `tools/build_content.py` : where the "What Scripture instructs" lines live. Scripture is pulled word for word from the World English Bible
- `tools/web_text.py` : helper that reads the World English Bible data
- `PRIVACY-NOTES.md` : how to publish the privacy policy page, plus Data safety form answers
- `privacy-site/` : the privacy policy page
- `APK-NOTES.md` : how to build the Android APK with GitHub (signing key, secrets, download)
- `android/` : the Android app shell, `package.json` and `capacitor.config.json` : Android build settings
- `.github/workflows/android.yml` : the GitHub build that makes the APK

## Changing a feast page

Edit the lines in `tools/build_content.py`, then rebuild in Termux:

```
cd ~/sabbath-feast-calendar
mkdir -p ~/webdata && cd ~/webdata
pkg install -y nodejs
npm pack world-english-bible
tar xzf world-english-bible-*.tgz
cd ~/sabbath-feast-calendar
python tools/build_content.py ~/webdata/package/json
```

The download step only has to be done once.
- `SETUP-NOTES.md` : this file

## 1. First time: unzip into Termux

Download `sabbath-feast-calendar.zip` to your phone's Download folder, then in Termux:

```
pkg install -y git python unzip
cd ~
cp /storage/emulated/0/Download/sabbath-feast-calendar.zip ~
unzip sabbath-feast-calendar.zip
cd sabbath-feast-calendar
```

## 2. Preview the app on your phone

```
cd ~/sabbath-feast-calendar
python -m http.server 8080
```

Then open Chrome and go to:

```
http://localhost:8080
```

Tap **Use my location** and allow it. The countdown should start.

To stop the preview, go back to Termux and press **Volume Down + C**.

## 3. First time: put it on GitHub

1. On github.com, tap **New repository**.
2. Name it `sabbath-feast-calendar`, set it to **Private**, and do not add a README.
3. Back in Termux:

```
cd ~/sabbath-feast-calendar
git init -b main
git add .
git commit -m "Starter: Sabbath countdown"
git remote add origin https://github.com/michaelpeccia/sabbath-feast-calendar.git
git push -u origin main
```

If it asks for a password, paste your GitHub token (the same one you use for the study app).

### Can't find your token?

**Step A: check whether Termux already saved it.**

```
git config --global credential.helper
ls ~/.git-credentials
```

If the first line says `store` and the second shows the file, your token is already saved. Just run `git push -u origin main` and it won't ask.

Note: if your old token was made for only the study app's repos, GitHub will refuse the push to this new repo. Use Step B.

**Step B: sign in with the GitHub app instead (no token to copy).**

```
pkg install -y gh
gh auth login
```

Answer the questions like this:

- Where do you use GitHub? **GitHub.com**
- Preferred protocol? **HTTPS**
- Authenticate Git with your GitHub credentials? **Yes**
- How would you like to authenticate? **Login with a web browser**

It shows an 8-character code. Copy it, press Enter, sign in on the page that opens, and paste the code. Then:

```
gh auth setup-git
git push -u origin main
```

After this, `git push` works for all your repos without asking. Your study app pushes keep working too.

## 4. Every time you make changes

Edit a file (example):

```
cd ~/sabbath-feast-calendar
nano js/app.js
```

In nano: **Ctrl+O** then Enter to save, **Ctrl+X** to exit.

Then save it to GitHub:

```
git add .
git commit -m "Describe what you changed"
git push
```

## 5. When Claude sends you a new version (zip)

Download the new `sabbath-feast-calendar.zip` to your Download folder, then:

```
cd ~
cp /storage/emulated/0/Download/sabbath-feast-calendar.zip ~
unzip -o sabbath-feast-calendar.zip
cd sabbath-feast-calendar
git add .
git commit -m "Update to new version"
git push
```

`unzip -o` writes the new files over the old ones. Your git history stays.

If Android saved the download as `sabbath-feast-calendar (1).zip`, delete the old one from Download first, or use that name in the `cp` line.

## 6. When the calendar app is in the stores: link it from the study app

The calendar app already links to the study app (Settings tab and the bottom of every screen).

To link back once the calendar is live:

1. Copy the store links:
   - Google Play: `https://play.google.com/store/apps/details?id=` plus the app ID you choose when you set up the Play listing (for example `com.kingdomlifeministry.sabbathfeast`). Pick the ID carefully, because it can never be changed.
   - Apple App Store: only if an iPhone version is released later. That needs an Apple developer account ($99 a year) and a Mac to build.
2. Open a Claude chat and say: "Add Sabbath & Feast Days Calendar store buttons to the study app." Have the links ready.
3. The study app change goes in the `kingdom-life-app` repo, in `app/www/index.html` and `app/www/app.js`, next to the Connect with us panel. Push it the usual way and GitHub Actions publishes it.

## 7. Check sunset times

Compare the app's Friday sunset with a published sunset table for your city. It should match within 1 to 2 minutes.

## Coming next

Done in version 0.2: Feasts tab with sighted moon (default), conjunction and full moon dates, and the next appointed time on Home.

Done in version 0.3: "Seen / Not seen" buttons for each month, a New moon watch card on Home on sighting evenings, and an aviv barley setting for the year start. Choices are saved on the phone.

Done in version 0.4: a page for the Sabbath and each feast with "What Scripture instructs" and the full passages, plus a Settings tab with the name pickers.

Done in version 0.5: prep checklists on the Sabbath page and each feast page. Users can check, add and remove items. The Sabbath list starts fresh each week, feast lists each year. Home shows how much Sabbath prep is done.

Done in version 0.6: lunar Sabbath, Enoch, Qumran, Zadok priestly and rabbinic calendars. The Sabbath countdown follows the chosen calendar.

Done in version 0.8: reminders you choose in Settings (before the Sabbath, at sunset, when it ends, before each feast) and a home-screen widget. These work in the Android app only.

1. App icon and Play Store listing
