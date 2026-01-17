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
let userAnswers = [];
let score = 0;
let questionScores = new Map(); // Map: questionIndex -> Punktzahl (0.0 bis 1.0)
let totalQuestionsAnswered = 0; // Zähler für alle beantworteten Fragen (für Fortschrittsbalken)

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
    totalQuestionsAnswered = 0;
    
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
 * Visuelles Feedback für falsche Multiple-Choice-Antworten
 */
function showWrongAnswerFeedback() {
    // Alle ausgewählten Antworten rot highlighten
    const selectedOptions = answersContainer.querySelectorAll('.answer-option.selected');
    selectedOptions.forEach(option => {
        option.classList.add('wrong-answer');
        setTimeout(() => {
            option.classList.remove('wrong-answer');
        }, 800);
    });
    
    // Container schütteln
    answersContainer.classList.add('shake-animation');
    setTimeout(() => {
        answersContainer.classList.remove('shake-animation');
    }, 600);
}

/**
 * Game Over - Zeit abgelaufen
 */
function gameOver() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Score berechnen: Summe aller Teilpunkte
    score = 0;
    for (let i = 0; i < currentQuiz.questions.length; i++) {
        score += questionScores.get(i) || 0;
    }
    score = Math.round(score * 100) / 100;
    
    // Spezielle Game Over Anzeige
    quizGame.style.display = 'none';
    resultScreen.style.display = 'block';
    
    scoreDisplay.textContent = `${score}/${currentQuiz.questions.length}`;
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    percentageDisplay.textContent = `${percentage}%`;
    resultMessage.innerHTML = `<strong style="color: var(--danger);">Zeit abgelaufen!</strong><br>Du hast ${score} von ${currentQuiz.questions.length} Fragen richtig beantwortet.`;
    
    // Detaillierte Fragenübersicht auch bei Game Over anzeigen
    generateQuestionsReview();
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
    
    // Fortschrittsbalken aktualisieren
    if (timeChallengeMode) {
        // Bei Zeit-Challenge: Basierend auf richtig beantworteten Fragen
        const progress = (answeredCorrectly.size / currentQuiz.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
        questionCounter.textContent = `Frage ${answeredCorrectly.size + 1} von ${currentQuiz.questions.length} (${questionQueue.length} verbleibend)`;
    } else {
        // Bei normalen Quizzen: Basierend auf Gesamtzahl beantworteter Fragen
        const progress = (totalQuestionsAnswered / currentQuiz.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
        questionCounter.textContent = `Frage ${totalQuestionsAnswered + 1} von ${currentQuiz.questions.length}`;
    }
    
    // Fragetext anzeigen
    questionContainer.innerHTML = `
        <h2 class="question-text">${escapeHtml(question.text)}</h2>
    `;
    
    // Antworten anzeigen
    displayAnswers(question, actualQuestionIndex);
    
    // Fragentyp ermitteln (aus Frage selbst oder aus Quiz-Typ)
    const questionType = question.type || currentQuiz.type;
    
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
 * @param {number} questionIndex - Index der aktuellen Frage
 */
function displayAnswers(question, questionIndex) {
    answersContainer.innerHTML = '';
    
    // Fragentyp ermitteln (aus Frage selbst oder aus Quiz-Typ)
    const questionType = question.type || currentQuiz.type;
    
    // True/False bekommt spezielle quadratische Felder
    if (questionType === 'true-false') {
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
        const inputType = questionType === 'multiple-choice' ? 'checkbox' : 'radio';
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
 * @param {number} answerIndex - 0 für Wahr, 1 für Falsch
 */
function toggleTrueFalseAnswer(answerIndex) {
    const boxes = answersContainer.querySelectorAll('.truefalse-box');
    
    // Alle Boxen deselektieren
    boxes.forEach(box => box.classList.remove('selected', 'correct-feedback', 'wrong-feedback'));
    
    // Gewählte Box selektieren
    const selectedBox = boxes[answerIndex];
    
    // Radio-Input setzen
    const input = selectedBox.querySelector('input');
    input.checked = true;
    
    // Bei Zeitchallenge: Farb-Feedback und automatisch weiter
    if (timeChallengeMode) {
        const actualQuestionIndex = questionQueue[0];
        const question = currentQuiz.questions[actualQuestionIndex];
        const isCorrect = question.correctAnswers.includes(answerIndex);
        
        if (isCorrect) {
            selectedBox.classList.add('correct-feedback');
        } else {
            selectedBox.classList.add('wrong-feedback');
        }
        
        // Automatisch zur nächsten Frage
        setTimeout(() => {
            nextQuestion();
        }, 300);
    } else {
        // Bei normalem Quiz: Nur blau markieren, Benutzer muss Weiter klicken
        selectedBox.classList.add('selected');
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
        allOptions.forEach(option => option.classList.remove('selected', 'correct-feedback', 'wrong-feedback'));
        
        // Diese auswählen
        answerOption.classList.add('selected');
        input.checked = true;
        
        // Bei Zeit-Challenge: Sofort Feedback geben
        if (timeChallengeMode) {
            const actualQuestionIndex = questionQueue[0];
            const question = currentQuiz.questions[actualQuestionIndex];
            const isCorrect = question.correctAnswers.includes(answerIndex);
            
            answerOption.classList.remove('selected');
            if (isCorrect) {
                answerOption.classList.add('correct-feedback');
            } else {
                answerOption.classList.add('wrong-feedback');
            }
            
            setTimeout(() => {
                nextQuestion();
            }, 300); // Kurze Verzögerung für visuelles Feedback
        }
    } else {
        // Bei Checkbox: Togglen
        if (input.checked) {
            answerOption.classList.remove('selected', 'correct-feedback', 'wrong-feedback');
            input.checked = false;
        } else {
            input.checked = true;
            
            // Aktuelle Frage und Antwort prüfen
            const actualQuestionIndex = questionQueue[0];
            const question = currentQuiz.questions[actualQuestionIndex];
            const isCorrect = question.correctAnswers.includes(answerIndex);
            
            if (timeChallengeMode) {
                // Bei Zeitchallenge: Sofort Farb-Feedback (grün/rot)
                if (isCorrect) {
                    answerOption.classList.add('correct-feedback');
                } else {
                    answerOption.classList.add('wrong-feedback');
                }
            } else {
                // Bei normalem Quiz: Nur blau markieren, kein Feedback ob richtig/falsch
                answerOption.classList.add('selected');
            }
        }
    }
}

/**
 * Berechnet die Punktzahl für eine Frage (0.0 bis 1.0)
 * Bei Multiple-Choice: Jede Antwortmöglichkeit zählt gleich viel
 */
function calculateQuestionScore(question, selectedAnswers) {
    const questionType = question.type || currentQuiz.type;
    
    // Bei Multiple-Choice: Teilpunkte basierend auf korrekt behandelten Antworten
    if (questionType === 'multiple-choice') {
        const totalAnswers = question.answers.length;
        let correctlyHandled = 0;
        
        // Durch alle Antwortmöglichkeiten iterieren
        for (let i = 0; i < totalAnswers; i++) {
            const isCorrectAnswer = question.correctAnswers.includes(i);
            const wasSelected = selectedAnswers.includes(i);
            
            // Korrekt behandelt = (richtige ausgewählt) ODER (falsche nicht ausgewählt)
            if ((isCorrectAnswer && wasSelected) || (!isCorrectAnswer && !wasSelected)) {
                correctlyHandled++;
            }
        }
        
        // Score = (korrekt behandelte Antworten) / (total Antworten)
        return correctlyHandled / totalAnswers;
    }
    
    // Für True/False und Single-Choice: alles oder nichts
    const userSorted = [...selectedAnswers].sort((a, b) => a - b);
    const correctSorted = [...question.correctAnswers].sort((a, b) => a - b);
    return JSON.stringify(userSorted) === JSON.stringify(correctSorted) ? 1.0 : 0.0;
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
    const questionType = question.type || currentQuiz.type;
    
    // Punktzahl berechnen
    const questionScore = calculateQuestionScore(question, selectedAnswers);
    questionScores.set(actualQuestionIndex, questionScore);
    
    // Antwort prüfen (komplett richtig?)
    const userSorted = [...selectedAnswers].sort((a, b) => a - b);
    const correctSorted = [...correctAnswer].sort((a, b) => a - b);
    const isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
    
    // Antwort speichern
    userAnswers[actualQuestionIndex] = selectedAnswers;
    
    // In normalen Quizzen: Zähler erhöhen
    if (!timeChallengeMode) {
        totalQuestionsAnswered++;
    }
    
    if (isCorrect) {
        // Komplett richtig
        answeredCorrectly.add(actualQuestionIndex);
        questionQueue.shift();
        
        if (timeChallengeMode) {
            addTimeBonus();
        }
    } else {
        // Nicht komplett richtig - aber vielleicht Teilpunkte
        if (questionScore > 0) {
            answeredCorrectly.add(actualQuestionIndex);
        }
        
        if (questionType === 'multiple-choice') {
            showWrongAnswerFeedback();
        }
        
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
    
    // Score berechnen: Summe aller Teilpunkte
    score = 0;
    for (let i = 0; i < currentQuiz.questions.length; i++) {
        score += questionScores.get(i) || 0;
    }
    score = Math.round(score * 100) / 100;
    
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
    
    // Detaillierte Fragenübersicht generieren
    generateQuestionsReview();
}

/**
 * Detaillierte Übersicht aller Fragen mit Antworten generieren
 */
function generateQuestionsReview() {
    const reviewList = document.getElementById('questionsReviewList');
    reviewList.innerHTML = '';
    
    currentQuiz.questions.forEach((question, index) => {
        const questionScore = questionScores.get(index) || 0;
        const isFullyCorrect = questionScore === 1.0;
        const hasPartialPoints = questionScore > 0 && questionScore < 1.0;
        const userAnswerIndices = userAnswers[index] || [];
        const questionType = question.type || currentQuiz.type;
        
        // Container für Frage
        const questionItem = document.createElement('div');
        questionItem.className = `review-item ${isFullyCorrect ? 'correct' : (hasPartialPoints ? 'partial' : 'incorrect')}`;
        
        // Status-Icon und Punktzahl
        let statusIcon, statusClass, scoreText;
        if (isFullyCorrect) {
            statusIcon = '✓';
            statusClass = 'status-correct';
            scoreText = '1/1';
        } else if (hasPartialPoints) {
            statusIcon = '½';
            statusClass = 'status-partial';
            scoreText = `${Math.round(questionScore * 100) / 100}/1`;
        } else {
            statusIcon = '✗';
            statusClass = 'status-incorrect';
            scoreText = '0/1';
        }
        
        // Fragentext (max. 100 Zeichen, dann mit ... abkürzen)
        const questionText = question.text;
        const displayText = questionText.length > 100 ? questionText.substring(0, 100) + '...' : questionText;
        const isLongQuestion = questionText.length > 100;
        
        // HTML für Frage
        questionItem.innerHTML = `
            <div class="review-header">
                <span class="review-number">Frage ${index + 1}</span>
                <div class="review-score-container">
                    <span class="review-score">${scoreText}</span>
                    <span class="review-status ${statusClass}">${statusIcon}</span>
                </div>
            </div>
            <div class="review-question ${isLongQuestion ? 'expandable collapsed' : ''}" data-full-text="${escapeHtml(questionText)}">
                <div class="question-text-short">${escapeHtml(displayText)}</div>
                ${isLongQuestion ? '<button class="expand-btn" onclick="toggleQuestion(this)">Mehr anzeigen</button>' : ''}
            </div>
            <div class="review-answers">
                ${generateAnswersReview(question, userAnswerIndices, questionType)}
            </div>
        `;
        
        reviewList.appendChild(questionItem);
    });
}

/**
 * Generiert die Antwortübersicht für eine Frage
 */
function generateAnswersReview(question, userAnswerIndices, questionType) {
    if (questionType === 'true-false') {
        const correctAnswer = question.correctAnswers[0];
        const userAnswer = userAnswerIndices[0];
        const answers = ['Wahr', 'Falsch'];
        
        return `
            <div class="answer-review-item">
                <strong>Deine Antwort:</strong> 
                <span class="${userAnswer === correctAnswer ? 'correct-answer' : 'wrong-answer'}">
                    ${userAnswer !== undefined ? answers[userAnswer] : 'Keine Antwort'}
                </span>
            </div>
            ${userAnswer !== correctAnswer ? `
                <div class="answer-review-item">
                    <strong>Richtige Antwort:</strong> 
                    <span class="correct-answer">${answers[correctAnswer]}</span>
                </div>
            ` : ''}
        `;
    } else {
        // Single-Choice oder Multiple-Choice
        let html = '<div class="answer-list">';
        
        // Prüfen ob mindestens eine richtige Antwort ausgewählt wurde (Teilpunktzahl)
        const hasAnyCorrectSelected = question.correctAnswers.some(correctIdx => 
            userAnswerIndices.includes(correctIdx)
        );
        const hasAllCorrectSelected = question.correctAnswers.every(correctIdx => 
            userAnswerIndices.includes(correctIdx)
        );
        const isPartiallyCorrect = hasAnyCorrectSelected && !hasAllCorrectSelected;
        
        question.answers.forEach((answer, index) => {
            const isCorrect = question.correctAnswers.includes(index);
            const wasSelected = userAnswerIndices.includes(index);
            
            let answerClass = '';
            let icon = '';
            
            if (isCorrect && wasSelected) {
                answerClass = 'correct-selected';
                icon = '✓';
            } else if (isCorrect && !wasSelected) {
                // Wenn teilweise richtig, fehlende Antworten rot markieren
                if (isPartiallyCorrect) {
                    answerClass = 'missing-correct';
                    icon = '✗';
                } else {
                    answerClass = 'correct-not-selected';
                    icon = '✓';
                }
            } else if (!isCorrect && wasSelected) {
                answerClass = 'wrong-selected';
                icon = '✗';
            } else {
                answerClass = 'neutral';
                icon = '';
            }
            
            html += `
                <div class="answer-review-option ${answerClass}">
                    ${icon ? `<span class="answer-icon">${icon}</span>` : ''}
                    <span class="answer-text">${escapeHtml(answer)}</span>
                    ${isCorrect ? '<span class="correct-marker">(Richtige Antwort)</span>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
}

/**
 * Toggle für lange Fragetexte
 */
function toggleQuestion(button) {
    const reviewQuestion = button.parentElement;
    const fullText = reviewQuestion.dataset.fullText;
    const shortTextDiv = reviewQuestion.querySelector('.question-text-short');
    
    if (reviewQuestion.classList.contains('collapsed')) {
        // Expandieren
        reviewQuestion.classList.remove('collapsed');
        shortTextDiv.innerHTML = fullText;
        button.textContent = 'Weniger anzeigen';
    } else {
        // Kollabieren
        reviewQuestion.classList.add('collapsed');
        const displayText = fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText;
        shortTextDiv.innerHTML = displayText;
        button.textContent = 'Mehr anzeigen';
    }
}

/**
 * Quiz neu starten
 */
function restartQuiz() {
    userAnswers = [];
    score = 0;
    questionScores.clear();
    totalQuestionsAnswered = 0;
    
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

// Event Listeners
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);

// Quiz initialisieren
initializeQuiz();
