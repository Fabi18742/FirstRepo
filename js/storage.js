/**
 * Storage Manager für Quiz-Daten
 * Verwaltet alle localStorage-Operationen
 */

const STORAGE_KEY = 'quizApp_quizzes';

/**
 * Toast-Notification anzeigen
 * @param {string} message - Die anzuzeigende Nachricht
 * @param {string} type - Der Typ: 'success', 'error', 'warning', 'info' (Standard: 'info')
 * @param {number} duration - Anzeigedauer in ms (Standard: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Toast-Container erstellen falls nicht vorhanden
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Toast erstellen
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon basierend auf Typ
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Nach Dauer ausblenden und entfernen
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            toast.remove();
            // Container entfernen wenn leer
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, duration);
}

/**
 * Confirmation Modal anzeigen
 * @param {string} message - Die Bestätigungsnachricht
 * @param {string} title - Der Titel (Standard: 'Bestätigung')
 * @param {string} confirmText - Text für Bestätigen-Button (Standard: 'Bestätigen')
 * @param {string} cancelText - Text für Abbrechen-Button (Standard: 'Abbrechen')
 * @returns {Promise<boolean>} Promise die true zurückgibt bei Bestätigung, false bei Abbruch
 */
function showConfirm(message, title = 'Bestätigung', confirmText = 'Bestätigen', cancelText = 'Abbrechen') {
    return new Promise((resolve) => {
        // Modal-Overlay erstellen
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Modal erstellen
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <span class="modal-icon">⚠️</span>
                <h2 class="modal-title">${title}</h2>
            </div>
            <div class="modal-message">${message}</div>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel">${cancelText}</button>
                <button class="btn btn-danger modal-confirm">${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Event-Handler
        const confirmBtn = modal.querySelector('.modal-confirm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        
        const closeModal = (result) => {
            overlay.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 200);
        };
        
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(false);
        });
        
        // ESC-Taste zum Schließen
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Alle Quizzes aus dem localStorage laden
 * @returns {Array} Array von Quiz-Objekten
 */
function loadQuizzes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Fehler beim Laden der Quizzes:', error);
        return [];
    }
}

/**
 * Alle Quizzes im localStorage speichern
 * @param {Array} quizzes - Array von Quiz-Objekten
 */
function saveQuizzes(quizzes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der Quizzes:', error);
        showToast('Fehler beim Speichern! Möglicherweise ist der Speicher voll.', 'error');
        return false;
    }
}

/**
 * Ein einzelnes Quiz anhand der ID laden
 * @param {string} quizId - Die ID des Quiz
 * @returns {Object|null} Das Quiz-Objekt oder null
 */
function loadQuizById(quizId) {
    const quizzes = loadQuizzes();
    return quizzes.find(quiz => quiz.id === quizId) || null;
}

/**
 * Ein neues Quiz erstellen und speichern
 * @param {Object} quizData - Die Quiz-Daten
 * @returns {string} Die ID des erstellten Quiz
 */
function createQuiz(quizData) {
    const quizzes = loadQuizzes();
    
    // Neue ID generieren
    const newQuiz = {
        id: generateId(),
        title: quizData.title,
        type: quizData.type,
        questions: quizData.questions,
        timeChallenge: quizData.timeChallenge || {
            enabled: false,
            initialTime: 60,
            timeBonus: 5,
            timePenalty: 3,
            repeatWrongQuestions: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    quizzes.push(newQuiz);
    saveQuizzes(quizzes);
    
    return newQuiz.id;
}

/**
 * Ein bestehendes Quiz aktualisieren
 * @param {string} quizId - Die ID des Quiz
 * @param {Object} quizData - Die aktualisierten Quiz-Daten
 * @returns {boolean} true bei Erfolg, false bei Fehler
 */
function updateQuiz(quizId, quizData) {
    const quizzes = loadQuizzes();
    const index = quizzes.findIndex(quiz => quiz.id === quizId);
    
    if (index === -1) {
        console.error('Quiz nicht gefunden:', quizId);
        return false;
    }
    
    // Quiz aktualisieren, ID und createdAt beibehalten
    quizzes[index] = {
        ...quizzes[index],
        title: quizData.title,
        type: quizData.type,
        questions: quizData.questions,
        timeChallenge: quizData.timeChallenge || {
            enabled: false,
            initialTime: 60,
            timeBonus: 5,
            timePenalty: 3,
            repeatWrongQuestions: true
        },
        updatedAt: new Date().toISOString()
    };
    
    return saveQuizzes(quizzes);
}

/**
 * Ein Quiz löschen
 * @param {string} quizId - Die ID des zu löschenden Quiz
 * @returns {boolean} true bei Erfolg, false bei Fehler
 */
function deleteQuiz(quizId) {
    const quizzes = loadQuizzes();
    const filteredQuizzes = quizzes.filter(quiz => quiz.id !== quizId);
    
    if (filteredQuizzes.length === quizzes.length) {
        console.error('Quiz nicht gefunden:', quizId);
        return false;
    }
    
    return saveQuizzes(filteredQuizzes);
}

/**
 * Eindeutige ID generieren
 * @returns {string} Eine eindeutige ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Quiz-Typ in lesbaren Text umwandeln
 * @param {string} type - Der Quiz-Typ
 * @returns {string} Lesbarer Quiz-Typ
 */
function getQuizTypeLabel(type) {
    const types = {
        'single-choice': 'Single-Choice',
        'multiple-choice': 'Multiple-Choice',
        'true-false': 'Wahr / Falsch',
        'mixed': 'Gemischt'
    };
    return types[type] || type;
}

/**
 * Exportiert ein einzelnes Quiz als kompakte String-Repräsentation.
 * Wir nutzen Base64-kodiertes JSON, damit der String einfach kopierbar ist.
 * @param {Object} quiz
 * @returns {string}
 */
function exportQuizToString(quiz) {
    try {
        const json = JSON.stringify(quiz);
        return btoa(unescape(encodeURIComponent(json)));
    } catch (error) {
        console.error('Fehler beim Erstellen des Export-Strings für Quiz:', error);
        return null;
    }
}

/**
 * Exportiert alle Quizzes als ein einzelner String (Base64 JSON).
 * @returns {string}
 */
function exportAllQuizzesToString() {
    try {
        const quizzes = loadQuizzes();
        const payload = { version: 1, quizzes };
        const json = JSON.stringify(payload);
        return btoa(unescape(encodeURIComponent(json)));
    } catch (error) {
        console.error('Fehler beim Exportieren aller Quizzes:', error);
        return null;
    }
}

/**
 * Versucht, einen importierbaren JSON-String zu parsen.
 * Unterstützt rohe JSON oder Base64-kodiertes JSON.
 * @param {string} str
 * @returns {Object} geparstes Objekt
 */
function parseImportString(str) {
    if (!str || typeof str !== 'string') throw new Error('Keine gültige Eingabe');

    // Trim
    const s = str.trim();

    // Versuche direktes JSON
    try {
        return JSON.parse(s);
    } catch (e) {
        // ignore
    }

    // Versuche Base64 -> JSON
    try {
        const decoded = decodeURIComponent(escape(atob(s)));
        return JSON.parse(decoded);
    } catch (e) {
        throw new Error('Konnte String nicht parsen: ungültiges Format');
    }
}

/**
 * Importiert Quizzes aus einem String (JSON oder Base64(JSON)).
 * Neue Quizzes werden zu den bestehenden hinzugefügt.
 * @param {string} str
 * @returns {Object} { added }
 */
function importQuizzesFromString(str) {
    const parsed = parseImportString(str);

    let newQuizzes = [];
    if (parsed && parsed.quizzes && Array.isArray(parsed.quizzes)) {
        newQuizzes = parsed.quizzes;
    } else if (Array.isArray(parsed)) {
        newQuizzes = parsed;
    } else if (parsed && parsed.id && parsed.title) {
        newQuizzes = [parsed];
    } else {
        throw new Error('Unbekanntes Import-Format');
    }

    // Bestehende Quizzes laden
    const existing = loadQuizzes();

    // Neue Quizzes normalisieren und mit neuen IDs versehen
    const normalized = newQuizzes.map(nq => ({
        id: generateId(), // Immer neue ID generieren
        title: nq.title || 'Untitled',
        type: nq.type || 'single-choice',
        questions: nq.questions || [],
        timeChallenge: nq.timeChallenge || {
            enabled: false,
            initialTime: 60,
            timeBonus: 5,
            timePenalty: 3,
            repeatWrongQuestions: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }));

    // Zu bestehenden hinzufügen
    const combined = [...existing, ...normalized];
    saveQuizzes(combined);
    return { added: normalized.length };
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
