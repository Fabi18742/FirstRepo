/**
 * Index-Seite: Übersicht aller Quizzes
 * Zeigt alle gespeicherten Quizzes an und ermöglicht das Starten, Bearbeiten und Löschen
 */

// DOM-Elemente
const quizListElement = document.getElementById('quizList');
const emptyStateElement = document.getElementById('emptyState');
const createNewQuizBtn = document.getElementById('createNewQuiz');
const exportAllBtn = document.getElementById('exportAllBtn');
const importPanelToggle = document.getElementById('importPanelToggle');
const importPanel = document.getElementById('importPanel');
const importTextarea = document.getElementById('importTextarea');
const importConfirmBtn = document.getElementById('importConfirmBtn');

// Event Listeners
createNewQuizBtn.addEventListener('click', () => {
    window.location.href = 'pages/create.html';
});

// Export-All button
if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
        const str = exportAllQuizzesToString();
        if (!str) return alert('Fehler beim Erstellen des Export-Strings.');
        navigator.clipboard?.writeText(str).then(() => {
            alert('Export-String (alle Quizzes) wurde in die Zwischenablage kopiert.');
        }).catch(() => {
            // Fallback: show in prompt
            prompt('Export-String (kopieren):', str);
        });
    });
}

// Import panel toggle
if (importPanelToggle && importPanel) {
    importPanelToggle.addEventListener('click', () => {
        importPanel.classList.toggle('open');
        importPanelToggle.setAttribute('aria-expanded', importPanel.classList.contains('open'));
    });
}

// Import confirm
if (importConfirmBtn && importTextarea) {
    importConfirmBtn.addEventListener('click', () => {
        const text = importTextarea.value.trim();
        if (!text) return alert('Bitte füge einen Export-String ein.');
        try {
            const res = importQuizzesFromString(text);
            importTextarea.value = '';
            displayQuizzes();
        } catch (err) {
            console.error(err);
            alert('Fehler beim Import: ' + (err.message || err));
        }
    });
}

/**
 * Alle Quizzes laden und anzeigen
 */
function displayQuizzes() {
    const quizzes = loadQuizzes();
    
    // Leeren Zustand anzeigen, wenn keine Quizzes vorhanden
    if (quizzes.length === 0) {
        quizListElement.style.display = 'none';
        emptyStateElement.style.display = 'block';
        return;
    }
    
    // Quizzes anzeigen
    quizListElement.style.display = 'grid';
    emptyStateElement.style.display = 'none';
    
    // Quiz-Liste leeren
    quizListElement.innerHTML = '';
    
    // Jedes Quiz als Card anzeigen
    quizzes.forEach(quiz => {
        const quizCard = createQuizCard(quiz);
        quizListElement.appendChild(quizCard);
    });
}

/**
 * Eine Quiz-Card erstellen
 * @param {Object} quiz - Das Quiz-Objekt
 * @returns {HTMLElement} Das Quiz-Card Element
 */
function createQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    
    // Anzahl der Fragen
    const questionCount = quiz.questions.length;
    const questionText = questionCount === 1 ? 'Frage' : 'Fragen';
    
    card.innerHTML = `
        <div class="quiz-card-header">
            <div>
                <h3 class="quiz-card-title">${escapeHtml(quiz.title)}</h3>
                <span class="quiz-card-type">${getQuizTypeLabel(quiz.type)} • ${questionCount} ${questionText}</span>
            </div>
        </div>
        <div class="quiz-card-actions">
            <div class="quiz-card-actions-left">
                <button class="btn btn-success btn-small" onclick="startQuiz('${quiz.id}')">Starten</button>
                <button class="btn btn-primary btn-small" onclick="editQuiz('${quiz.id}')">Bearbeiten</button>
                <button class="btn btn-danger btn-small" onclick="confirmDeleteQuiz('${quiz.id}', '${escapeHtml(quiz.title)}')">Löschen</button>
            </div>
            <button class="btn btn-secondary btn-small" onclick="exportQuizString('${quiz.id}')">Export</button>
        </div>
    `;
    
    return card;
}

// Export a single quiz to clipboard (string)
function exportQuizString(quizId) {
    const quiz = loadQuizById(quizId);
    if (!quiz) return alert('Quiz nicht gefunden.');
    const str = exportQuizToString(quiz);
    if (!str) return alert('Fehler beim Erstellen des Export-Strings.');
    navigator.clipboard?.writeText(str).then(() => {
        alert('Export-String wurde in die Zwischenablage kopiert.');
    }).catch(() => {
        prompt('Export-String (kopieren):', str);
    });
}

/**
 * Quiz starten
 * @param {string} quizId - Die ID des Quiz
 */
function startQuiz(quizId) {
    window.location.href = `pages/play.html?id=${quizId}`;
}

/**
 * Quiz bearbeiten
 * @param {string} quizId - Die ID des Quiz
 */
function editQuiz(quizId) {
    window.location.href = `pages/create.html?id=${quizId}`;
}

/**
 * Bestätigung vor dem Löschen
 * @param {string} quizId - Die ID des Quiz
 * @param {string} quizTitle - Der Titel des Quiz
 */
function confirmDeleteQuiz(quizId, quizTitle) {
    const confirmed = confirm(
        `Möchtest du das Quiz "${quizTitle}" wirklich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`
    );
    
    if (confirmed) {
        const success = deleteQuiz(quizId);
        if (success) {
            displayQuizzes(); // Liste aktualisieren
        } else {
            alert('Fehler beim Löschen des Quiz!');
        }
    }
}

/**
 * HTML-Entities escapen (Schutz vor XSS)
 * @param {string} text - Der zu escapende Text
 * @returns {string} Der escapte Text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Quizzes beim Laden der Seite anzeigen
displayQuizzes();
