# Sabbath & Feast Days Calendar: Phone Setup Notes

Keep this file. Every command you need is here.

## What is in the folder

- `index.html` : the home screen
- `style.css` : colors and layout
- `js/sun.js` : sunset calculator (works offline, checked to within 1 minute)
- `js/astro.js` : new moon, full moon and spring equinox calculator (checked to within a minute)
- `js/feasts.js` : feast dates for sighted moon, conjunction and full moon calendars
- `js/app.js` : Home and Feasts screens, location, saved settings
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

## 6. Check sunset times

Compare the app's Friday sunset with a published sunset table for your city. It should match within 1 to 2 minutes.

## Coming next

Done in version 0.2: Feasts tab with sighted moon (default), conjunction and full moon dates, and the next appointed time on Home.

Done in version 0.3: "Seen / Not seen" buttons for each month, a New moon watch card on Home on sighting evenings, and an aviv barley setting for the year start. Choices are saved on the phone.

1. Feast pages with Scripture
2. Name pickers
3. Lunar Sabbath, Enoch, Qumran, Zadok and rabbinic calendars
4. Reminders and the widget (Android build, done by GitHub Actions or on the PC)
