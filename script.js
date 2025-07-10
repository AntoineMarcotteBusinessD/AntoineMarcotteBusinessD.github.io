// script.js

// --- 1. Gestion du LocalStorage ---
/**
 * Charge les séances depuis le LocalStorage.
 * @returns {Array} Un tableau des séances enregistrées.
 */
function loadSessions() {
    const sessionsJSON = localStorage.getItem('gymSessions');
    return sessionsJSON ? JSON.parse(sessionsJSON) : [];
}

/**
 * Sauvegarde les séances dans le LocalStorage.
 * @param {Array} sessions - Le tableau des séances à sauvegarder.
 */
function saveSessions(sessions) {
    localStorage.setItem('gymSessions', JSON.stringify(sessions));
}

/**
 * Supprime une séance spécifique du LocalStorage par son ID.
 * @param {string} sessionId - L'ID de la séance à supprimer.
 */
function deleteSession(sessionId) {
    let sessions = loadSessions();
    sessions = sessions.filter(session => session.id !== sessionId);
    saveSessions(sessions);
}

// --- 2. Références DOM Globales (seulement le conteneur principal ici) ---
const appContainer = document.getElementById('app-container');

// --- 3. Fonctions de Vue ---

/**
 * Affiche la vue pour créer une nouvelle séance.
 */
function showCreateSessionView() {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    appContainer.innerHTML = `
        <section class="create-session-section content-section">
            <h2>Nouvelle Séance</h2>
            <form id="createSessionForm">
                <div class="form-group">
                    <label for="sessionDate">Date :</label>
                    <input type="date" id="sessionDate" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="sessionType">Type de séance :</label>
                    <select id="sessionType" class="form-control" required>
                        <option value="">Sélectionnez un type</option>
                        <option value="Jambes">Jambes</option>
                        <option value="Dos Biceps">Dos Biceps</option>
                        <option value="Pectoraux Triceps">Pectoraux Triceps</option>
                        <option value="Épaules">Épaules</option>
                        <option value="Cardio">Cardio</option>
                        <option value="Full Body">Full Body</option>
                        <option value="Autre">Autre</option>
                    </select>
                </div>

                <h3>Exercices Planifiés</h3>
                <div id="plannedExercisesContainer">
                    </div>
                <div class="buttons-container create-session-buttons-top">
                    <button type="button" id="addExerciseBtn" class="btn primary-btn large-btn">Ajouter un exercice planifié</button>
                </div>

                <hr class="section-divider"> <div class="buttons-container create-session-buttons-bottom">
                    <button type="submit" class="btn success-btn large-btn">Générer la séance</button>
                    <button type="button" id="cancelCreateSessionBtn" class="btn danger-btn large-btn">Annuler</button>
                </div>
            </form>
        </section>
    `;

    document.getElementById('sessionDate').valueAsDate = new Date(); // Date du jour par défaut

    let exerciseCounter = 0; // Pour générer des IDs uniques pour les exercices
    const addExerciseBtn = document.getElementById('addExerciseBtn');
    const plannedExercisesContainer = document.getElementById('plannedExercisesContainer');
    const createSessionForm = document.getElementById('createSessionForm');
    const cancelCreateSessionBtn = document.getElementById('cancelCreateSessionBtn');

    addExerciseBtn.addEventListener('click', () => {
        exerciseCounter++;
        const exerciseBlock = document.createElement('div');
        exerciseBlock.classList.add('exercise-block');
        exerciseBlock.innerHTML = `
            <div class="exercise-header">
                <input type="text" class="form-control exercise-name" placeholder="Nom de l'exercice" required>
                <button type="button" class="btn btn-danger small-btn remove-exercise-btn">X</button>
            </div>
            <div class="form-group">
                <label for="numSeries-${exerciseCounter}">Nombre de séries planifiées :</label>
                <input type="number" id="numSeries-${exerciseCounter}" class="form-control num-series" value="3" min="1" required>
            </div>
        `;
        plannedExercisesContainer.appendChild(exerciseBlock);

        exerciseBlock.querySelector('.remove-exercise-btn').addEventListener('click', () => {
            plannedExercisesContainer.removeChild(exerciseBlock);
        });
    });

    createSessionForm.addEventListener('submit', handleCreateSessionSubmit);
    cancelCreateSessionBtn.addEventListener('click', showViewSessionsView); // Annuler redirige vers "Mes Séances"

    const addSessionNavBtn = document.getElementById('addSessionBtn');
    activateNavLink(addSessionNavBtn); // Active le bouton "Nouvelle Séance"
}

/**
 * Gère la soumission du formulaire de création de séance.
 */
function handleCreateSessionSubmit(event) {
    event.preventDefault();

    const sessionDate = document.getElementById('sessionDate').value;
    const sessionType = document.getElementById('sessionType').value;
    const exerciseElements = document.querySelectorAll('.exercise-block');

    const exercises = [];
    exerciseElements.forEach(block => {
        const name = block.querySelector('.exercise-name').value.trim();
        const numSeries = parseInt(block.querySelector('.num-series').value);

        if (name && numSeries > 0) {
            const series = Array.from({ length: numSeries }, () => ({
                reps: null, // Initialiser à null pour indiquer non renseigné
                weight: null,
                rest: null
            }));
            exercises.push({ name, series });
        }
    });

    if (exercises.length === 0) {
        alert('Veuillez ajouter au moins un exercice planifié.');
        return;
    }

    let sessions = loadSessions();
    const existingSessionIndex = sessions.findIndex(s => s.date === sessionDate && s.status === 'planned');

    const newSession = {
        id: 'session_' + Date.now(), // ID unique
        date: sessionDate,
        type: sessionType,
        exercises: exercises,
        status: 'planned'
    };

    if (existingSessionIndex !== -1) {
        if (confirm(`Une séance planifiée existe déjà pour le ${new Date(sessionDate).toLocaleDateString('fr-FR')}. Voulez-vous la remplacer ?`)) {
            sessions[existingSessionIndex] = newSession;
        } else {
            return; // L'utilisateur a annulé le remplacement
        }
    } else {
        sessions.push(newSession);
    }

    saveSessions(sessions);
    alert('Séance planifiée avec succès !');
    showViewSessionsView(); // Retourne à la vue des séances après la création
}


/**
 * Affiche la vue "Séance du Jour" (pour compléter une séance planifiée).
 * Cette fonction est maintenant la version générique pour compléter une séance à une date donnée.
 */
function showTodaySessionView(date = new Date().toISOString().split('T')[0]) {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    const sessions = loadSessions();
    const specificSession = sessions.find(session => session.date === date && session.status === 'planned');

    if (specificSession) {
        let exercisesHtml = '';
        specificSession.exercises.forEach((exercise, exerciseIndex) => {
            exercisesHtml += `
                <div class="exercise-block">
                    <div class="exercise-header">
                        <span class="exercise-name-display">${exercise.name}</span>
                    </div>
                    <div class="series-container" id="series-container-${exerciseIndex}">
                        </div>
                    <div class="buttons-container series-action-buttons">
                        <button type="button" class="btn primary-btn small-btn add-series-btn" data-exercise-index="${exerciseIndex}">Ajouter une série</button>
                    </div>
                </div>
            `;
        });

        appContainer.innerHTML = `
            <section class="today-session-section content-section">
                <div class="session-completion-header">
                    <h2>Séance du Jour : ${specificSession.type} - ${new Date(specificSession.date).toLocaleDateString('fr-FR')}</h2>
                    <div class="buttons-container session-completion-buttons-header">
                        <button type="submit" form="completeSessionForm" class="btn success-btn large-btn">Terminer et Enregistrer la séance</button>
                        <button type="button" id="cancelTodaySessionBtn" class="btn danger-btn large-btn">Annuler la séance</button>
                    </div>
                </div>
                
                <form id="completeSessionForm">
                    ${exercisesHtml}
                </form>
            </section>
        `;

        specificSession.exercises.forEach((exercise, exerciseIndex) => {
            const seriesContainer = document.getElementById(`series-container-${exerciseIndex}`);
            // Remplir les séries existantes
            exercise.series.forEach((seriesData, seriesIndex) => {
                addSeriesRow(seriesContainer, exerciseIndex, seriesIndex, seriesData.reps, seriesData.weight, seriesData.rest);
            });
        });

        document.querySelectorAll('.add-series-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const exerciseIndex = event.target.dataset.exerciseIndex;
                const seriesContainer = document.getElementById(`series-container-${exerciseIndex}`);
                addSeriesRow(seriesContainer, exerciseIndex, specificSession.exercises[exerciseIndex].series.length, null, null, null);
                // Ajouter une série vide au modèle de données temporaire pour cohérence
                specificSession.exercises[exerciseIndex].series.push({ reps: null, weight: null, rest: null });
            });
        });

        document.getElementById('completeSessionForm').addEventListener('submit', (event) => {
            event.preventDefault();
            handleCompleteSessionSubmit(specificSession);
        });

        document.getElementById('cancelTodaySessionBtn').addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment annuler cette séance planifiée ? Elle sera supprimée.')) {
                deleteSession(specificSession.id);
                showViewSessionsView(); // Retourne à la liste des séances
            }
        });

    } else {
        appContainer.innerHTML = `
            <section class="today-session-section content-section">
                <h2>Séance du Jour</h2>
                <p class="no-sessions-message">Pas de séance planifiée pour aujourd'hui ou cette date.</p>
                <p class="no-sessions-message">Cliquez sur "Nouvelle Séance" pour en créer une, ou "Mes Séances" pour voir l'historique.</p>
                <div class="buttons-container" style="margin-top: 1.5rem;">
                    <button type="button" class="btn primary-btn large-btn" onclick="showCreateSessionView()">Nouvelle Séance</button>
                    <button type="button" class="btn large-btn" onclick="showViewSessionsView()">Mes Séances</button>
                </div>
            </section>
        `;
    }
}

/**
 * Ajoute une ligne de série à un bloc d'exercice.
 * @param {HTMLElement} container - Le conteneur des séries.
 * @param {number} exerciseIndex - L'index de l'exercice parent.
 * @param {number} seriesIndex - L'index de la série à ajouter.
 * @param {number} [reps=''] - Nombre de répétitions (pré-rempli si existant).
 * @param {number} [weight=''] - Poids (pré-rempli si existant).
 * @param {number} [rest=''] - Temps de repos (pré-rempli si existant).
 */
function addSeriesRow(container, exerciseIndex, seriesIndex, reps = '', weight = '', rest = '') {
    const seriesRow = document.createElement('div');
    seriesRow.classList.add('series-row');
    seriesRow.innerHTML = `
        <span class="series-label">Série ${seriesIndex + 1} :</span>
        <div class="form-group">
            <input type="number" class="form-control series-reps" placeholder="Répétitions" value="${reps}" min="0">
        </div>
        <div class="form-group">
            <input type="number" step="0.5" class="form-control series-weight" placeholder="Poids (kg)" value="${weight}" min="0">
        </div>
        <div class="form-group">
            <input type="number" class="form-control series-rest" placeholder="Repos (s)" value="${rest}" min="0">
        </div>
        <button type="button" class="btn btn-danger small-btn remove-series-btn">X</button>
    `;
    container.appendChild(seriesRow);

    seriesRow.querySelector('.remove-series-btn').addEventListener('click', () => {
        container.removeChild(seriesRow);
    });
}


/**
 * Gère la soumission du formulaire de complétion de séance.
 */
function handleCompleteSessionSubmit(sessionToComplete) {
    const updatedExercises = [];
    let allFieldsValid = true;

    document.querySelectorAll('.exercise-block').forEach((exerciseBlock, exerciseIndex) => {
        const exerciseName = exerciseBlock.querySelector('.exercise-name-display').textContent;
        const seriesData = [];

        exerciseBlock.querySelectorAll('.series-row').forEach((seriesRow, seriesIndex) => {
            const repsInput = seriesRow.querySelector('.series-reps');
            const weightInput = seriesRow.querySelector('.series-weight');
            const restInput = seriesRow.querySelector('.series-rest');

            const reps = repsInput.value.trim() !== '' ? parseInt(repsInput.value) : null;
            const weight = weightInput.value.trim() !== '' ? parseFloat(weightInput.value) : null;
            const rest = restInput.value.trim() !== '' ? parseInt(restInput.value) : null;

            if (reps === null || weight === null || rest === null) {
                allFieldsValid = false;
                // Vous pouvez ajouter un feedback visuel ici, par ex. border-color: red
                repsInput.style.borderColor = reps === null ? 'red' : '';
                weightInput.style.borderColor = weight === null ? 'red' : '';
                restInput.style.borderColor = rest === null ? 'red' : '';
            } else {
                repsInput.style.borderColor = '';
                weightInput.style.borderColor = '';
                restInput.style.borderColor = '';
            }

            seriesData.push({ reps, weight, rest });
        });
        updatedExercises.push({ name: exerciseName, series: seriesData });
    });

    if (!allFieldsValid) {
        alert('Veuillez remplir toutes les informations (répétitions, poids, repos) pour chaque série.');
        return;
    }

    // Mettre à jour la séance dans le tableau des séances
    let sessions = loadSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionToComplete.id);
    if (sessionIndex !== -1) {
        sessions[sessionIndex].exercises = updatedExercises;
        sessions[sessionIndex].status = 'completed'; // Marquer comme complétée
        saveSessions(sessions);
        alert('Séance enregistrée avec succès !');
        showViewSessionsView(); // Retourne à la vue des séances
    }
}


/**
 * Affiche la vue "Mes Séances" avec la liste des séances.
 * Gère également l'affichage et le masquage des filtres.
 */
function showViewSessionsView() {
    // Note : filterToggleBtn n'est pas censé exister avant cette vue, donc pas besoin de le chercher globalement ici.

    appContainer.innerHTML = `
        <section class="view-sessions-section content-section">
            <button type="button" id="filterToggleBtn" class="btn small-btn">Afficher les Filtres</button>
            <div id="filterControls" class="filter-controls hidden">
                <div class="form-group">
                    <label for="filterDate">Date :</label>
                    <input type="date" id="filterDate" class="form-control">
                </div>
                <div class="form-group">
                    <label for="filterType">Type de séance :</label>
                    <input type="text" id="filterType" class="form-control" placeholder="Ex: Jambes">
                </div>
                <div class="form-group">
                    <label for="filterStatus">Statut :</label>
                    <select id="filterStatus" class="form-control">
                        <option value="all">Tous</option>
                        <option value="completed">Complétée</option>
                        <option value="planned">Planifiée</option>
                    </select>
                </div>
                <button type="button" id="resetFiltersBtn" class="btn small-btn">Réinitialiser filtres</button>
            </div>
            <div id="sessionsList" class="sessions-list">
                </div>
        </section>
    `;

    // Récupérer les éléments APRÈS qu'ils aient été ajoutés au DOM
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterControls = document.getElementById('filterControls');
    const filterDateInput = document.getElementById('filterDate');
    const filterTypeInput = document.getElementById('filterType');
    const filterStatusSelect = document.getElementById('filterStatus');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    // Ajouter les écouteurs d'événements pour les filtres
    if (filterToggleBtn && filterControls) { // Vérification supplémentaire, par sécurité
        filterToggleBtn.addEventListener('click', () => {
            filterControls.classList.toggle('hidden');
            // 'active' était une classe d'exemple, j'ai enlevé la ligne qui l'ajoutait
            filterToggleBtn.textContent = filterControls.classList.contains('hidden') ? 'Afficher les Filtres' : 'Masquer les Filtres';
        });
    }

    if (filterDateInput) filterDateInput.addEventListener('change', displaySessions);
    if (filterTypeInput) filterTypeInput.addEventListener('input', displaySessions);
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', displaySessions);
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            filterDateInput.value = '';
            filterTypeInput.value = '';
            filterStatusSelect.value = 'all';
            displaySessions(); // Réafficher avec les filtres réinitialisés
        });
    }

    displaySessions(); // Afficher toutes les séances au chargement de cette vue

    const viewSessionsNavBtn = document.getElementById('viewSessionsBtn');
    activateNavLink(viewSessionsNavBtn); // Active le bouton "Mes Séances"
}

/**
 * Affiche la liste des séances filtrées et triées.
 */
function displaySessions() {
    const sessionsList = document.getElementById('sessionsList');
    let sessions = loadSessions();

    const filterDate = document.getElementById('filterDate')?.value;
    const filterType = document.getElementById('filterType')?.value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus')?.value;

    let filteredSessions = sessions.filter(session => {
        const matchesDate = !filterDate || session.date === filterDate;
        const matchesType = !filterType || session.type.toLowerCase().includes(filterType);
        const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
        return matchesDate && matchesType && matchesStatus;
    });

    // Trier les séances: d'abord par date (plus récent en premier), puis par statut (planifiée avant complétée)
    filteredSessions.sort((a, b) => {
        // Tri par date décroissante
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) {
            return dateComparison;
        }
        // Pour la même date, les planifiées viennent avant les complétées
        if (a.status === 'planned' && b.status === 'completed') {
            return -1;
        }
        if (a.status === 'completed' && b.status === 'planned') {
            return 1;
        }
        return 0;
    });


    if (filteredSessions.length === 0) {
        sessionsList.innerHTML = '<p class="no-results-message">Aucune séance trouvée avec les filtres actuels.</p>';
        return;
    }

    sessionsList.innerHTML = filteredSessions.map(session => {
        const sessionDate = new Date(session.date).toLocaleDateString('fr-FR');
        const sessionClass = session.status === 'completed' ? 'session-completed' : 'session-planned';
        const statusText = session.status === 'completed' ? 'Complétée' : 'Planifiée';
        const numExercises = session.exercises ? session.exercises.length : 0;
        const descriptionText = numExercises > 0 ? `${numExercises} exercice(s)` : 'Aucun exercice';

        return `
            <div class="session-card ${sessionClass}" data-session-id="${session.id}" data-session-status="${session.status}">
                <div class="session-card-header">
                    <div class="session-card-content">
                        <h3>
                            ${session.type} - ${sessionDate} 
                            <span class="session-status">${statusText}</span>
                        </h3>
                        <p class="session-card-description">${descriptionText}</p>
                    </div>
                    <button type="button" class="delete-session-btn" data-session-id="${session.id}">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Ajouter les écouteurs pour les cartes cliquables et les boutons de suppression
    document.querySelectorAll('.session-card').forEach(card => {
        card.addEventListener('click', (event) => {
            // Vérifier si le clic n'est PAS sur le bouton de suppression
            if (!event.target.closest('.delete-session-btn')) {
                const sessionId = card.dataset.sessionId;
                const sessionStatus = card.dataset.sessionStatus;
                if (sessionStatus === 'completed') {
                    const sessionToView = loadSessions().find(s => s.id === sessionId);
                    if (sessionToView) {
                        displayCompletedSessionDetails(sessionToView);
                    }
                } else if (sessionStatus === 'planned') {
                     // Si c'est une séance planifiée, rediriger vers la séance du jour pour la compléter
                    const sessionToComplete = loadSessions().find(s => s.id === sessionId);
                    if (sessionToComplete) {
                        showTodaySessionView(sessionToComplete.date); // Utilise la fonction générique
                    }
                }
            }
        });
    });

    document.querySelectorAll('.delete-session-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Empêche le clic sur la carte parente
            const sessionId = event.currentTarget.dataset.sessionId;
            const session = loadSessions().find(s => s.id === sessionId);
            if (session && confirm(`Êtes-vous sûr de vouloir supprimer cette séance (${session.type} du ${new Date(session.date).toLocaleDateString('fr-FR')}) ?`)) {
                deleteSession(sessionId);
                displaySessions(); // Rafraîchir la liste après suppression
            }
        });
    });
}

/**
 * Affiche les détails d'une séance complétée dans une vue dédiée.
 * @param {Object} sessionToView - L'objet de la séance complétée à afficher.
 */
function displayCompletedSessionDetails(sessionToView) {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    appContainer.innerHTML = `
        <section class="view-single-session-section content-section">
            <div class="session-detail-actions">
                <button type="button" id="backToSessionsBtn" class="btn btn-icon-left">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Retour
                </button>
                <button type="button" id="deleteSingleSessionBtn" class="btn btn-danger btn-icon-right">
                    Supprimer
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            <h2>Détails de la séance : ${sessionToView.type} - ${new Date(sessionToView.date).toLocaleDateString('fr-FR')}</h2>
            <div class="session-details-content">
                ${formatSessionDetails(sessionToView)}
            </div>
        </section>
    `;

    document.getElementById('backToSessionsBtn').addEventListener('click', showViewSessionsView);
    document.getElementById('deleteSingleSessionBtn').addEventListener('click', () => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer cette séance (${sessionToView.type} du ${new Date(sessionToView.date).toLocaleDateString('fr-FR')}) ?`)) {
            deleteSession(sessionToView.id);
            showViewSessionsView(); // Revenir à la liste après suppression
        }
    });

    // Désactive les liens de navigation quand on est dans les détails d'une séance
    activateNavLink(null);
}

/**
 * Formate les détails d'une séance pour l'affichage.
 * @param {Object} session - La séance à formater.
 * @returns {string} Le HTML formaté des détails.
 */
function formatSessionDetails(session) {
    if (!session || !session.exercises || session.exercises.length === 0) {
        return '<p>Aucun détail d\'exercice disponible pour cette séance.</p>';
    }

    let detailsHtml = '';
    session.exercises.forEach(exercise => {
        detailsHtml += `
            <div class="exercise-display">
                <h4>${exercise.name}</h4>
                <ul>
        `;
        if (exercise.series && exercise.series.length > 0) {
            exercise.series.forEach((series, index) => {
                const reps = series.reps !== null ? `${series.reps} reps` : 'N/A';
                const weight = series.weight !== null ? `${series.weight} kg` : 'N/A';
                const rest = series.rest !== null ? `${series.rest}s repos` : 'N/A';
                detailsHtml += `<li>Série ${index + 1} : ${reps} @ ${weight} (${rest})</li>`;
            });
        } else {
            detailsHtml += '<li>Pas de séries enregistrées pour cet exercice.</li>';
        }
        detailsHtml += `
                </ul>
            </div>
        `;
    });
    return detailsHtml;
}

/**
 * Active le style du bouton de navigation donné et désactive les autres.
 * @param {HTMLElement} activeBtn - Le bouton de navigation à activer.
 */
function activateNavLink(activeBtn) {
    const allNavBtns = document.querySelectorAll('.main-header .nav-btn');
    allNavBtns.forEach(btn => {
        btn.classList.remove('active-nav-btn');
    });
    if (activeBtn) {
        activeBtn.classList.add('active-nav-btn');
    }
}

// --- 8. Initialisation et Écouteurs d'événements globaux ---

document.addEventListener('DOMContentLoaded', () => {
    // Déplacez la sélection des boutons ICI pour être sûr qu'ils existent
    const addSessionBtn = document.getElementById('addSessionBtn');
    const viewSessionsBtn = document.getElementById('viewSessionsBtn');

    // Vérifiez si les éléments existent avant d'attacher les écouteurs
    if (addSessionBtn) {
        addSessionBtn.addEventListener('click', showCreateSessionView);
    } else {
        console.error("Erreur : Le bouton 'Nouvelle Séance' (ID: addSessionBtn) n'a pas été trouvé dans le DOM.");
    }

    if (viewSessionsBtn) {
        viewSessionsBtn.addEventListener('click', showViewSessionsView);
    } else {
        console.error("Erreur : Le bouton 'Mes Séances' (ID: viewSessionsBtn) n'a pas été trouvé dans le DOM.");
    }

    // Afficher la vue "Mes Séances" par défaut au chargement :
    showViewSessionsView(); 
});