This folder contains a Firebase Cloud Function (see the functions folder) which updates the users document (list of users with their submission information).

Submission data are stored in a Firebase database, called a Cloud Firestore: 
https://console.firebase.google.com/u/0/project/nrp-mooc-database/database

The data are collected when the user submits an answer via a dedicated client

In order to deploy security rules only (defined in firebase.json and firestore.rules), run:
$ firebase deploy --only firestore:rules

In order to deploy cloud functions only, run:
$ firebase deploy --only functions

For further information about Firebase: https://firebase.google.com/docs/web/setup