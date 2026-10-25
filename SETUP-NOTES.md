# Sabbath & Feast Days Calendar: Phone Setup Notes

Keep this file. Every command you need is here.

## What is in the folder

- `index.html` : the home screen
- `style.css` : colors and layout
- `js/sun.js` : sunset calculator (works offline, checked to within 1 minute)
- `js/app.js` : Sabbath countdown, location, saved settings
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

## 5. Check sunset times

Compare the app's Friday sunset with a published sunset table for your city. It should match within 1 to 2 minutes.

## Coming next

1. Feast calendar screen with the sighted-moon dates
2. Feast pages with Scripture
3. Settings: calendar method and name pickers
4. Reminders and the widget (Android build, done by GitHub Actions or on the PC)
