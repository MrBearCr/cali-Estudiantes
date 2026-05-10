import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDLoT0UT6Mjqt79imx3L-VEgCvF5kM2SwM",
    authDomain: "ucla-dcee.firebaseapp.com",
    projectId: "ucla-dcee",
    appId: "1:979938594101:web:33175aa41323550fa1107c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const users = [
    { username: "profesor", pass: "profesor123", role: "teacher", fullName: "Profesor de Prueba" },
    { username: "lucia", pass: "alumno123", role: "student", fullName: "Lucia Garcia" }
];

async function seed() {
    for (const u of users) {
        try {
            const email = `${u.username}@school.edu`;
            const userCredential = await createUserWithEmailAndPassword(auth, email, u.pass);
            
            // Crear documento en Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username: u.username,
                fullName: u.fullName,
                role: u.role,
                createdAt: new Date().toISOString()
            });
            
            console.log(`✅ Usuario creado y registrado en Firestore: ${u.username}`);
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') {
                console.log(`ℹ️ El usuario ${u.username} ya existe en Auth.`);
            } else {
                console.error(`❌ Error con ${u.username}:`, e.message);
            }
        }
    }
    process.exit(0);
}

seed();
