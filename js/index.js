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
const sortSelect = document.getElementById('sortSelect');

// Event Listeners
createNewQuizBtn.addEventListener('click', () => {
    window.location.href = 'pages/create.html';
});

// Sortier-Select
if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        displayQuizzes();
    });
}

// Export-All button
if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
        const str = exportAllQuizzesToString();
        if (!str) return showToast('Fehler beim Erstellen des Export-Strings.', 'error');
        navigator.clipboard?.writeText(str).then(() => {
            showToast('Export-String (alle Quizzes) wurde in die Zwischenablage kopiert.', 'success');
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
    const performImport = () => {
        const text = importTextarea.value.trim();
        if (!text) return showToast('Bitte füge einen Export-String ein.', 'warning');
        try {
            const res = importQuizzesFromString(text);
            importTextarea.value = '';
            displayQuizzes();
            showToast(`${res.added} Quiz${res.added > 1 ? 'zes' : ''} erfolgreich importiert!`, 'success');
            
            // Import-Panel automatisch schließen
            if (importPanel) {
                importPanel.classList.remove('open');
                if (importPanelToggle) {
                    importPanelToggle.setAttribute('aria-expanded', 'false');
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Fehler beim Import: ' + (err.message || err), 'error');
        }
    };
    
    // Click-Event für Button
    importConfirmBtn.addEventListener('click', performImport);
    
    // Enter-Taste im Textarea
    importTextarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            e.stopPropagation();
            performImport();
            return false;
        }
    });
}
/**
 * Quizzes sortieren
 * @param {Array} quizzes - Array von Quiz-Objekten
 * @param {string} sortBy - Sortierkriterium
 * @returns {Array} Sortiertes Array
 */
function sortQuizzes(quizzes, sortBy) {
    const sorted = [...quizzes]; // Kopie erstellen
    
    switch(sortBy) {
        case 'date-desc':
            // Neueste zuerst (Standard)
            return sorted.reverse();
            
        case 'date-asc':
            // Älteste zuerst
            return sorted;
            
        case 'name-asc':
            // Name A-Z
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
            
        case 'name-desc':
            // Name Z-A
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
            
        case 'type':
            // Nach Typ sortieren
            const typeOrder = {
                'single-choice': 1,
                'single-choice-time': 2,
                'multiple-choice': 3,
                'multiple-choice-time': 4,
                'true-false': 5,
                'true-false-time': 6
            };
            return sorted.sort((a, b) => {
                const orderA = typeOrder[a.type] || 999;
                const orderB = typeOrder[b.type] || 999;
                return orderA - orderB;
            });
            
        case 'questions-desc':
            // Meiste Fragen zuerst
            return sorted.sort((a, b) => b.questions.length - a.questions.length);
            
        case 'questions-asc':
            // Wenigste Fragen zuerst
            return sorted.sort((a, b) => a.questions.length - b.questions.length);
            
        default:
            return sorted;
    }
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
    
    // Sortierung anwenden
    const sortSelect = document.getElementById('sortSelect');
    const sortBy = sortSelect ? sortSelect.value : 'date-desc';
    const sortedQuizzes = sortQuizzes(quizzes, sortBy);
    
    // Quizzes anzeigen
    quizListElement.style.display = 'grid';
    emptyStateElement.style.display = 'none';
    
    // Quiz-Liste leeren
    quizListElement.innerHTML = '';
    
    // Jedes Quiz als Card anzeigen
    sortedQuizzes.forEach(quiz => {
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
    
    // Basis-Klasse
    let cardClasses = 'quiz-card';
    
    // Quiz-Typ-spezifische Klasse hinzufügen
    if (quiz.type === 'single-choice') {
        cardClasses += ' quiz-card-single-choice';
    } else if (quiz.type === 'multiple-choice') {
        cardClasses += ' quiz-card-multiple-choice';
    } else if (quiz.type === 'true-false') {
        cardClasses += ' quiz-card-true-false';
    }
    
    // Zeit-Challenge Klasse hinzufügen
    if (quiz.timeChallenge && quiz.timeChallenge.enabled) {
        cardClasses += ' quiz-card-time-challenge';
    }
    
    card.className = cardClasses;
    
    // Anzahl der Fragen
    const questionCount = quiz.questions.length;
    const questionText = questionCount === 1 ? 'Frage' : 'Fragen';
    
    // Zeit-Challenge Badge
    const timeChallengeBadge = (quiz.timeChallenge && quiz.timeChallenge.enabled) 
        ? '<span class="time-challenge-badge">Zeit-Challenge</span>' 
        : '';
    
    card.innerHTML = `
        <div class="quiz-card-header">
            <div>
                <h3 class="quiz-card-title">${escapeHtml(quiz.title)}</h3>
            </div>
            <button class="btn btn-primary btn-icon-only quiz-edit-btn" onclick="editQuiz('${quiz.id}')" title="Bearbeiten">
                <span class="icon-edit">⚙</span>
            </button>
        </div>
        <div class="quiz-card-meta">
            <span class="quiz-card-type">${getQuizTypeLabel(quiz.type)}</span>
            <span class="quiz-card-questions">${questionCount} ${questionText}</span>
            ${timeChallengeBadge}
        </div>
        <div class="quiz-card-actions">
            <button class="btn btn-success btn-small" onclick="startQuiz('${quiz.id}')">Starten</button>
            <div class="quiz-card-actions-right">
                <button class="btn btn-secondary btn-icon-only btn-subtle" onclick="exportQuizString('${quiz.id}')" title="Export">
                    <span class="icon-export">↗</span>
                </button>
                <button class="btn btn-danger btn-icon-only btn-subtle" onclick="confirmDeleteQuiz('${quiz.id}', '${escapeHtml(quiz.title)}')" title="Löschen">
                    <span class="icon-delete">🗑</span>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Export a single quiz to clipboard (string)
function exportQuizString(quizId) {
    const quiz = loadQuizById(quizId);
    if (!quiz) return showToast('Quiz nicht gefunden.', 'error');
    const str = exportQuizToString(quiz);
    if (!str) return showToast('Fehler beim Erstellen des Export-Strings.', 'error');
    navigator.clipboard?.writeText(str).then(() => {
        showToast('Export-String wurde in die Zwischenablage kopiert.', 'success');
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
async function confirmDeleteQuiz(quizId, quizTitle) {
    const confirmed = await showConfirm(
        `Möchtest du das Quiz "${quizTitle}" wirklich löschen?<br><br>Dieser Vorgang kann nicht rückgängig gemacht werden.`,
        'Quiz löschen',
        'Löschen',
        'Abbrechen'
    );
    
    if (confirmed) {
        const success = deleteQuiz(quizId);
        if (success) {
            displayQuizzes(); // Liste aktualisieren
            showToast('Quiz erfolgreich gelöscht.', 'success');
        } else {
            showToast('Fehler beim Löschen des Quiz!', 'error');
        }
    }
}

// Quizzes beim Laden der Seite anzeigen
displayQuizzes();
