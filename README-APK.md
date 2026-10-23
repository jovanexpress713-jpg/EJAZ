# VICTORIA Logistics ERP — Android build and handoff notes

## Application identity

- Display name: `VICTORIA Logistics ERP`
- Business module: مؤسسة إيجاز للنقليات
- Android package: `sa.ejaz.transport`
- Current project version: `1.2.0` (`versionCode 3`)
- Android launcher icon: `app/src/main/res/drawable/ic_ejaz_launcher.xml`
- Build workflow: `.github/workflows/build-ejaz-apk.yml`

## Build and download

1. Open [GitHub Actions](https://github.com/jovanexpress713-jpg/EJAZ/actions).
2. Open the newest run with a green check mark.
3. In the run summary, download the artifact named `VICTORIA-Logistics-ERP-APK-v1.2.0`.
4. Extract the ZIP and install the APK on an Android test device.
5. Test sign-in, adding/editing a trip, customer and driver records, collection/expense vouchers, reports, backup export/import, and restart persistence before using live customer data.

The workflow runs the TypeScript check, builds the web assets, validates Android resources, assembles the APK, and checks the APK archive and size.

## Important delivery limitations

- The workflow currently produces a **debug-signed APK**. It can be installed for internal testing, but it is not a production-signed release. To deliver stable future upgrades, create a private release keystore and configure its values as GitHub Actions secrets. Never commit the keystore or passwords to this repository.
- The app stores records locally using IndexedDB/LocalStorage. The actual storage quota depends on the Android WebView, operating system, and device. The app cannot guarantee unlimited storage or a fixed 1 TB quota. Export and verify backups regularly.
- A central server is **not connected by default**. Multi-device synchronization requires deploying the Node server on a private, persistent host, setting `JWT_SECRET` and `OWNER_SETUP_KEY`, configuring the server URL in the app, and testing sync in both directions. A green APK build does not mean a central database is connected.
- The current finance screens cover trips, collections, expenses, and operational balances. Do not represent the app as a complete double-entry accounting/general-ledger system until journal entries, balanced debits/credits, account chart, and trial-balance reconciliation are implemented and tested.
- Company legal/contact fields are intentionally blank in a fresh install. Enter and verify the customer's official name, address, phone, tax number, commercial registration, currency, and tax rate before issuing customer-facing documents.
- The app must be tested on the actual customer's Android devices and with approved test data before production handoff. No automated build can guarantee zero defects.

## Central server environment

Copy `.env.example` to a private server's `.env`, replace all example secrets with long random values, and keep the real file out of Git. The server should use persistent disk storage and a restricted HTTPS endpoint. Configure `OWNER_SETUP_KEY` only for the one-time owner setup, then rotate or disable it according to the deployment procedure.

## Data protection

Before updating or migrating an installation, export a backup and confirm that the exported file can be imported into a test installation. Do not clear app data or uninstall the existing application until a backup has been verified.
