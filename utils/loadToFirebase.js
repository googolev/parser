const admin = require("firebase-admin");
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../key.json");
const fs = require('fs');

initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

async function loadToFirebase() {
    const testFolder = './data/';

    db.collection('ido')
    .get()
    .then(res => {
        res.forEach(element => {
            element.ref.delete();
        });
    });

    setTimeout(() => {
        fs.readdirSync(testFolder).forEach(filename => {
            let rawdata = fs.readFileSync(`./data/${filename}`)
            let data = JSON.parse(rawdata)
            data.forEach(ido => {
                let key = Boolean(ido.symbol.trim()) ? ido.symbol : ido.name.toUpperCase()
                db.collection('ido').doc(`${key}-${ido.provider}`).set(ido)
            })
        });
    }, 5000)

    
}

module.exports = {
    loadToFirebase
}