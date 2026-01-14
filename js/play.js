/**
 * Play-Seite: Quiz spielen
 * Ermöglicht das Durchspielen eines Quiz und zeigt am Ende das Ergebnis an
 */

// DOM-Elemente
const quizTitleElement = document.getElementById('quizTitle');
const progressFill = document.getElementById('progressFill');
const questionCounter = document.getElementById('questionCounter');
const questionContainer = document.getElementById('questionContainer');
const answersContainer = document.getElementById('answersContainer');
const nextBtn = document.getElementById('nextBtn');
const quizGame = document.getElementById('quizGame');
const resultScreen = document.getElementById('resultScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const percentageDisplay = document.getElementById('percentageDisplay');
const resultMessage = document.getElementById('resultMessage');
const restartBtn = document.getElementById('restartBtn');
const timerDisplay = document.getElementById('timerDisplay');
const timeRemaining = document.getElementById('timeRemaining');

// Variablen
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;

// Timer-Variablen
let timeChallengeMode = false;
let timeLeft = 0;
let timerInterval = null;

// Fragen-Warteschlange für Wiederholungen
let questionQueue = [];
let answeredCorrectly = new Set(); // Set von Fragen-Indizes die richtig beantwortet wurden

// URL-Parameter auslesen
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('id');

/**
 * Quiz initialisieren und starten
 */
function initializeQuiz() {
    if (!quizId) {
        showToast('Kein Quiz ausgewählt!', 'error');
        window.location.href = '../index.html';
        return;
    }
    
    currentQuiz = loadQuizById(quizId);
    
    if (!currentQuiz) {
        showToast('Quiz nicht gefunden!', 'error');
        window.location.href = '../index.html';
        return;
    }
    
    // Quiz-Titel anzeigen
    quizTitleElement.textContent = currentQuiz.title;
    
    // Fragen-Queue initialisieren (Indizes aller Fragen)
    questionQueue = currentQuiz.questions.map((_, index) => index);
    answeredCorrectly.clear();
    
    // Zeit-Challenge prüfen und initialisieren
    if (currentQuiz.timeChallenge && currentQuiz.timeChallenge.enabled) {
        timeChallengeMode = true;
        timeLeft = currentQuiz.timeChallenge.initialTime;
        timerDisplay.style.display = 'flex';
        updateTimerDisplay();
        startTimer();
    }
    
    // Erste Frage anzeigen
    showQuestion();
}

/**
 * Timer starten
 */
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            gameOver();
        }
    }, 1000);
}

/**
 * Timer-Anzeige aktualisieren
 */
function updateTimerDisplay() {
    timeRemaining.textContent = timeLeft;
    
    // Visuelle Warnung bei wenig Zeit
    if (timeLeft <= 10) {
        timerDisplay.classList.add('timer-critical');
        timerDisplay.classList.remove('timer-warning');
    } else if (timeLeft <= 20) {
        timerDisplay.classList.add('timer-warning');
        timerDisplay.classList.remove('timer-critical');
    } else {
        timerDisplay.classList.remove('timer-warning', 'timer-critical');
    }
}

/**
 * Zeit-Bonus hinzufügen (bei richtiger Antwort)
 */
function addTimeBonus() {
    if (timeChallengeMode && currentQuiz.timeChallenge) {
        const bonus = currentQuiz.timeChallenge.timeBonus;
        timeLeft += bonus;
        updateTimerDisplay();
        
        // Visuelles Feedback
        showTimeBonusAnimation(bonus);
    }
}

/**
 * Zeit-Strafe abziehen (bei falscher Antwort)
 */
function subtractTimePenalty(penalty) {
    if (timeChallengeMode) {
        timeLeft -= penalty;
        if (timeLeft < 0) timeLeft = 0;
        updateTimerDisplay();
        
        // Visuelles Feedback
        showTimePenaltyAnimation(penalty);
    }
}

/**
 * Animation für Zeit-Bonus anzeigen
 */
function showTimeBonusAnimation(bonus) {
    const bonusElement = document.createElement('div');
    bonusElement.className = 'time-bonus-animation';
    bonusElement.textContent = `+${bonus}s`;
    timerDisplay.appendChild(bonusElement);
    
    setTimeout(() => {
        bonusElement.remove();
    }, 1000);
}

/**
 * Animation für Zeit-Strafe anzeigen
 */
function showTimePenaltyAnimation(penalty) {
    const penaltyElement = document.createElement('div');
    penaltyElement.className = 'time-penalty-animation';
    penaltyElement.textContent = `-${penalty}s`;
    timerDisplay.appendChild(penaltyElement);
    
    setTimeout(() => {
        penaltyElement.remove();
    }, 1000);
}

/**
 * Game Over - Zeit abgelaufen
 */
function gameOver() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Score ist die Anzahl der richtig beantworteten Fragen
    score = answeredCorrectly.size;
    
    // Spezielle Game Over Anzeige
    quizGame.style.display = 'none';
    resultScreen.style.display = 'block';
    
    scoreDisplay.textContent = `${score}/${currentQuiz.questions.length}`;
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    percentageDisplay.textContent = `${percentage}%`;
    resultMessage.innerHTML = `<strong style="color: var(--danger);">Zeit abgelaufen!</strong><br>Du hast ${score} von ${currentQuiz.questions.length} Fragen richtig beantwortet.`;
}

/**
 * Aktuelle Frage anzeigen
 */
function showQuestion() {
    // Prüfen ob noch Fragen in der Queue sind
    if (questionQueue.length === 0) {
        // Alle Fragen richtig beantwortet!
        showResult();
        return;
    }
    
    // Nächste Frage aus der Queue holen
    const actualQuestionIndex = questionQueue[0];
    const question = currentQuiz.questions[actualQuestionIndex];
    
    // Fortschrittsbalken aktualisieren (basierend auf richtig beantworteten Fragen)
    const progress = (answeredCorrectly.size / currentQuiz.questions.length) * 100;
    progressFill.style.width = `${progress}%`;
    
    // Fragenzähler aktualisieren
    questionCounter.textContent = `Frage ${answeredCorrectly.size + 1} von ${currentQuiz.questions.length} (${questionQueue.length} verbleibend)`;
    
    // Fragetext anzeigen
    questionContainer.innerHTML = `
        <h2 class="question-text">${escapeHtml(question.text)}</h2>
    `;
    
    // Antworten anzeigen
    displayAnswers(question);
    
    // Button-Text anpassen und bei Zeit-Challenge ausblenden
    if (timeChallengeMode) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.innerHTML = 'Weiter <span class="btn-icon">→</span>';
    }
}

/**
 * Antworten basierend auf Quiz-Typ anzeigen
 * @param {Object} question - Das Fragen-Objekt
 */
function displayAnswers(question) {
    answersContainer.innerHTML = '';
    
    // True/False bekommt spezielle quadratische Felder
    if (currentQuiz.type === 'true-false') {
        const truefalseContainer = document.createElement('div');
        truefalseContainer.className = 'truefalse-container';
        
        // Wahr-Feld (links)
        const trueBox = document.createElement('div');
        trueBox.className = 'truefalse-box';
        trueBox.innerHTML = `
            <input type="radio" id="answer_true" name="current_answer" value="0" style="display: none;">
            <div class="truefalse-label">Wahr</div>
        `;
        trueBox.onclick = () => toggleTrueFalseAnswer(0);
        
        // Falsch-Feld (rechts)
        const falseBox = document.createElement('div');
        falseBox.className = 'truefalse-box';
        falseBox.innerHTML = `
            <input type="radio" id="answer_false" name="current_answer" value="1" style="display: none;">
            <div class="truefalse-label">Falsch</div>
        `;
        falseBox.onclick = () => toggleTrueFalseAnswer(1);
        
        truefalseContainer.appendChild(trueBox);
        truefalseContainer.appendChild(falseBox);
        answersContainer.appendChild(truefalseContainer);
    } else {
        // Normal für Single/Multiple Choice
        const inputType = currentQuiz.type === 'multiple-choice' ? 'checkbox' : 'radio';
        const inputName = 'current_answer';
        
        question.answers.forEach((answer, index) => {
            const answerId = `answer_${index}`;
            
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-option';
            answerDiv.onclick = () => toggleAnswer(index, inputType);
            
            answerDiv.innerHTML = `
                <input type="${inputType}" 
                       id="${answerId}" 
                       name="${inputName}" 
                       value="${index}">
                <label for="${answerId}">${escapeHtml(answer)}</label>
            `;
            
            answersContainer.appendChild(answerDiv);
        });
    }
}

/**
 * True/False Antwort auswählen
 * @param {number} answerIndex - 0 für Falsch, 1 für Wahr
 */
function toggleTrueFalseAnswer(answerIndex) {
    const boxes = answersContainer.querySelectorAll('.truefalse-box');
    
    // Alle Boxen deselektieren
    boxes.forEach(box => box.classList.remove('selected'));
    
    // Gewählte Box selektieren
    const selectedBox = boxes[answerIndex];
    selectedBox.classList.add('selected');
    
    // Radio-Input setzen
    const input = selectedBox.querySelector('input');
    input.checked = true;
    
    // Bei Zeit-Challenge: Automatisch weiter
    if (timeChallengeMode) {
        setTimeout(() => {
            nextQuestion();
        }, 300);
    }
}

/**
 * True/False Antwort auswählen
 * @param {number} answerIndex - 0 für Falsch, 1 für Wahr
 */
function toggleTrueFalseAnswer(answerIndex) {
    const boxes = answersContainer.querySelectorAll('.truefalse-box');
    
    // Alle Boxen deselektieren
    boxes.forEach(box => box.classList.remove('selected'));
    
    // Gewählte Box selektieren
    const selectedBox = boxes[answerIndex];
    selectedBox.classList.add('selected');
    
    // Radio-Input setzen
    const input = selectedBox.querySelector('input');
    input.checked = true;
    
    // Bei Zeit-Challenge: Automatisch weiter
    if (timeChallengeMode) {
        setTimeout(() => {
            nextQuestion();
        }, 300);
    }
}

/**
 * Antwort auswählen/abwählen
 * @param {number} answerIndex - Index der Antwort
 * @param {string} inputType - radio oder checkbox
 */
function toggleAnswer(answerIndex, inputType) {
    const answerOption = answersContainer.children[answerIndex];
    const input = answerOption.querySelector('input');
    
    if (inputType === 'radio') {
        // Bei Radio: Alle anderen abwählen
        const allOptions = answersContainer.querySelectorAll('.answer-option');
        allOptions.forEach(option => option.classList.remove('selected'));
        
        // Diese auswählen
        answerOption.classList.add('selected');
        input.checked = true;
        
        // Bei Zeit-Challenge und Radio (Single-Choice/True-False): Automatisch weiter
        if (timeChallengeMode) {
            setTimeout(() => {
                nextQuestion();
            }, 300); // Kurze Verzögerung für visuelles Feedback
        }
    } else {
        // Bei Checkbox: Togglen
        if (input.checked) {
            answerOption.classList.remove('selected');
            input.checked = false;
        } else {
            answerOption.classList.add('selected');
            input.checked = true;
        }
    }
}

/**
 * Zur nächsten Frage oder zum Ergebnis
 */
function nextQuestion() {
    // Antwort sammeln
    const selectedAnswers = getSelectedAnswers();
    
    // Validierung: Mindestens eine Antwort muss ausgewählt sein (außer im Zeit-Challenge-Modus bei Radio)
    if (selectedAnswers.length === 0 && !timeChallengeMode) {
        showToast('Bitte wähle mindestens eine Antwort aus!', 'warning');
        return;
    }
    
    // Im Zeit-Challenge-Modus bei Radio wird automatisch weitergeschaltet, 
    // daher sollte hier keine Validierung stattfinden
    if (selectedAnswers.length === 0 && timeChallengeMode) {
        return; // Nichts tun, wenn keine Antwort ausgewählt wurde
    }
    
    // Aktuelle Frage aus der Queue holen
    const actualQuestionIndex = questionQueue[0];
    const question = currentQuiz.questions[actualQuestionIndex];
    const correctAnswer = question.correctAnswers;
    
    // Antwort prüfen
    const userSorted = [...selectedAnswers].sort((a, b) => a - b);
    const correctSorted = [...correctAnswer].sort((a, b) => a - b);
    const isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
    
    // Antwort speichern
    userAnswers[actualQuestionIndex] = selectedAnswers;
    
    if (isCorrect) {
        // Richtige Antwort
        answeredCorrectly.add(actualQuestionIndex);
        questionQueue.shift(); // Frage aus der Queue entfernen
        
        // Bei Zeit-Challenge: Zeit-Bonus geben
        if (timeChallengeMode) {
            addTimeBonus();
        }
    } else {
        // Falsche Antwort
        if (timeChallengeMode && currentQuiz.timeChallenge.repeatWrongQuestions) {
            // Frage hinten anstellen
            questionQueue.shift(); // Von vorne entfernen
            questionQueue.push(actualQuestionIndex); // Hinten anhängen
            
            // Zeit-Strafe
            if (currentQuiz.timeChallenge.timePenalty > 0) {
                subtractTimePenalty(currentQuiz.timeChallenge.timePenalty);
            }
        } else {
            // Ohne Wiederholung: Frage ist "beantwortet" (auch wenn falsch)
            questionQueue.shift();
        }
    }
    
    // Nächste Frage anzeigen
    showQuestion();
}

/**
 * Ausgewählte Antworten ermitteln
 * @returns {Array} Array von ausgewählten Antwort-Indizes
 */
function getSelectedAnswers() {
    const selected = [];
    const inputs = answersContainer.querySelectorAll('input:checked');
    
    inputs.forEach(input => {
        selected.push(parseInt(input.value));
    });
    
    return selected;
}

/**
 * Ergebnis berechnen und anzeigen
 */
function showResult() {
    // Timer stoppen falls aktiv
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Score ist die Anzahl der richtig beantworteten Fragen
    score = answeredCorrectly.size;
    
    // Prozentsatz berechnen
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    
    // Ergebnis anzeigen
    quizGame.style.display = 'none';
    resultScreen.style.display = 'block';
    
    scoreDisplay.textContent = `${score}/${currentQuiz.questions.length}`;
    percentageDisplay.textContent = `${percentage}%`;    // Motivierende Nachricht basierend auf Prozentsatz
    let message = '';
    if (percentage === 100) {
        message = 'Perfekt! Du hast alle Fragen richtig beantwortet!';
    } else if (percentage >= 80) {
        message = 'Sehr gut! Fast alle Fragen richtig!';
    } else if (percentage >= 60) {
        message = 'Gut gemacht! Das war solide!';
    } else if (percentage >= 40) {
        message = 'Nicht schlecht! Mit etwas Übung wird es noch besser!';
    } else {
        message = 'Versuch es nochmal! Übung macht den Meister!';
    }
    
    resultMessage.textContent = message;
}

/**
 * Quiz neu starten
 */
function restartQuiz() {
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    
    // Fragen-Queue zurücksetzen
    questionQueue = currentQuiz.questions.map((_, index) => index);
    answeredCorrectly.clear();
    
    // Timer zurücksetzen
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    if (timeChallengeMode && currentQuiz.timeChallenge) {
        timeLeft = currentQuiz.timeChallenge.initialTime;
        updateTimerDisplay();
        startTimer();
    }
    
    resultScreen.style.display = 'none';
    quizGame.style.display = 'block';
    
    showQuestion();
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

// Event Listeners
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);

// Quiz initialisieren
initializeQuiz();
