// script.js

// --- 1. Références aux éléments du DOM ---
const appContainer = document.getElementById('app-container');
const addSessionBtn = document.getElementById('addSessionBtn');
const viewSessionsBtn = document.getElementById('viewSessionsBtn');
// filterToggleBtn ne sera plus une référence globale car créé dans la fonction showViewSessionsView

// --- 2. Fonctions d'affichage des vues ---

/**
 * Affiche la vue pour créer (planifier) une nouvelle séance d'entraînement.
 */
function showCreateSessionView() {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    appContainer.innerHTML = `
        <section class="create-session-section content-section">
            <h2>Planifier une nouvelle séance</h2>
            <form id="createSessionForm">
                <div class="form-group">
                    <label for="createSessionDate">Date de la séance :</label>
                    <input type="date" id="createSessionDate" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="createSessionType">Type de séance :</label>
                    <select id="createSessionType" class="form-control" required>
                        <option value="">Sélectionnez un type</option>
                        <option value="Jambes">Jambes</option>
                        <option value="Dos Biceps">Dos Biceps</option>
                        <option value="Dos Triceps">Dos Triceps</option>
                        <option value="Pec Biceps">Pec Biceps</option>
                        <option value="Pec Triceps">Pec Triceps</option>
                        <option value="Epaule Bras">Epaule Bras</option>
                        <option value="Bras">Bras</option>
                    </select>
                </div>

                <div id="plannedExercisesContainer">
                    <p class="no-exercises-message">Ajoutez les exercices que vous prévoyez de faire.</p>
                </div>

                <button type="button" id="addPlannedExerciseBtn" class="btn">Ajouter un exercice planifié</button>
                <button type="submit" class="btn">Générer la séance</button>
            </form>
        </section>
    `;

    const createSessionForm = document.getElementById('createSessionForm');
    const addPlannedExerciseBtn = document.getElementById('addPlannedExerciseBtn');

    // Initialiser la date à aujourd'hui par défaut
    document.getElementById('createSessionDate').valueAsDate = new Date();

    addPlannedExerciseBtn.addEventListener('click', addPlannedExerciseToForm);
    createSessionForm.addEventListener('submit', handleCreateSessionSubmit);
}

/**
 * Affiche la vue "Séance du jour" où l'utilisateur complète les performances.
 * Si une séance planifiée existe pour aujourd'hui, elle est chargée.
 */
function showTodaySessionView() {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const sessions = loadSessions();
    // Cherche une séance planifiée pour aujourd'hui qui n'est pas encore complétée
    const todayPlannedSession = sessions.find(s => s.date === today && s.status === 'planned');

    if (todayPlannedSession) {
        appContainer.innerHTML = `
            <section class="today-session-section content-section">
                <h2>Séance du jour : ${todayPlannedSession.type} - ${new Date(todayPlannedSession.date).toLocaleDateString('fr-FR')}</h2>
                <form id="completeSessionForm">
                    <input type="hidden" id="sessionId" value="${todayPlannedSession.id}">
                    <div id="completedExercisesContainer">
                        ${formatPlannedExercisesForCompletion(todayPlannedSession.exercises)}
                    </div>
                    <button type="submit" class="btn">Terminer et Enregistrer la séance</button>
                </form>
                <button type="button" id="cancelSessionBtn" class="btn btn-danger">Annuler la séance (ne pas enregistrer)</button>
            </section>
        `;
        // Attacher les écouteurs d'événements pour les boutons d'ajout/suppression de série après l'injection
        document.querySelectorAll('.exercise-block .add-series-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const seriesContainer = event.target.closest('.exercise-block').querySelector('.series-container');
                addSeriesToExercise(seriesContainer);
            });
        });
        document.querySelectorAll('.exercise-block .remove-series-btn').forEach(btn => {
            btn.addEventListener('click', (event) => event.target.closest('.series-row').remove());
        });
        document.getElementById('completeSessionForm').addEventListener('submit', handleCompleteSessionSubmit);
        document.getElementById('cancelSessionBtn').addEventListener('click', () => {
            if (confirm("Êtes-vous sûr de vouloir annuler cette séance ? Toutes les données saisies seront perdues.")) {
                deleteSession(todayPlannedSession.id); // Supprime la séance planifiée
                showTodaySessionView(); // Revient à la vue "pas de séance"
            }
        });

    } else {
        appContainer.innerHTML = `
            <section class="today-session-section content-section">
                <h2>Séance du jour</h2>
                <p class="no-sessions-message">Pas de séance planifiée pour aujourd'hui.</p>
                <p class="no-sessions-message">Cliquez sur "Nouvelle Séance" pour en créer une.</p>
                <p class="no-sessions-message">Ou <button id="quickViewAllSessionsBtn" class="btn small-btn">consultez toutes vos séances</button>.</p>
            </section>
        `;
        document.getElementById('quickViewAllSessionsBtn').addEventListener('click', showViewSessionsView);
    }
}


/**
 * Affiche la vue pour consulter toutes les séances enregistrées (planifiées ou complétées).
 */
function showViewSessionsView() {
    // Masquer l'ancien bouton de filtre du header s'il existe
    const oldFilterToggleBtn = document.getElementById('filterToggleBtn');
    if (oldFilterToggleBtn) oldFilterToggleBtn.style.display = 'none';

    const sessions = loadSessions();
    // Trie par date décroissante, puis par statut (planned avant completed pour les mêmes dates)
    sessions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateB - dateA; // Trie par date
        }
        // Si même date, met les planifiées avant les complétées
        if (a.status === 'planned' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'planned') return 1;
        return 0; // Pas de changement d'ordre si même statut
    });

    if (sessions.length === 0) {
        appContainer.innerHTML = `
            <section class="view-sessions-section content-section">
                <h2>Mes Séances</h2>
                <p class="no-sessions-message">Vous n'avez pas encore enregistré de séances. Cliquez sur "Nouvelle Séance" pour commencer !</p>
            </section>
        `;
        return;
    }

    let sessionsHtml = `
        <section class="view-sessions-section content-section">
            <h2>Mes Séances</h2>
            <button id="filterToggleBtn" class="btn">Afficher les Filtres</button> <div id="filterControls" class="filter-controls hidden">
                <label for="filterDate">Filtrer par date :</label>
                <input type="date" id="filterDate" class="form-control">
                <label for="filterType">Filtrer par type :</label>
                <input type="text" id="filterType" class="form-control" placeholder="Ex: Jambes">
                <label for="filterStatus">Statut :</label>
                <select id="filterStatus" class="form-control">
                    <option value="">Tous</option>
                    <option value="planned">Planifiée</option>
                    <option value="completed">Complétée</option>
                </select>
                <button id="resetFiltersBtn" class="btn">Réinitialiser filtres</button>
            </div>
            <div id="sessionsListContainer">
                </div>
        </section>
    `;
    appContainer.innerHTML = sessionsHtml;

    // Références DOM après injection
    const sessionsListContainer = document.getElementById('sessionsListContainer');
    const filterControlsDiv = document.getElementById('filterControls');
    const filterToggleBtn = document.getElementById('filterToggleBtn'); // Référence au nouveau bouton
    const filterDateInput = document.getElementById('filterDate');
    const filterTypeInput = document.getElementById('filterType');
    const filterStatusSelect = document.getElementById('filterStatus');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    // Écouteur pour le bouton de bascule des filtres
    filterToggleBtn.onclick = () => {
        filterControlsDiv.classList.toggle('hidden');
        filterToggleBtn.classList.toggle('active');
        filterToggleBtn.textContent = filterControlsDiv.classList.contains('hidden') ? 'Afficher les Filtres' : 'Masquer les Filtres';
    };


    // Fonction pour rendre les séances (sera appelée au chargement et lors des filtres)
    const renderSessions = () => {
        let filteredSessions = [...sessions]; // Copie pour ne pas modifier l'original

        const filterDate = filterDateInput.value;
        const filterType = filterTypeInput.value.toLowerCase().trim();
        const filterStatus = filterStatusSelect.value;

        if (filterDate) {
            filteredSessions = filteredSessions.filter(session => session.date === filterDate);
        }
        if (filterType) {
            filteredSessions = filteredSessions.filter(session => session.type.toLowerCase().includes(filterType));
        }
        if (filterStatus) {
            filteredSessions = filteredSessions.filter(session => session.status === filterStatus);
        }

        if (filteredSessions.length === 0) {
            sessionsListContainer.innerHTML = `<p class="no-results-message">Aucune séance trouvée avec les filtres actuels.</p>`;
            return;
        }

        let listHtml = '';
        filteredSessions.forEach((session) => {
            const statusClass = session.status === 'completed' ? 'session-completed' : 'session-planned';
            const statusText = session.status === 'completed' ? 'Complétée' : 'Planifiée';
            // Utilisation d'un data attribute pour le statut pour faciliter la logique de clic
            const clickAction = session.status === 'planned' ? 'start' : 'view';

            listHtml += `
                <div class="session-card ${statusClass}" data-session-id="${session.id}" data-click-action="${clickAction}">
                    <div class="session-card-header">
                        <div class="session-card-content">
                            <h3>${session.type} - ${new Date(session.date).toLocaleDateString('fr-FR')} <span class="session-status">(${statusText})</span></h3>
                            <p class="session-card-description">
                                ${session.exercises.length} exercices
                                ${session.status === 'planned' ? ' - Cliquez pour commencer !' : ''}
                            </p>
                        </div>
                        <button class="delete-session-btn" data-session-id="${session.id}" title="Supprimer la séance">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                    </div>
            `;
        });
        sessionsListContainer.innerHTML = listHtml;

        // Gérer le clic sur la carte entière
        document.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', (event) => {
                // S'assurer que le clic n'est pas sur le bouton de suppression
                if (event.target.closest('.delete-session-btn')) {
                    return;
                }

                const sessionId = card.dataset.sessionId;
                const clickAction = card.dataset.clickAction;
                const session = sessions.find(s => s.id === sessionId);

                if (session) {
                    if (clickAction === 'start') {
                        displaySessionForCompletion(session);
                    } else if (clickAction === 'view') {
                        // Affiche la nouvelle vue détaillée pour les séances complétées
                        displayCompletedSessionDetails(session);
                    }
                }
            });
        });

        document.querySelectorAll('.delete-session-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const sessionId = event.target.closest('.delete-session-btn').dataset.sessionId;
                if (confirm(`Êtes-vous sûr de vouloir supprimer cette séance ?`)) {
                    deleteSession(sessionId);
                    showViewSessionsView(); // Rafraîchit la vue
                }
            });
        });
    };

    // Écouteurs pour les filtres
    filterDateInput.addEventListener('change', renderSessions);
    filterTypeInput.addEventListener('input', renderSessions);
    filterStatusSelect.addEventListener('change', renderSessions);
    resetFiltersBtn.addEventListener('click', () => {
        filterDateInput.value = '';
        filterTypeInput.value = '';
        filterStatusSelect.value = '';
        renderSessions();
    });

    renderSessions(); // Affiche les séances au premier chargement
}

/**
 * Affiche une séance spécifique pour la complétion (appelée depuis "Mes Séances" ou "Séance du Jour").
 * @param {Object} sessionToComplete - L'objet de la séance à compléter.
 */
function displaySessionForCompletion(sessionToComplete) {
    // Masquer le bouton de filtre si jamais il était visible
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) filterToggleBtn.style.display = 'none';

    appContainer.innerHTML = `
        <section class="today-session-section content-section">
            <h2>Compléter la séance : ${sessionToComplete.type} - ${new Date(sessionToComplete.date).toLocaleDateString('fr-FR')}</h2>
            <form id="completeSessionForm">
                <input type="hidden" id="sessionId" value="${sessionToComplete.id}">
                <div id="completedExercisesContainer">
                    ${formatPlannedExercisesForCompletion(sessionToComplete.exercises)}
                </div>
                <button type="submit" class="btn">Terminer et Enregistrer la séance</button>
            </form>
            <button type="button" id="cancelSessionBtn" class="btn btn-danger">Annuler la complétion / Retour</button>
        </section>
    `;

    // Attacher les écouteurs d'événements pour les boutons d'ajout/suppression de série après l'injection
    document.querySelectorAll('.exercise-block .add-series-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const seriesContainer = event.target.closest('.exercise-block').querySelector('.series-container');
            addSeriesToExercise(seriesContainer);
        });
    });
    document.querySelectorAll('.exercise-block .remove-series-btn').forEach(btn => {
        btn.addEventListener('click', (event) => event.target.closest('.series-row').remove());
    });
    document.getElementById('completeSessionForm').addEventListener('submit', handleCompleteSessionSubmit);
    // Le bouton d'annulation renvoie vers la vue "Mes Séances"
    document.getElementById('cancelSessionBtn').addEventListener('click', showViewSessionsView);
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
}


// --- 3. Gestion de l'ajout d'exercices planifiés (pour la création de séance) ---

let plannedExerciseCounter = 0;

/**
 * Ajoute un nouveau bloc d'exercice planifié au formulaire de création de séance.
 */
function addPlannedExerciseToForm() {
    plannedExerciseCounter++;
    const plannedExerciseId = `planned-exercise-${plannedExerciseCounter}`;
    const plannedExercisesContainer = document.getElementById('plannedExercisesContainer');

    const exerciseDiv = document.createElement('div');
    exerciseDiv.classList.add('exercise-block'); // Réutilise la classe de style
    exerciseDiv.id = plannedExerciseId;
    exerciseDiv.innerHTML = `
        <h3>
            <input type="text" class="exercise-name" placeholder="Nom de l'exercice (Ex: Leg curl assis)" required>
            <button type="button" class="btn-danger remove-exercise-btn">X</button>
        </h3>
        <div class="form-group">
            <label for="series-planned-${plannedExerciseCounter}">Nombre de séries prévues :</label>
            <input type="number" id="series-planned-${plannedExerciseCounter}" class="series-planned" value="3" min="1" required>
        </div>
    `;
    plannedExercisesContainer.appendChild(exerciseDiv);

    const noExercisesMessage = plannedExercisesContainer.querySelector('.no-exercises-message');
    if (noExercisesMessage) {
        noExercisesMessage.remove();
    }

    exerciseDiv.querySelector('.remove-exercise-btn').addEventListener('click', () => exerciseDiv.remove());
}


// --- 4. Gestion de la soumission du formulaire de CRÉATION de séance ---

/**
 * Gère la soumission du formulaire de création de séance (planification).
 * @param {Event} event - L'événement de soumission du formulaire.
 */
function handleCreateSessionSubmit(event) {
    event.preventDefault();

    const sessionDate = document.getElementById('createSessionDate').value;
    const sessionType = document.getElementById('createSessionType').value.trim();

    if (!sessionDate || !sessionType) {
        alert("Veuillez remplir la date et le type de séance.");
        return;
    }

    const plannedExercises = [];
    document.querySelectorAll('#plannedExercisesContainer .exercise-block').forEach(exerciseBlock => {
        const exerciseName = exerciseBlock.querySelector('.exercise-name').value.trim();
        const plannedSeries = parseInt(exerciseBlock.querySelector('.series-planned').value);

        if (!exerciseName || isNaN(plannedSeries) || plannedSeries < 1) {
            alert("Veuillez vérifier le nom de l'exercice et le nombre de séries prévues.");
            return;
        }

        // Crée des séries "vides" pour la planification
        const series = Array.from({ length: plannedSeries }, () => ({ reps: null, weight: null, rest: null }));

        plannedExercises.push({ name: exerciseName, series });
    });

    if (plannedExercises.length === 0) {
        alert("Veuillez ajouter au moins un exercice planifié à votre séance.");
        return;
    }

    // Vérifier s'il existe déjà une séance planifiée pour cette date
    const existingSessions = loadSessions();
    const existingPlannedSession = existingSessions.find(s => s.date === sessionDate && s.status === 'planned');

    if (existingPlannedSession) {
        if (!confirm(`Une séance planifiée existe déjà pour le ${new Date(sessionDate).toLocaleDateString('fr-FR')}. Voulez-vous la remplacer ?`)) {
            return;
        }
        // Supprimer l'ancienne séance planifiée pour la remplacer
        deleteSession(existingPlannedSession.id);
    }

    const newSession = {
        id: 'sess_' + Date.now(), // ID unique pour chaque séance
        date: sessionDate,
        type: sessionType,
        exercises: plannedExercises,
        status: 'planned' // Nouveau statut: 'planned' ou 'completed'
    };

    saveSession(newSession);
    alert("Séance planifiée et générée avec succès !");
    showViewSessionsView(); // Redirige vers la vue "Mes Séances" après la planification
}


// --- 5. Gestion de la soumission du formulaire de COMPLETION de séance (à la salle) ---

/**
 * Gère la soumission du formulaire de complétion de séance.
 * Collecte les données réelles et met à jour la séance dans le LocalStorage.
 * @param {Event} event - L'événement de soumission du formulaire.
 */
function handleCompleteSessionSubmit(event) {
    event.preventDefault();

    const sessionId = document.getElementById('sessionId').value;
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) {
        alert("Erreur: Séance non trouvée pour la complétion.");
        return;
    }

    const completedExercises = [];
    let isValid = true; // Flag pour valider toutes les saisies

    document.querySelectorAll('#completedExercisesContainer .exercise-block').forEach(exerciseBlock => {
        const exerciseName = exerciseBlock.querySelector('.exercise-name-display').textContent.trim();
        if (!exerciseName) {
            isValid = false;
            return;
        }

        const series = [];
        exerciseBlock.querySelectorAll('.series-row').forEach(seriesRow => {
            const repsInput = seriesRow.querySelector('.series-reps');
            const weightInput = seriesRow.querySelector('.series-weight');
            const restInput = seriesRow.querySelector('.series-rest');

            const reps = repsInput ? parseInt(repsInput.value) : null;
            const weight = weightInput ? parseFloat(weightInput.value) : null;
            const rest = restInput ? (parseInt(restInput.value) || null) : null;

            // Validation des champs obligatoires
            if (isNaN(reps) || isNaN(weight) || reps === null || weight === null || repsInput.value === "" || weightInput.value === "") {
                isValid = false;
                return;
            }

            series.push({ reps, weight, rest });
        });

        if (series.length === 0 && isValid) {
            alert(`L'exercice "${exerciseName}" doit avoir au moins une série complétée.`);
            isValid = false;
            return;
        }
        if (isValid) {
            completedExercises.push({ name: exerciseName, series });
        }
    });

    if (!isValid) {
        alert("Veuillez renseigner les répétitions et le poids pour toutes les séries complétées.");
        return;
    }

    if (completedExercises.length === 0) {
        alert("Veuillez compléter au moins un exercice pour enregistrer la séance.");
        return;
    }

    // Mettre à jour la séance existante
    sessions[sessionIndex].exercises = completedExercises;
    sessions[sessionIndex].status = 'completed'; // Marquer comme complétée

    localStorage.setItem('gymSessions', JSON.stringify(sessions));
    alert("Séance complétée et enregistrée avec succès !");
    showViewSessionsView(); // Redirige vers la vue des séances complétées
}


// --- 6. Fonctions utilitaires et de rendu ---

/**
 * Formate les exercices planifiés pour l'affichage dans la vue de complétion.
 * @param {Array} exercises - Tableau d'exercices planifiés.
 * @returns {string} Le HTML formaté des détails.
 */
function formatPlannedExercisesForCompletion(exercises) {
    let html = '';
    exercises.forEach(exercise => {
        html += `
            <div class="exercise-block">
                <h3><span class="exercise-name-display">${exercise.name}</span></h3>
                <div class="series-container">
        `;
        // Créer les champs pour le nombre de séries prévues
        // Remplir les champs avec les données existantes si la séance a déjà été partiellement complétée
        exercise.series.forEach((seriesData, index) => {
            html += `
                    <div class="series-row">
                        <span class="series-label">Série ${index + 1}:</span>
                        <input type="number" class="series-reps" placeholder="Répétitions" min="1" value="${seriesData.reps !== null ? seriesData.reps : ''}" required>
                        <input type="number" class="series-weight" placeholder="Poids (kg)" step="0.5" value="${seriesData.weight !== null ? seriesData.weight : ''}" required>
                        <input type="number" class="series-rest" placeholder="Repos (s) (optionnel)" value="${seriesData.rest !== null ? seriesData.rest : ''}">
                        <button type="button" class="btn-danger remove-series-btn">Suppr.</button>
                    </div>
            `;
        });
        html += `
                </div>
                <button type="button" class="btn add-series-btn">Ajouter une série</button>
            </div>
        `;
    });
    return html;
}

/**
 * Ajoute une nouvelle ligne de série à un conteneur d'exercice donné (utilisé pour la complétion).
 * @param {HTMLElement} seriesContainer - Le conteneur DOM où ajouter la série.
 */
function addSeriesToExercise(seriesContainer) {
    const currentSeriesCount = seriesContainer.querySelectorAll('.series-row').length;
    const seriesDiv = document.createElement('div');
    seriesDiv.classList.add('series-row');
    seriesDiv.innerHTML = `
        <span class="series-label">Série ${currentSeriesCount + 1}:</span>
        <input type="number" class="series-reps" placeholder="Répétitions" min="1" required>
        <input type="number" class="series-weight" placeholder="Poids (kg)" step="0.5" required>
        <input type="number" class="series-rest" placeholder="Repos (s) (optionnel)">
        <button type="button" class="btn-danger remove-series-btn">Suppr.</button>
    `;
    seriesContainer.appendChild(seriesDiv);

    seriesDiv.querySelector('.remove-series-btn').addEventListener('click', () => seriesDiv.remove());
}


/**
 * Formate les détails d'une séance pour l'affichage (vue "Mes Séances").
 * @param {Object} session - L'objet session à formater.
 * @returns {string} Le HTML formaté des détails.
 */
function formatSessionDetails(session) {
    let detailsHtml = '';
    if (session.exercises.length === 0) {
        return `<p>Aucun exercice enregistré pour cette séance.</p>`;
    }
    session.exercises.forEach(exercise => {
        detailsHtml += `
            <div class="exercise-display">
                <h4>${exercise.name}</h4>
                <ul>
        `;
        if (exercise.series && exercise.series.length > 0) {
            exercise.series.forEach((series, sIndex) => {
                const repsDisplay = series.reps !== null ? `${series.reps} reps` : 'N/A reps';
                const weightDisplay = series.weight !== null ? `${series.weight} kg` : 'N/A kg';
                const restDisplay = series.rest !== null && series.rest !== '' ? ` (Repos: ${series.rest}s)` : '';

                detailsHtml += `
                        <li>Série ${sIndex + 1}: ${repsDisplay} @ ${weightDisplay}${restDisplay}</li>
                `;
            });
        } else {
            detailsHtml += `<li>Pas de séries enregistrées pour cet exercice.</li>`;
        }
        detailsHtml += `
                </ul>
            </div>
        `;
    });
    return detailsHtml;
}


// --- 7. Fonctions de gestion du LocalStorage ---
// Note: Les IDs de session sont maintenant utilisés pour identifier et supprimer précisément.

/**
 * Charge toutes les séances depuis le LocalStorage.
 * @returns {Array} Un tableau de toutes les séances.
 */
function loadSessions() {
    const sessions = localStorage.getItem('gymSessions');
    return sessions ? JSON.parse(sessions) : [];
}

/**
 * Sauvegarde une nouvelle séance ou met à jour une séance existante dans le LocalStorage.
 * @param {Object} session - L'objet de la séance à sauvegarder/mettre à jour.
 */
function saveSession(session) {
    let sessions = loadSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex > -1) {
        sessions[existingIndex] = session; // Met à jour la séance existante
    } else {
        sessions.push(session); // Ajoute une nouvelle séance
    }
    localStorage.setItem('gymSessions', JSON.stringify(sessions));
}

/**
 * Supprime une séance du LocalStorage par son ID.
 * @param {string} sessionId - L'ID de la séance à supprimer.
 */
function deleteSession(sessionId) {
    let sessions = loadSessions();
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    localStorage.setItem('gymSessions', JSON.stringify(updatedSessions));
}


// --- 8. Initialisation et Écouteurs d'événements globaux ---

document.addEventListener('DOMContentLoaded', () => {
    addSessionBtn.addEventListener('click', showCreateSessionView); // Bouton "Nouvelle Séance" -> Créer une séance
    viewSessionsBtn.addEventListener('click', showViewSessionsView); // Bouton "Mes Séances" -> Mes Séances

    // Ancienne ligne à supprimer ou commenter :
    // showTodaySessionView(); // Afficher la vue "Séance du jour" par défaut au chargement

    // Nouvelle ligne à ajouter pour afficher "Mes Séances" au démarrage :
    showViewSessionsView(); // Afficher la vue "Mes Séances" par défaut au chargement
});