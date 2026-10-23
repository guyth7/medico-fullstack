# Strict Web / Flutter Firestore isolation

The Web application uses only `(default)`. The Flutter application must use
only `flutter-db`. Their rule files and deployment configurations are separate.

Create the Flutter Firestore instance once and inject/reuse it throughout the
Flutter application:

```dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

final FirebaseFirestore flutterFirestore =
    FirebaseFirestore.instanceFor(
  app: Firebase.app(),
  databaseId: 'flutter-db',
);
```

Use `flutterFirestore.collection(...)` instead of
`FirebaseFirestore.instance.collection(...)`.

Never use `FirebaseFirestore.instance` inside Flutter because it targets
`(default)`, which belongs to the Web application.

After billing is enabled for the Firebase project, create and configure the
database from this repository:

```powershell
npx.cmd --yes firebase-tools@14.21.0 firestore:databases:create flutter-db --location=nam5 --project medical-record-system-97a1f
npx.cmd --yes firebase-tools@14.21.0 deploy --config firebase.flutter.json --only firestore:rules --project medical-record-system-97a1f
```

Deploy Web rules independently:

```powershell
npx.cmd --yes firebase-tools@14.21.0 deploy --config firebase.web.json --only firestore:rules --project medical-record-system-97a1f
```

Do not use a shared deploy config for both databases. The separate `--config`
files make each deployment resolve to one explicit database ID and one rules
file.
