/**
 * Create-Seite: Quiz erstellen und bearbeiten
 * Ermöglicht das Erstellen neuer Quizzes und Bearbeiten bestehender Quizzes
 */

// DOM-Elemente
const pageTitle = document.getElementById('pageTitle');
const quizForm = document.getElementById('quizForm');
const quizTitleInput = document.getElementById('quizTitle');
const quizTypeSelect = document.getElementById('quizType');
const questionsContainer = document.getElementById('questionsContainer');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const timeChallengeOptions = document.getElementById('timeChallengeOptions');
const initialTimeInput = document.getElementById('initialTime');
const timeBonusInput = document.getElementById('timeBonus');
const timePenaltyInput = document.getElementById('timePenalty');

// Variablen
let editMode = false;
let editQuizId = null;
let questionCounter = 0;

// URL-Parameter auslesen (für Bearbeitungsmodus)
const urlParams = new URLSearchParams(window.location.search);
const quizIdParam = urlParams.get('id');

/**
 * Seite initialisieren
 */
function initializePage() {
    if (quizIdParam) {
        // Bearbeitungsmodus
        editMode = true;
        editQuizId = quizIdParam;
        pageTitle.textContent = 'Quiz bearbeiten';
        loadQuizForEditing(quizIdParam);
    } else {
        // Erstellungsmodus - erste Frage hinzufügen
        addQuestion();
    }
}

/**
 * Quiz zum Bearbeiten laden
 * @param {string} quizId - Die ID des Quiz
 */
function loadQuizForEditing(quizId) {
    const quiz = loadQuizById(quizId);
    
    if (!quiz) {
        showToast('Quiz nicht gefunden!', 'error');
        window.location.href = '../index.html';
        return;
    }
    
    // Grunddaten laden
    quizTitleInput.value = quiz.title;
    
    // Quiz-Typ setzen (mit oder ohne Zeit-Challenge)
    if (quiz.timeChallenge && quiz.timeChallenge.enabled) {
        // Zeit-Challenge aktiv - verwende den -time Typ
        const baseType = quiz.type.replace('-time', '');
        quizTypeSelect.value = baseType + '-time';
        timeChallengeOptions.style.display = 'block';
        initialTimeInput.value = quiz.timeChallenge.initialTime || 60;
        timeBonusInput.value = quiz.timeChallenge.timeBonus || 5;
        timePenaltyInput.value = quiz.timeChallenge.timePenalty || 3;
        initialTimeInput.required = true;
        timeBonusInput.required = true;
        timePenaltyInput.required = true;
    } else {
        quizTypeSelect.value = quiz.type;
    }
    
    // Fragen laden
    quiz.questions.forEach(question => {
        addQuestion(question);
    });
}

/**
 * Event Listeners
 */
addQuestionBtn.addEventListener('click', () => addQuestion());

quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveQuiz();
});

// Quiz-Typ-Änderung überwachen
quizTypeSelect.addEventListener('change', () => {
    const selectedType = quizTypeSelect.value;
    
    // Zeit-Challenge Optionen anzeigen wenn -time Typ gewählt
    if (selectedType.endsWith('-time')) {
        timeChallengeOptions.style.display = 'block';
        initialTimeInput.required = true;
        timeBonusInput.required = true;
        timePenaltyInput.required = true;
    } else {
        timeChallengeOptions.style.display = 'none';
        initialTimeInput.required = false;
        timeBonusInput.required = false;
        timePenaltyInput.required = false;
    }
    
    // Fragen neu rendern
    const questions = collectQuestionData();
    questionsContainer.innerHTML = '';
    questionCounter = 0;
    questions.forEach(q => addQuestion(q));
});

/**
 * Eine neue Frage hinzufügen
 * @param {Object} questionData - Optional: Vorhandene Fragendaten zum Laden
 */
function addQuestion(questionData = null) {
    questionCounter++;
    const questionId = `question_${questionCounter}`;
    let quizType = quizTypeSelect.value;
    
    // Basis-Typ extrahieren (ohne -time)
    const baseType = quizType.replace('-time', '');
    
    // Container für die Frage erstellen
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.dataset.questionId = questionId;    // Frage-Header
    const headerHtml = `
        <div class="question-header">
            <span class="question-number">Frage ${questionCounter}</span>
            <button type="button" class="remove-question" onclick="removeQuestion('${questionId}')">
                ×
            </button>
        </div>
    `;
    
    // Fragetext-Eingabe
    const questionTextHtml = `
        <div class="form-group">
            <label>Fragetext *</label>
            <textarea class="question-text-input" rows="3" required placeholder="Gib hier deine Frage ein...">${questionData ? escapeHtml(questionData.text) : ''}</textarea>
        </div>
    `;
    
    // Antworten basierend auf Quiz-Typ
    let answersHtml = '';
    
    if (baseType === 'true-false') {
        // Wahr/Falsch: Feste zwei Antworten
        const correctAnswer = questionData ? questionData.correctAnswers[0] : 0;
        answersHtml = `
            <div class="form-group">
                <label>Richtige Antwort auswählen *</label>
                <div class="answer-item">
                    <input type="radio" name="${questionId}_correct" value="0" ${correctAnswer === 0 ? 'checked' : ''} required>
                    <label>Wahr</label>
                </div>
                <div class="answer-item">
                    <input type="radio" name="${questionId}_correct" value="1" ${correctAnswer === 1 ? 'checked' : ''} required>
                    <label>Falsch</label>
                </div>
            </div>
        `;
    } else {
        // Single-Choice oder Multiple-Choice: Dynamische Antworten
        const inputType = baseType === 'single-choice' ? 'radio' : 'checkbox';
        const answerContainerId = `${questionId}_answers`;
        
        answersHtml = `
            <div class="form-group">
                <label>Antworten (markiere die richtige(n) Antwort(en)) *</label>
                <div id="${answerContainerId}" class="answers-list">
                    <!-- Antworten werden hier eingefügt -->
                </div>                <button type="button" class="btn btn-secondary btn-small add-answer-btn" 
                        onclick="addAnswer('${answerContainerId}', '${questionId}', '${inputType}')">
                    + Antwort
                </button>
            </div>
        `;
    }
    
    // Alles zusammenfügen
    questionDiv.innerHTML = headerHtml + questionTextHtml + answersHtml;
    questionsContainer.appendChild(questionDiv);
    
    // Bei Single/Multiple-Choice: Initiale Antworten hinzufügen
    if (baseType !== 'true-false') {
        const answerContainerId = `${questionId}_answers`;
        const inputType = baseType === 'single-choice' ? 'radio' : 'checkbox';
        
        if (questionData && questionData.answers) {
            // Vorhandene Antworten laden
            questionData.answers.forEach((answer, index) => {
                const isCorrect = questionData.correctAnswers.includes(index);
                addAnswer(answerContainerId, questionId, inputType, answer, isCorrect);
            });
        } else {
            // Zwei leere Antworten als Standard
            addAnswer(answerContainerId, questionId, inputType);
            addAnswer(answerContainerId, questionId, inputType);
        }
    }
}

/**
 * Eine Antwort hinzufügen (für Single/Multiple-Choice)
 * @param {string} containerId - ID des Antworten-Containers
 * @param {string} questionId - ID der Frage
 * @param {string} inputType - radio oder checkbox
 * @param {string} answerText - Optional: Vorhandener Antworttext
 * @param {boolean} isCorrect - Optional: Ist die Antwort korrekt?
 */
function addAnswer(containerId, questionId, inputType, answerText = '', isCorrect = false) {
    const container = document.getElementById(containerId);
    const answerIndex = container.children.length;
    const answerId = `${questionId}_answer_${answerIndex}`;
    
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-item';
    answerDiv.innerHTML = `
        <input type="${inputType}" 
               name="${questionId}_correct" 
               value="${answerIndex}" 
               ${isCorrect ? 'checked' : ''}
               ${inputType === 'radio' ? 'required' : ''}>
        <input type="text" 
               class="answer-text-input" 
               placeholder="Antwort ${answerIndex + 1}" 
               value="${escapeHtml(answerText)}"               required>
        <button type="button" class="remove-answer" onclick="removeAnswer(this)">
            ×
        </button>
    `;
    
    container.appendChild(answerDiv);
}

/**
 * Eine Antwort entfernen
 * @param {HTMLElement} button - Der Entfernen-Button
 */
function removeAnswer(button) {
    const answerItem = button.parentElement;
    const container = answerItem.parentElement;
    
    // Mindestens 2 Antworten müssen bleiben
    if (container.children.length <= 2) {
        showToast('Es müssen mindestens 2 Antworten vorhanden sein!', 'warning');
        return;
    }
    
    answerItem.remove();
}

/**
 * Eine Frage entfernen
 * @param {string} questionId - ID der zu entfernenden Frage
 */
function removeQuestion(questionId) {
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    
    // Mindestens 1 Frage muss bleiben
    if (questionsContainer.children.length <= 1) {
        showToast('Es muss mindestens 1 Frage vorhanden sein!', 'warning');
        return;
    }
    
    questionDiv.remove();
    renumberQuestions();
}

/**
 * Fragen neu nummerieren nach dem Löschen
 */
function renumberQuestions() {
    const questions = questionsContainer.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        const numberSpan = question.querySelector('.question-number');
        numberSpan.textContent = `Frage ${index + 1}`;
    });
}

/**
 * Fragendaten aus dem Formular sammeln
 * @returns {Array} Array von Fragen-Objekten
 */
function collectQuestionData() {
    const questions = [];
    const questionItems = questionsContainer.querySelectorAll('.question-item');
    
    questionItems.forEach(questionDiv => {
        const questionText = questionDiv.querySelector('.question-text-input').value.trim();
        let quizType = quizTypeSelect.value;
        const baseType = quizType.replace('-time', '');
        
        let answers = [];
        let correctAnswers = [];
        
        if (baseType === 'true-false') {
            // Wahr/Falsch
            answers = ['Wahr', 'Falsch'];
            const selectedRadio = questionDiv.querySelector('input[type="radio"]:checked');
            correctAnswers = [parseInt(selectedRadio.value)];
        } else {
            // Single-Choice oder Multiple-Choice
            const answerInputs = questionDiv.querySelectorAll('.answer-text-input');
            answerInputs.forEach((input, index) => {
                answers.push(input.value.trim());
            });
            
            const correctInputs = questionDiv.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
            correctInputs.forEach(input => {
                correctAnswers.push(parseInt(input.value));
            });
        }
        
        questions.push({
            text: questionText,
            answers: answers,
            correctAnswers: correctAnswers
        });
    });
    
    return questions;
}

/**
 * Quiz speichern
 */
function saveQuiz() {
    // Validierung
    if (!quizTitleInput.value.trim()) {
        showToast('Bitte gib einen Quiz-Titel ein!', 'warning');
        return;
    }
    
    if (!quizTypeSelect.value) {
        showToast('Bitte wähle einen Quiz-Typ aus!', 'warning');
        return;
    }
    
    if (questionsContainer.children.length === 0) {
        showToast('Bitte füge mindestens eine Frage hinzu!', 'warning');
        return;
    }
    
    // Daten sammeln
    let selectedType = quizTypeSelect.value;
    const baseType = selectedType.replace('-time', '');
    const isTimeChallenge = selectedType.endsWith('-time');
    
    const quizData = {
        title: quizTitleInput.value.trim(),
        type: baseType, // Speichere nur den Basis-Typ (ohne -time)
        questions: collectQuestionData(),
        timeChallenge: {
            enabled: isTimeChallenge,
            initialTime: isTimeChallenge ? parseInt(initialTimeInput.value) : 60,
            timeBonus: isTimeChallenge ? parseInt(timeBonusInput.value) : 5,
            timePenalty: isTimeChallenge ? parseInt(timePenaltyInput.value) : 3,
            repeatWrongQuestions: true // Immer aktiviert
        }
    };
    
    // Validierung: Mindestens eine richtige Antwort pro Frage
    for (let i = 0; i < quizData.questions.length; i++) {
        if (quizData.questions[i].correctAnswers.length === 0) {
            showToast(`Frage ${i + 1}: Bitte markiere mindestens eine richtige Antwort!`, 'warning');            return;
        }
    }
    
    // Speichern
    try {
        if (editMode) {
            // Quiz aktualisieren
            const success = updateQuiz(editQuizId, quizData);
            if (success) {
                window.location.href = '../index.html';
            }
        } else {
            // Neues Quiz erstellen
            const quizId = createQuiz(quizData);
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showToast('Fehler beim Speichern des Quiz!', 'error');
    }
}

/**
 * HTML-Entities escapen
 * @param {string} text - Der zu escapende Text
 * @returns {string} Der escapte Text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Seite initialisieren
initializePage();
