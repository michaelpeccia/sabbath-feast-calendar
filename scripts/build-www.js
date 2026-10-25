// Copies the app files into www/ for the Android build. Run with: npm run build
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "js"), { recursive: true });
for (const f of ["index.html", "style.css"]) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of fs.readdirSync(path.join(root, "js"))) {
  if (f.endsWith(".js")) fs.copyFileSync(path.join(root, "js", f), path.join(out, "js", f));
}
console.log("Copied app files into www/");
