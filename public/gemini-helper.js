// Unified Gemini Backend Proxy & SEO Title Assistant for Odisha Exam Prep Admin Panel
// Backend handles API key and Gemini calls automatically without manual user entry.

// Convert title to a clean Firestore document ID / slug
export function generateSlug(text) {
    if (!text) return "test_" + Date.now().toString().slice(-4);
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '_')
        .slice(0, 32);
}

// Client-side Fallback SEO Algorithm (used if offline or static hosting without backend)
export function generateClientOfflineTitles({ roughTitle = "", examName = "", categoryName = "", testType = "", subjectName = "" }) {
    const currentYear = new Date().getFullYear();
    const baseSubject = subjectName && subjectName !== "All" ? subjectName : "";
    const rough = (roughTitle || "").trim();

    let baseExam = examName || categoryName || "Odisha Govt Exam";
    baseExam = baseExam.replace(/--.*--/g, '').trim();

    const suggestions = [];

    let title1 = `${baseExam} ${currentYear} : Full Length Mock Test 01 (100% Exam Pattern)`;
    if (rough) title1 = `${baseExam} : ${rough} - Full Mock 01 (${currentYear})`;
    suggestions.push({
        type: "🔥 High CTR Mock",
        tag: "Most Popular",
        title: title1,
        slug: generateSlug(`${baseExam}_mock_01`),
        hook: "ପରୀକ୍ଷା ଢାଞ୍ଚା ଅନୁସାରେ ପ୍ରସ୍ତୁତ Full Length Test"
    });

    let title2 = `Target ${baseExam} : High Scoring Speed Test 01`;
    if (baseSubject) title2 = `${baseExam} : ${baseSubject} High Scoring Practice Test 01`;
    else if (rough) title2 = `Score Booster : ${baseExam} (${rough}) Practice 01`;
    suggestions.push({
        type: "🎯 Score Booster",
        tag: "High Scoring",
        title: title2,
        slug: generateSlug(`${baseExam}_speed_01`),
        hook: "କମ୍ ସମୟରେ ଅଧିକ ସ୍କୋର କରିବା ପାଇଁ ଅଭ୍ୟାସ ଟେଷ୍ଟ"
    });

    let topicName = baseSubject || rough || "General Studies & Aptitude";
    let title3 = `${baseExam} : ${topicName} Mastery Test (Top Expected MCQs)`;
    suggestions.push({
        type: "⚡ Subject Focus",
        tag: "Topic Wise",
        title: title3,
        slug: generateSlug(`${baseExam}_${topicName}_01`),
        hook: "ବିଷୟଭିତ୍ତିକ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନୋତ୍ତର ସେଟ୍"
    });

    let title4 = `${baseExam} Previous Year Question Paper (${currentYear - 1} Solved)`;
    if (testType === "Previous Year" || rough.toLowerCase().includes("pyq") || rough.toLowerCase().includes("previous")) {
        title4 = `${baseExam} Official PYQ Solved Paper (${currentYear - 1} Shift-1)`;
    }
    suggestions.push({
        type: "📜 Official PYQ",
        tag: "Previous Year",
        title: title4,
        slug: generateSlug(`${baseExam}_pyq_${currentYear - 1}`),
        hook: "ବିଗତ ବର୍ଷର ସଠିକ୍ ପ୍ରଶ୍ନ ଓ ଓଡ଼ିଆରେ ଉତ୍ତର ବିଶ୍ଳେଷଣ"
    });

    let title5 = `Mission ${baseExam} ${currentYear} : Selection Special Test 01`;
    suggestions.push({
        type: "🏆 Selection Series",
        tag: "Exam Special",
        title: title5,
        slug: generateSlug(`${baseExam}_mission_${currentYear}`),
        hook: "ଅନ୍ତିମ ପର୍ଯ୍ୟାୟ ଚୟନ ପାଇଁ ସ୍ୱତନ୍ତ୍ର ଟେଷ୍ଟ"
    });

    return suggestions;
}

// Request SEO Titles from Backend (No manual API key required!)
export async function generateGeminiSeoTitles({ roughTitle = "", examName = "", categoryName = "", testType = "", subjectName = "" }) {
    try {
        const response = await fetch('/api/gemini/suggest-titles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roughTitle, examName, categoryName, testType, subjectName })
        });

        if (response.ok) {
            const data = await response.json().catch(() => null);
            if (data && data.suggestions && data.suggestions.length > 0) {
                return {
                    source: data.source || "backend",
                    model: data.model || "",
                    suggestions: data.suggestions
                };
            }
        }
    } catch (e) {
        console.warn("Backend API not reachable, trying direct Gemini:", e.message);
    }

    // Try direct Gemini client if backend is not reachable
    try {
        const apiKey = getClientGeminiApiKey();
        if (apiKey) {
            const prompt = `You are an expert exam strategist for Odisha government exams (OSSC, OSSC CGL, ASO, OPSC, OSSSC, Police).
Suggest 5 high-converting mock test titles with catchy Odia marketing hooks based on:
Subject: ${subjectName || 'General Studies'}
Exam/Category: ${examName || categoryName || 'Odisha Govt Exam'}
Topic/Rough Title: ${roughTitle || 'Comprehensive Test'}
Test Type: ${testType || 'Mock Test'}

Return ONLY a valid JSON array of 5 objects in this format:
[
  {
    "type": "Mock Test",
    "tag": "Short Tag",
    "title": "Title in English/Odia",
    "slug": "url_safe_slug_max_32_chars",
    "hook": "Odisha candidates hook in Odia language"
  }
]`;

            const data = await callDirectGeminiClient([
                { role: 'user', parts: [{ text: prompt }] }
            ], {
                responseMimeType: 'application/json',
                temperature: 0.7
            });

            const candidate = data.candidates?.[0];
            const rawText = candidate?.content?.parts?.[0]?.text || "[]";
            const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
            const suggestions = JSON.parse(cleaned);
            if (Array.isArray(suggestions) && suggestions.length > 0) {
                return {
                    source: "gemini",
                    model: "gemini-3.8-flash",
                    suggestions
                };
            }
        }
    } catch (directErr) {
        console.warn("Direct Gemini title generation failed, falling back to offline engine:", directErr.message);
    }

    // Client-side fallback if backend API and direct Gemini are not available
    return {
        source: "client_fallback",
        model: "",
        suggestions: generateClientOfflineTitles({ roughTitle, examName, categoryName, testType, subjectName })
    };
}

// Pre-configured paid Gemini API Key for Odisha Exam Prep Admin Panel
const DEFAULT_GEMINI_API_KEY = localStorage.getItem("odisha_gemini_api_key") || "";

// Client-side Direct API Helper for Static Hosting (Firebase Hosting fallback)
export function getClientGeminiApiKey() {
    return localStorage.getItem("odisha_gemini_api_key") || DEFAULT_GEMINI_API_KEY;
}

export function setClientGeminiApiKey(key) {
    if (key) localStorage.setItem("odisha_gemini_api_key", key.trim());
}

async function promptForGeminiApiKey() {
    if (window.Swal) {
        const { value: key } = await Swal.fire({
            title: "Gemini API Key Required",
            input: "password",
            inputLabel: "Firebase Hosting ରେ AI ବ୍ୟବହାର କରିବା ପାଇଁ ଆପଣଙ୍କ Google Gemini API Key ଦିଅନ୍ତୁ:",
            inputPlaceholder: "AQ.Ab8RN6JjxEHOsCH...",
            showCancelButton: true,
            confirmButtonText: "Save & Continue",
            confirmButtonColor: "#4f46e5"
        });
        if (key) setClientGeminiApiKey(key);
        return key;
    } else {
        const key = prompt("Enter your Google Gemini API Key for AI operations on Firebase Hosting:");
        if (key) setClientGeminiApiKey(key);
        return key;
    }
}

async function callDirectGeminiClient(contents, generationConfig = {}) {
    let apiKey = getClientGeminiApiKey();
    if (!apiKey) {
        apiKey = await promptForGeminiApiKey();
        if (!apiKey) throw new Error("Google Gemini API Key ପ୍ରଦାନ କରାଯାଇ ନାହିଁ।");
    }

    const models = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash"
    ];
    let lastErr = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({ contents, generationConfig })
            });

            if (res.ok) {
                return await res.json();
            } else {
                const errJson = await res.json().catch(() => ({}));
                lastErr = new Error(errJson.error?.message || `HTTP ${res.status}`);
                if (res.status === 400 || res.status === 403) {
                    if (localStorage.getItem("odisha_gemini_api_key")) {
                        localStorage.removeItem("odisha_gemini_api_key");
                    }
                    break;
                }
            }
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error("Failed to call Gemini API");
}

// Universal Question & Instruction Gap Formatter across all subjects
export function formatQuestionTextWithGap(raw) {
    if (!raw || typeof raw !== 'string') return raw || '';
    
    // 1. Normalize linebreaks (convert literal '\n' string to actual newline)
    let text = raw.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

    // 2. Separate coded conditions: e.g. 'P * Q' means ... 'P / Q' means ...
    text = text.replace(/(')\s*(['][^']{1,25}[']\s*means\b)/gi, "$1\n$2");
    text = text.replace(/(")\s*(["][^"]{1,25}["]\s*means\b)/gi, "$1\n$2");

    // 3. Separate Statements and Conclusions blocks
    text = text.replace(/([^\n])\s*(Statements\s*:)/gi, "$1\n\n$2");
    text = text.replace(/([^\n])\s*(Conclusions\s*:)/gi, "$1\n\n$2");
    text = text.replace(/([^\n])\s*(\b[1-9]\s*[\.\)]\s*[A-Za-z])/g, "$1\n$2");
    text = text.replace(/([^\n])\s*(\b(?:I|II|III|IV|V|VI)\s*[\.\)]\s*[A-Za-z])/g, "$1\n$2");

    // 4. Direction / Instruction to Question gap (global match across all standard question starters)
    const questionStarters = [
        'Which of the following',
        'Which one of the following',
        'Which equation',
        'Which statement',
        'Which option',
        'Which conclusion',
        'What is',
        'What will be',
        'What should',
        'What does',
        'How is',
        'How many',
        'How much',
        'Who among the following',
        'Who is',
        'Find the',
        'Calculate the',
        'Determine the',
        'Select the correct',
        'Choose the correct',
        'Identify the',
        'In which of the following',
        'When did',
        'Where is'
    ];

    const qStarterRegex = new RegExp('([.:\\\'\\\"\\?\\)])\\s+(' + questionStarters.join('|') + ')\\b', 'gi');
    text = text.replace(qStarterRegex, '$1\n\n$2');

    // 5. If question begins with "Read the following..." or "Direction..." or "Study the..."
    text = text.replace(/^(Read the following[^:\n]+:?|Direction\s*(?:\([^)]+\))?:?|Study the following[^:\n]+:?)\s*(?!\n)/i, "$1\n");

    // 6. For English vocabulary / analogy / grammar: "In the following question... Medicine : Patient..."
    text = text.replace(/^(In the following question[s]?,?[^.\n]+[.:])\s*([A-Za-z0-9])/i, "$1\n\n$2");

    // 7. Ensure clean spacing (no 3+ consecutive newlines)
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return text;
}

// Normalize questions array with proper gap
export function sanitizeQuestionsList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(q => {
        if (!q || typeof q !== 'object') return q;
        const qText = formatQuestionTextWithGap(q.questions || q.question || '');
        return {
            ...q,
            questions: qText,
            question: qText
        };
    });
}

// Call Backend for AI Question Generation (with Static Hosting fallback)
export async function generateQuestionsBackend(promptText) {
    // 1. Try local backend proxy first
    try {
        const response = await fetch('/api/gemini/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText })
        });
        if (response.ok) {
            const resData = await response.json();
            return { questions: sanitizeQuestionsList(resData.questions || []) };
        }
    } catch (e) {
        // Backend proxy not reachable (running on static Firebase Hosting)
    }

    // 2. Direct client fallback
    const data = await callDirectGeminiClient([
        { role: 'user', parts: [{ text: promptText }] }
    ], {
        responseMimeType: 'application/json',
        temperature: 0.2
    });

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || "[]";
    const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    const parsed = JSON.parse(cleaned);
    return { questions: sanitizeQuestionsList(parsed) };
}

// Call Backend for Multimodal Vision OCR (with Static Hosting fallback)
export async function extractQuestionsBackend(promptText, base64File, fileMimeType) {
    // 1. Try local backend proxy first
    try {
        const response = await fetch('/api/gemini/extract-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText, base64File, fileMimeType })
        });
        if (response.ok) {
            const resData = await response.json();
            return { questions: sanitizeQuestionsList(resData.questions || []) };
        }
    } catch (e) {
        // Backend proxy not reachable (running on static Firebase Hosting)
    }

    // 2. Direct client fallback
    const parts = [{ text: promptText }];
    if (base64File && fileMimeType) {
        parts.push({
            inline_data: {
                mime_type: fileMimeType,
                data: base64File
            }
        });
    }

    const data = await callDirectGeminiClient([
        { role: 'user', parts: parts }
    ], {
        responseMimeType: 'application/json',
        temperature: 0.2
    });

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || "[]";
    const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    const parsed = JSON.parse(cleaned);
    return { questions: sanitizeQuestionsList(parsed) };
}

// Call Backend for Text Formatting (with Static Hosting fallback)
export async function formatTextBackend(promptText) {
    // 1. Try local backend proxy first
    try {
        const response = await fetch('/api/gemini/format-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText })
        });
        if (response.ok) {
            const resData = await response.json();
            return { questions: sanitizeQuestionsList(resData.questions || []) };
        }
    } catch (e) {
        // Backend proxy not reachable
    }

    // 2. Direct client fallback
    const data = await callDirectGeminiClient([
        { role: 'user', parts: [{ text: promptText }] }
    ], {
        responseMimeType: 'application/json',
        temperature: 0.2
    });

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || "[]";
    const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    const parsed = JSON.parse(cleaned);
    return { questions: sanitizeQuestionsList(parsed) };
}

// Universal UI Helper: Attach AI Title & SEO Assistant to any page
export function attachTitleAssistant({
    titleInputId = "title",
    docIdInputId = "documentId",
    btnSuggestId = "btnSuggestTitles",
    trayId = "seoAssistantTray",
    gridId = "seoSuggestionsGrid",
    loadingId = "seoLoading",
    badgeId = "seoEngineBadge",
    refreshBtnId = "btnRefreshSeo",
    closeBtnId = "btnCloseSeoTray",
    getContext = () => ({})
}) {
    const titleInput = document.getElementById(titleInputId);
    const docIdInput = document.getElementById(docIdInputId);
    if (!titleInput || !docIdInput) return;

    let manualDocIdEdited = false;
    docIdInput.addEventListener("input", () => {
        manualDocIdEdited = docIdInput.value.trim().length > 0;
    });

    // Real-time Auto-slug conversion
    titleInput.addEventListener("input", () => {
        if (!manualDocIdEdited || !docIdInput.value.trim()) {
            docIdInput.value = generateSlug(titleInput.value);
        }
    });

    const tray = document.getElementById(trayId);
    const grid = document.getElementById(gridId);
    const loading = document.getElementById(loadingId);
    const badge = document.getElementById(badgeId);

    async function loadSuggestions() {
        if (!tray || !grid) return;
        tray.classList.remove("hidden");
        if (loading) loading.classList.remove("hidden");
        grid.innerHTML = "";

        const ctx = getContext() || {};
        const roughTitle = titleInput.value.trim();

        try {
            const result = await generateGeminiSeoTitles({
                roughTitle: roughTitle || ctx.roughTitle || "",
                examName: ctx.examName || "",
                categoryName: ctx.categoryName || "",
                testType: ctx.testType || "Mock Test",
                subjectName: ctx.subjectName || ""
            });

            if (loading) loading.classList.add("hidden");

            if (badge) {
                if (result.source === "gemini") {
                    badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200";
                    badge.innerHTML = `<i class="fa-solid fa-bolt mr-1"></i> Gemini Backend (${result.model || '2.0 Flash'})`;
                } else {
                    badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200";
                    badge.innerHTML = `<i class="fa-solid fa-sparkles mr-1"></i> Auto SEO Engine`;
                }
            }

            if (!result.suggestions || result.suggestions.length === 0) {
                grid.innerHTML = '<p class="text-xs text-slate-500 py-3 text-center">No suggestions. Try typing keywords in the title box.</p>';
                return;
            }

            result.suggestions.forEach((item) => {
                const card = document.createElement("div");
                card.className = "p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group";
                card.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    ${item.tag || item.type || 'SEO Option'}
                                </span>
                                <span class="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">ID: ${item.slug}</span>
                            </div>
                            <h5 class="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                ${item.title}
                            </h5>
                            ${item.hook ? `<p class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-indigo-400 text-[10px]"></i><span>${item.hook}</span></p>` : ''}
                        </div>
                        <button type="button" class="btn-primary text-xs py-1.5 px-3.5 self-end sm:self-auto shrink-0 shadow-sm flex items-center gap-1.5">
                            <span>Apply</span>
                            <i class="fa-solid fa-arrow-right text-[10px]"></i>
                        </button>
                    </div>
                `;

                card.addEventListener("click", () => {
                    titleInput.value = item.title;
                    docIdInput.value = item.slug;
                    manualDocIdEdited = true;

                    // Glow feedback
                    titleInput.classList.add("ring-2", "ring-emerald-500", "border-emerald-500");
                    docIdInput.classList.add("ring-2", "ring-emerald-500", "border-emerald-500");
                    setTimeout(() => {
                        titleInput.classList.remove("ring-2", "ring-emerald-500", "border-emerald-500");
                        docIdInput.classList.remove("ring-2", "ring-emerald-500", "border-emerald-500");
                    }, 1500);

                    if (window.showToast) {
                        window.showToast("Title & Document ID ସେଟ୍ ହୋଇଗଲା! 🎯", "success");
                    }
                    tray.classList.add("hidden");
                });

                grid.appendChild(card);
            });

        } catch (err) {
            if (loading) loading.classList.add("hidden");
            grid.innerHTML = `<p class="text-xs text-red-500 py-3 text-center">Error: ${err.message}</p>`;
        }
    }

    const btnSuggest = document.getElementById(btnSuggestId);
    if (btnSuggest) btnSuggest.addEventListener("click", loadSuggestions);

    const btnRefresh = document.getElementById(refreshBtnId);
    if (btnRefresh) btnRefresh.addEventListener("click", loadSuggestions);

    const btnClose = document.getElementById(closeBtnId);
    if (btnClose && tray) {
        btnClose.addEventListener("click", () => tray.classList.add("hidden"));
    }
}
