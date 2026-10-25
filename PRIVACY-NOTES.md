# Publishing the Privacy Policy (Termux)

Google Play requires a public web page with your privacy policy, because the app can use location.
The page is in `privacy-site/index.html`. These steps put it on its own small public GitHub site (free).

Your policy link will be:

```
https://michaelpeccia.github.io/kingdom-life-privacy/
```

## 1. Make a separate folder for the site

```
cp -r ~/sabbath-feast-calendar/privacy-site ~/kingdom-life-privacy
cd ~/kingdom-life-privacy
git init -b main
git add .
git commit -m "Privacy policy"
```

## 2. Create the public repo and push it

```
gh repo create kingdom-life-privacy --public --source=. --push
```

## 3. Turn on GitHub Pages for it

```
gh api -X POST repos/michaelpeccia/kingdom-life-privacy/pages -f "source[branch]=main" -f "source[path]=/"
```

Wait 1 to 2 minutes, then open the link above in your browser. If it says 404, wait another minute and refresh.

## Changing the policy later

Edit `~/kingdom-life-privacy/index.html` (also update the date at the top), then:

```
cd ~/kingdom-life-privacy
git add .
git commit -m "Update privacy policy"
git push
```

## Optional: use your own domain

To have it at `privacy.kingdom-life-ministry.com` instead:

1. In Cloudflare, add a DNS record: type **CNAME**, name **privacy**, target **michaelpeccia.github.io**, proxy **off (grey cloud)**, same as your app subdomain.
2. Then in Termux:

```
gh api -X PUT repos/michaelpeccia/kingdom-life-privacy/pages -f cname=privacy.kingdom-life-ministry.com
```

3. After about 15 minutes, turn on HTTPS:

```
gh api -X PUT repos/michaelpeccia/kingdom-life-privacy/pages -F https_enforced=true
```

The github.io link keeps working and forwards to the new address, so the link inside the app does not need to change.

## Google Play "Data safety" form: answers that match the app

- **Does your app collect or share any of the required user data types?** No.
  The app reads location only to calculate sunset times on the phone. It never leaves the phone, and Google's form counts data as "collected" only when it is sent off the device.
- **Ads:** the app contains no ads.
- **Target audience:** general audiences (not designed for children).
- **Privacy policy URL:** the link at the top of this file.

If the app ever adds anything that sends data off the phone (accounts, analytics, crash reporting, online sync), these answers and the policy page must be updated first.
