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
        const header =  String(createdDoc.submissionInfo.header);
        const subheader =  String(createdDoc.submissionInfo.subheader);
        // Get the 'users/<MOOC description>' doc from the Firestore
        const userRef = db.doc('users/' + String(userInfo.id)); 
        const userRefPromise = userRef.get().then(doc => {
            let userDocData = doc.data();
            let userDocDataObject = {  
                latestSubmission: submissionDate,  
                firstSubmission: submissionDate,
                fileName: createdDoc.fileName,
                latestFileContent: createdDoc.fileContent,
                latestScores: createdDoc.answer,
                numberOfSubmissions: Number(1)
            };
            if (!userDocData) {
                // The 'users' document needs to be created
                userDocData = {}; // header is a string which contains the name of the relevant MOOC
                userDocData[header] = {};
                userDocData[header][subheader] = userDocDataObject;
                userDocData.userInfo = userInfo;
                return userRef.set(userDocData);
            // The 'users/<user-id>' document exists
            } else {
                userDocDataObject.numberOfSubmissions = 0;
                // Modify the user doc if it exists
                if (userDocData[header] && userDocData[header][subheader]) userDocDataObject = userDocData[header][subheader]
                userDocDataObject.latestSubmission = submissionDate;
                userDocDataObject.fileName = String(createdDoc.fileName);
                userDocDataObject.latestFileContent = String(createdDoc.fileContent);
                userDocDataObject.latestScores = createdDoc.answer;
                const n = userDocDataObject.numberOfSubmissions + 1;
                userDocDataObject.numberOfSubmissions = Number(n);
                // Submit the updated user doc
                if (userDocData[header]) userDocData[header][subheader] = userDocDataObject;
                else { 
                    userDocData[header] = {};
                    userDocData[header][subheader] = userDocDataObject;
                }
                return userRef.update(userDocData);
            }

        });
        return userRefPromise;
    }
    return Promise.reject(new Error(
        "Missing userInfo field: the update of the users document failed."
    ));
    
});