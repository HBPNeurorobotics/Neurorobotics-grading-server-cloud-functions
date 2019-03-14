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
        const submissionInfo =  String(createdDoc.submissionInfo);
        // Get the 'users/<MOOC description>' doc from the Firestore
        const userRef = db.doc('users/' + String(userInfo.id)); 
        const userRefPromise = userRef.get().then(doc => {
            let userDocData = doc.data();
            let userDocDataObject = { 
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
            if (!userDocData) {
                // The 'users' document needs to be created
                userDocData = {}; // submissionInfo is a string which contains the name of the relevant MOOC
                userDocData[submissionInfo] = userDocDataObject;
                return userRef.set(userDocData);
            // The 'users/<user-id>' document exists
            } else {
                userDocDataObject.numberOfSubmissions = 0;
                userDocDataObject = userDocData[submissionInfo] ? userDocData[submissionInfo] : userDocDataObject;
                userDocDataObject.latestSubmission = submissionDate;
                userDocDataObject.fileName = String(createdDoc.fileName);
                userDocDataObject.latestFileContent = String(createdDoc.fileContent);
                let answer = Number(createdDoc.answer);
                userDocDataObject.latestAnswer = Number(answer);
                const n = userDocDataObject.numberOfSubmissions + 1;
                userDocDataObject.answers[String(n)] = Number(answer);
                let bestAnswer = Number(userDocDataObject.bestAnswer);
                userDocDataObject.bestAnswer = Math.max(Number(bestAnswer), Number(answer));
                userDocDataObject.numberOfSubmissions = Number(n);
                userDocData[submissionInfo] = userDocDataObject;
                return userRef.update(userDocData);
            }

        });
        return userRefPromise;
    }
    return Promise.reject(new Error(
        "Missing userInfo field: the update of the users document failed."
    ));
    
});