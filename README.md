# Stellar Technical Services — website demo

A responsive single-page site built with plain HTML, CSS and JavaScript. Run it through the included Node server; opening `index.html` as a `file://` URL bypasses the form API. The hero visual is in `assets/pool-hero.png`; service and About photography uses replaceable Unsplash image URLs.

## Run locally

Use Node.js 20 or newer. A private admin password has been generated in the ignored `.env` file. Keep it private; retrieve it in PowerShell with `Get-Content .env`. Start the site with:

```powershell
npm start
```

Open `http://127.0.0.1:4173` for the site. Review submissions at `http://127.0.0.1:4173/admin` and sign in with the `ADMIN_PASSWORD` from `.env`. The admin session expires after one hour. To change the password, replace its value in `.env` and restart the server.

## Storage and deployment

Submissions are saved in `data/inquiries.json` on the server and are excluded from Git. Back up that file securely. The admin page is password protected, but the website should be hosted behind HTTPS before collecting real customer information. Configure `ADMIN_PASSWORD` in the hosting environment; in production the server sets secure session cookies. The form does not send email or depend on a third-party form provider.

Replace the sample contact details and image assets with approved client information before launch.
