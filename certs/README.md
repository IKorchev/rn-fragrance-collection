# OTA code-signing certificate

`certificate.pem` goes here — download it from the xprem dashboard under
**App Info → Download certificate** and rename it:

```bash
mv ~/Downloads/app-<your-app-id>-certificate.txt certs/certificate.pem
```

**Commit it.** It is public: it ships inside the binary so `expo-updates` can
verify that an update manifest really came from your server. `app.config.js`
points `updates.codeSigningCertificate` at this path, and `expo prebuild` fails
if the file is missing.

The matching **private key never leaves the server** — in control-plane mode
xprem generates it and seals it in Postgres with `DB_KEYS_MASTER_KEY_B64`, and
there is deliberately no way to download it. So there is nothing secret in this
directory. `.gitignore` still ignores `*.pem` generally and un-ignores only
`certs/certificate.pem`, so a stray private key dropped here cannot be committed
by accident.

See `docs/ota-self-hosted.md`.
