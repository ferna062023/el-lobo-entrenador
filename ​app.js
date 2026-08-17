// EL LOBO ENTRENADOR - BASE DE DATOS Y LÓGICA DE NAVEGACIÓN

const EXERCISES_DB = [
    {
        id: "ex1",
        name: "Sentadilla libre con apoyo opcional",
        category: "Fuerza",
        instructions: "Pies al ancho de hombros. Flexiona rodillas bajando la cadera con control.",
        form: "Espalda recta, talones bien apoyados en el suelo. Mira al frente.",
        variant: "Sentadilla con apoyo de manos en silla o mesa."
    },
    {
        id: "ex2",
        name: "Flexiones de pecho modificadas",
        category: "Fuerza",
        instructions: "Apoya las rodillas en el piso. Baja el pecho de forma controlada.",
        form: "Alinea cadera y tronco. Evita colgar la zona lumbar.",
        variant: "Flexiones de pie apoyando manos contra la pared."
    },
    {
        id: "ex3",
        name: "Elevación de rodillas / Marcha",
        category: "Cardio",
        instructions: "Eleva las rodillas de forma alterna a un ritmo constante.",
        form: "Torso erguido sin inclinarte hacia atrás. Mantén ritmo.",
        variant: "Marcha en el lugar a ritmo suave sin elevación excesiva."
    },
    {
        id: "ex4",
        name: "Puente de glúteo",
        category: "Fuerza / Movilidad",
        instructions: "Acostado boca arriba, eleva la cadera contrayendo los glúteos arriba.",
        form: "Empuja desde los talones. No arquees la espalda en exceso.",
        variant: "Puente corto sin mantener arriba la posición."
    },
    {
        id: "ex5",
        name: "Plancha sobre rodillas",
        category: "Core",
        instructions: "Mantén el cuerpo sostenido sobre antebrazos y rodillas.",
        form: "Abdomen contraído, cabeza alineada con la columna.",
        variant: "Plancha inclinada apoyando antebrazos en una mesa."
    }
];

let state = {
    profile: null,
    progress: {
        currentWeek: 1,
        completedSessions: [],
        weightHistory: [],
        streak: 0,
        lastTrainedDate: null
    }
};

let activeWorkout = null;
let timerInterval = null;
let timerState = {
    exerciseIndex: 0,
    phase: 'PREP',
    timeLeft: 10,
    isPaused: false
};

document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupNavigation();
    setupEventListeners();
    renderApp();
});

function loadState() {
    const saved = localStorage.getItem("lobo_entrenador_state");
    if (saved) {
        state = JSON.parse(saved);
    }
}

function saveState() {
    localStorage.setItem("lobo_entrenador_state", JSON.stringify(state));
}

function renderApp() {
    if (!state.profile) {
        showView("view-setup");
        return;
    }

    document.getElementById("streak-count").innerText = state.progress.streak;
    document.getElementById("stat-streak").innerText = state.progress.streak;
    document.getElementById("stat-sessions").innerText = state.progress.completedSessions.length;
    
    const latestWeight = state.progress.weightHistory.length > 0 
        ? state.progress.weightHistory[state.progress.weightHistory.length - 1].weight + " kg" 
        : state.profile.weight + " kg";
    document.getElementById("stat-weight").innerText = latestWeight;

    renderHome();
    renderProgressView();
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            if (!state.profile && target !== "view-setup") return;
            
            document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
            btn.classList.add("active");
            showView(target);
        });
    });

    document.getElementById("btn-back-home").addEventListener("click", () => showView("view-home"));
}

function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
}

function renderHome() {
    const week = state.progress.currentWeek;
    let phaseText = "Fase 1: Adaptación";
    if (week >= 5 && week <= 8) phaseText = "Fase 2: Incremento de Trabajo";
    if (week >= 9) phaseText = "Fase 3: Intensidad Progresiva";

    document.getElementById("current-phase-tag").innerText = phaseText;
    document.getElementById("home-week-title").innerText = `Semana ${week} de 12`;

    const completedThisWeek = [1,2,3,4].filter(day => 
        state.progress.completedSessions.includes(`W${week}D${day}`)
    ).length;
    
    const progressPercent = Math.round((completedThisWeek / 4) * 100);
    document.getElementById("home-progress-text").innerText = `${progressPercent}%`;

    const daysGrid = document.getElementById("days-grid");
    daysGrid.innerHTML = "";

    const dayTitles = [
        "Día 1: Quema de Grasa & Core",
        "Día 2: Fuerza Funcional Cuerpo Entero",
        "Día 3: Cardio & Acondicionamiento",
        "Día 4: Movilidad & Fuerza Suave"
    ];

    for (let day = 1; day <= 4; day++) {
        const sessionId = `W${week}D${day}`;
        const isCompleted = state.progress.completedSessions.includes(sessionId);

        const card = document.createElement("div");
        card.className = `day-card ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="day-info">
                <h4>${dayTitles[day - 1]}</h4>
                <p>4 Ejercicios • Peso Corporal</p>
            </div>
            <div class="status-check">${isCompleted ? '✓' : '➔'}</div>
        `;

        card.addEventListener("click", () => openWorkout(week, day, dayTitles[day - 1]));
        daysGrid.appendChild(card);
    }
}

function getTimesForWeek(week) {
    if (week <= 4) return { work: 20, rest: 40 };
    if (week <= 8) return { work: 35, rest: 25 };
    return { work: 45, rest: 20 };
}

function openWorkout(week, day, title) {
    const times = getTimesForWeek(week);
    activeWorkout = {
        sessionId: `W${week}D${day}`,
        week: week,
        day: day,
        title: title,
        exercises: EXERCISES_DB.slice(0, 4).map(ex => ({
            ...ex,
            workTime: times.work,
            restTime: times.rest
        }))
    };

    document.getElementById("workout-day-tag").innerText = `Semana ${week} - Día ${day}`;
    document.getElementById("workout-day-title").innerText = title;
    document.getElementById("workout-day-desc").innerText = `Trabajo: ${times.work}s | Descanso: ${times.rest}s`;

    const exList = document.getElementById("exercise-list");
    exList.innerHTML = "";

    activeWorkout.exercises.forEach(ex => {
        const div = document.createElement("div");
        div.className = "exercise-item";
        div.innerHTML = `
            <div class="ex-header">
                <span class="ex-name">${ex.name}</span>
                <span class="ex-badge">${ex.workTime}s trabajo / ${ex.restTime}s descanso</span>
            </div>
            <p class="ex-desc">📋 ${ex.instructions}</p>
            <p class="ex-form">💡 Forma correcta: ${ex.form}</p>
            <div class="variant-box">🌱 Variante sencilla: ${ex.variant}</div>
        `;
        exList.appendChild(div);
    });

    showView("view-workout");
}

function startGuidedWorkout() {
    if (!activeWorkout) return;

    timerState = {
        exerciseIndex: 0,
        phase: 'PREP',
        timeLeft: 10,
        isPaused: false
    };

    showView("view-timer");
    updateTimerDisplay();
    runTimer();
}

function runTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timerState.isPaused) return;

        if (timerState.timeLeft > 0) {
            timerState.timeLeft--;
            updateTimerDisplay();
        } else {
            advanceTimerPhase();
        }
    }, 1000);
}

function advanceTimerPhase() {
    const currentEx = activeWorkout.exercises[timerState.exerciseIndex];

    if (timerState.phase === 'PREP') {
        timerState.phase = 'WORK';
        timerState.timeLeft = currentEx.workTime;
    } else if (timerState.phase === 'WORK') {
        timerState.phase = 'REST';
        timerState.timeLeft = currentEx.restTime;
    } else if (timerState.phase === 'REST') {
        timerState.exerciseIndex++;
        if (timerState.exerciseIndex < activeWorkout.exercises.length) {
            timerState.phase = 'WORK';
            timerState.timeLeft = activeWorkout.exercises[timerState.exerciseIndex].workTime;
        } else {
            finishWorkout();
            return;
        }
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const currentEx = activeWorkout.exercises[timerState.exerciseIndex];
    document.getElementById("timer-exercise-num").innerText = `Ejercicio ${timerState.exerciseIndex + 1} de ${activeWorkout.exercises.length}`;
    document.getElementById("timer-ex-title").innerText = currentEx.name;
    document.getElementById("timer-display").innerText = timerState.timeLeft;

    const badge = document.getElementById("timer-phase-badge");
    const instructions = document.getElementById("timer-instructions");
    document.getElementById("timer-variant-text").innerText = currentEx.variant;

    if (timerState.phase === 'PREP') {
        badge.innerText = "PREPARAR";
        badge.className = "phase-badge phase-prep";
        instructions.innerText = "Prepárate. Posiciona tu cuerpo y respira profundo.";
    } else if (timerState.phase === 'WORK') {
        badge.innerText = "¡EJERCICIO!";
        badge.className = "phase-badge phase-work";
        instructions.innerText = currentEx.instructions;
    } else if (timerState.phase === 'REST') {
        badge.innerText = "DESCANSO";
        badge.className = "phase-badge phase-rest";
        instructions.innerText = "Toma agua y recupérate para el siguiente movimiento.";
    }
}

function finishWorkout() {
    clearInterval(timerInterval);
    
    const id = activeWorkout.sessionId;
    if (!state.progress.completedSessions.includes(id)) {
        state.progress.completedSessions.push(id);
    }

    const today = new Date().toISOString().split('T')[0];
    if (state.progress.lastTrainedDate !== today) {
        state.progress.streak += 1;
        state.progress.lastTrainedDate = today;
    }

    const weekSessions = state.progress.completedSessions.filter(s => s.startsWith(`W${state.progress.currentWeek}`));
    if (weekSessions.length >= 4 && state.progress.currentWeek < 12) {
        state.progress.currentWeek += 1;
        alert("🎉 ¡Increíble! Has completado los 4 días de esta semana. ¡Avanzas a la siguiente!");
    } else {
        alert("🔥 ¡Sesión completada con éxito! Progreso guardado.");
    }

    saveState();
    renderApp();
    showView("view-home");
}

function setupEventListeners() {
    document.getElementById("profile-form").addEventListener("submit", (e) => {
        e.preventDefault();
        state.profile = {
            gender: document.getElementById("gender").value,
            age: parseInt(document.getElementById("age").value),
            height: parseInt(document.getElementById("height").value),
            weight: parseFloat(document.getElementById("weight").value),
            experience: document.getElementById("experience").value
        };
        state.progress.weightHistory.push({
            date: new Date().toLocaleDateString('es-ES'),
            weight: state.profile.weight
        });
        saveState();
        renderApp();
        showView("view-home");
    });

    document.getElementById("btn-start-guided").addEventListener("click", startGuidedWorkout);

    document.getElementById("btn-pause-timer").addEventListener("click", () => {
        timerState.isPaused = !timerState.isPaused;
        document.getElementById("btn-pause-timer").innerText = timerState.isPaused ? "Continuar" : "Pausa";
    });

    document.getElementById("btn-skip-timer").addEventListener("click", advanceTimerPhase);

    document.getElementById("btn-cancel-timer").addEventListener("click", () => {
        if (confirm("¿Deseas salir del entrenamiento actual?")) {
            clearInterval(timerInterval);
            showView("view-workout");
        }
    });

    document.getElementById("btn-add-weight").addEventListener("click", () => {
        const input = document.getElementById("new-weight-input");
        const val = parseFloat(input.value);
        if (val > 0) {
            state.progress.weightHistory.push({
                date: new Date().toLocaleDateString('es-ES'),
                weight: val
            });
            input.value = "";
            saveState();
            renderApp();
        }
    });

    document.getElementById("btn-reset-data").addEventListener("click", () => {
        if (confirm("¿Estás seguro de reiniciar todo tu progreso? Esta acción no se puede deshacer.")) {
            localStorage.removeItem("lobo_entrenador_state");
            location.reload();
        }
    });
}

function renderProgressView() {
    const list = document.getElementById("weight-list");
    list.innerHTML = "";
    state.progress.weightHistory.slice().reverse().forEach(entry => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${entry.date}</span><strong>${entry.weight} kg</strong>`;
        list.appendChild(li);
    });

    const prof = state.profile;
    document.getElementById("profile-summary").innerHTML = `
        <p><strong>Género:</strong> ${prof.gender}</p>
        <p><strong>Edad:</strong> ${prof.age} años</p>
        <p><strong>Altura:</strong> ${prof.height} cm</p>
        <p><strong>Nivel:</strong> ${prof.experience}</p>
    `;
}
