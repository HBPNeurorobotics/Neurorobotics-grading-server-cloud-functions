'use strict';
const functions = require('firebase-functions');
let firebase = require('firebase-admin');

let initializeFirebase = () => {
    const serviceAccount = require('./serviceAccount.json');
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_CONFIG.databaseURL
    });
    let db = firebase.firestore();
    db.settings({ timestampsInSnapshots: true });
    return db;
}

let db = initializeFirebase();

// Increments the online users counters
exports.updateUsers = functions.firestore.document('submissions/{submissionId}').onCreate((snap, context) => {
    const createdDoc = snap.data();
    if (createdDoc.userInfo) {
        const userInfo = createdDoc.userInfo;
        const submissionDate = createdDoc.date;
        // Get the 'users' collection from the Firestore
        const usersCollection = db.collection('users');
        const usersRef = usersCollection.doc(createdDoc.submissionInfo); // submissionInfo is a string which contains the name of the relevant MOOC
        const usersRefPromise = usersRef.get().then(doc => {
            let usersDocData = doc.data();
            let usersDocDataObject = { 
                userInfo: userInfo, 
                latestSubmission: submissionDate,  
                firstSubmission: submissionDate,
                fileName: createdDoc.fileName,
                latestFileContent: createdDoc.fileContent,
                latestAnswer: Number(createdDoc.answer),
                answers: { '1': Number(createdDoc.answer) },
                bestAnswer: Number(createdDoc.answer),
                numberOfSubmissions: Number(1)
            };
            if (!usersDocData) {
                // The 'users' document needs to be created
                usersDocData = {};
                usersDocData[String(userInfo.id)] = usersDocDataObject;
                return usersRef.set(usersDocData);
            // The 'users' document exists
            } else {
                usersDocDataObject.numberOfSubmissions = 0;
                usersDocDataObject = usersDocData[String(userInfo.id)] ? usersDocData[String(userInfo.id)] : usersDocDataObject;
                usersDocDataObject.latestSubmission = submissionDate;
                usersDocDataObject.fileName = String(createdDoc.fileName);
                usersDocDataObject.latestFileContent = String(createdDoc.fileContent);
                let answer = Number(createdDoc.answer);
                usersDocDataObject.latestAnswer = Number(answer);
                const n = usersDocDataObject.numberOfSubmissions + 1;
                usersDocDataObject.answers[String(n)] = Number(answer);
                let bestAnswer = Number(usersDocDataObject.bestAnswer);
                usersDocDataObject.bestAnswer = Math.max(Number(bestAnswer), Number(answer));
                usersDocDataObject.numberOfSubmissions = Number(n);
                usersDocData[String(userInfo.id)] = usersDocDataObject;
                return usersRef.update(usersDocData);
            }

        });
        return usersRefPromise;
    }
    return Promise.reject(new Error(
        "Missing userInfo field: the update of the users document failed."
    ));
    
});