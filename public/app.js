import { db, auth } from './firebase.js';
import { doc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// ୧. ସିକ୍ୟୁରିଟି ଚେକ୍ (ବିନା ଲଗଇନ୍ ରେ ପଶିଲେ ବାହାର କରିଦେବ)
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    }
});

// ==========================================
// ୨. ଲଗଆଉଟ୍ ଲଜିକ୍ (Logout Button)
// ==========================================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        logoutBtn.innerText = "Logging out... ⏳";
        signOut(auth).then(() => {
            window.location.replace("index.html");
        }).catch((error) => {
            alert("Logout Error: " + error.message);
            logoutBtn.innerText = "Logout";
        });
    });
}

// ==========================================
// ୩. ଡ୍ରପଡାଉନ୍ ଫିଲ୍ଟର୍ ଲଜିକ୍ 
// ==========================================
window.handleCategoryChange = async function() {
    const categoryId = document.getElementById("categoryId").value;
    const subCatDropdown = document.getElementById("subCategoryId");
    const subjectDropdown = document.getElementById("subjectName");

    if(subCatDropdown) subCatDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';
    if(subjectDropdown) subjectDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

    try {
        if (categoryId === "SUBJECTS" || categoryId === "SUBJECT") {
            const querySnapshot = await getDocs(collection(db, "subjects"));
            let options = '<option value="" disabled selected>-- Select Subject --</option>';
            querySnapshot.forEach((doc) => {
                options += `<option value="${doc.data().id}">${doc.data().name}</option>`;
            });
            if(subjectDropdown) subjectDropdown.innerHTML = options;
            
            if(document.getElementById("subjectGroup")) document.getElementById("subjectGroup").style.display = "block";
            if(document.getElementById("examGroup")) document.getElementById("examGroup").style.display = "none";
        } else {
            const q = query(collection(db, "subcategories"), where("categoryId", "==", categoryId));
            const querySnapshot = await getDocs(q);
            
            let options = '<option value="" disabled selected>-- Select Exam --</option>';
            querySnapshot.forEach((doc) => {
                options += `<option value="${doc.data().id}">${doc.data().name}</option>`;
            });
            if(subCatDropdown) subCatDropdown.innerHTML = options;

            if(document.getElementById("subjectGroup")) document.getElementById("subjectGroup").style.display = "none";
            if(document.getElementById("examGroup")) document.getElementById("examGroup").style.display = "block";
        }
    } catch (error) {
        console.error("Error loading subcategories: ", error);
    }
};

const categoryDropdown = document.getElementById("categoryId");
if(categoryDropdown) {
    categoryDropdown.addEventListener("change", handleCategoryChange);
}

// ==========================================
// ୪. ଟେଷ୍ଟ୍ ଅପଲୋଡ୍ ଲଜିକ୍
// ==========================================
const addTestForm = document.getElementById("addTestForm");

if(addTestForm) {
    addTestForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;

        const docId = document.getElementById("documentId").value.trim();
        const categoryId = document.getElementById("categoryId").value;
        
        let subCatValue;
        let topicValue = "";

        if (categoryId === "SUBJECTS" || categoryId === "SUBJECT") {
            subCatValue = document.getElementById("subjectName").value;
            topicValue = document.getElementById("topicName").value.trim();
        } else {
            subCatValue = document.getElementById("subCategoryId").value;
            topicValue = ""; 
        }

        const testData = {
            id: docId,
            title: document.getElementById("title").value,
            categoryId: categoryId,
            subCategoryId: subCatValue,
            topic: topicValue,
            type: document.getElementById("type").value,
            duration: Number(document.getElementById("duration").value),
            totalMarks: Number(document.getElementById("totalMarks").value),
            totalQuestions: Number(document.getElementById("totalQuestions").value),
            negativeMarks: Number(document.getElementById("negativeMarks").value),
            isActive: true,
            createdAt: new Date().toISOString()
        };

        try {
            let testDocRef;

            if (categoryId === "SUBJECTS" || categoryId === "SUBJECT") {
                testDocRef = doc(db, "subjects", subCatValue, "tests", docId);
            } else {
                testDocRef = doc(db, "exams", subCatValue, "tests", docId);
            }

            await setDoc(testDocRef, testData);
            
            alert("✅ Test Created Successfully!");
            document.getElementById("addTestForm").reset();
            
            if (typeof handleCategoryChange === "function") {
                handleCategoryChange(); 
            }
            
        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            submitBtn.innerText = "🚀 Upload Test to Firebase";
            submitBtn.disabled = false;
        }
    });
}