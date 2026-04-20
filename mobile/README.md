# Mobile App (Flutter)

This folder contains Flutter app code for the rapid reporting flow.

## Bootstrap

If platform folders are missing, run:

```bash
flutter create .
```

Then keep the existing `lib/` and `pubspec.yaml`.

## Run

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

For physical devices, point `API_BASE_URL` to your machine IP.

If uploads fail on emulator, configure backend `.env` so `S3_PUBLIC_ENDPOINT` is reachable
from the device/emulator (for Android emulator typically `http://10.0.2.2:9000`).
