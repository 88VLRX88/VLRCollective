let autoRefreshInterval = null;
let activeTab = localStorage.getItem('vlr_active_tab') || 'discussion';

// Обновить вкладки
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Обновляем активный класс у кнопок
    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.classList.remove('active');
    });
    const tabNames = ['discussion', 'synthesis', 'query', 'agents'];
    const index = tabNames.indexOf(tabId);
    if (index >= 0 && document.querySelectorAll('.tabs button')[index]) {
        document.querySelectorAll('.tabs button')[index].classList.add('active');
    }
    
    localStorage.setItem('vlr_active_tab', tabId);
    activeTab = tabId;
    
    if (tabId === 'discussion') refreshLogs();
    if (tabId === 'synthesis') refreshSynthesis();
}

// Загрузить сессию
async function loadSession() {
    const sessionId = document.getElementById("sessionIdInput").value;
    localStorage.setItem("vlr_session", sessionId);
    loadSettingsForSession();
    await refreshLogs();
    await refreshSynthesis();
    showTab("discussion");
}

// Загрузить настройки для сессии
function loadSettingsForSession() {
    const session = localStorage.getItem("vlr_session");
    if (!session) return;

    // Загрузить агентов
    const savedAgents = localStorage.getItem(`vlr_agents_${session}`);
    if (savedAgents) {
        const agents = JSON.parse(savedAgents);
        const agentList = document.getElementById("agentList");
        agentList.innerHTML = "";
        agents.forEach(agent => {
            const card = document.createElement("div");
            card.className = "agent-card";
            
            const idInput = document.createElement("input");
            idInput.value = agent.id;
            idInput.readOnly = true;
            
            const modelInput = document.createElement("input");
            modelInput.value = agent.model;
            modelInput.readOnly = true;
            
            const patternInput = document.createElement("input");
            patternInput.value = agent.pattern;
            patternInput.readOnly = true;
            
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.onclick = () => {
                card.remove();
                saveSettings();
            };
            
            card.appendChild(idInput);
            card.appendChild(modelInput);
            card.appendChild(patternInput);
            card.appendChild(deleteBtn);
            agentList.appendChild(card);
        });
    }

    // Загрузить мета-итерации
    const savedMeta = localStorage.getItem(`vlr_meta_${session}`);
    if (savedMeta) {
        document.getElementById("metaIterations").value = savedMeta;
    }
}

// Обновить логи
async function refreshLogs() {
    const statusEl = document.getElementById("status");
    try {
        const session = localStorage.getItem("vlr_session");
        if (!session) {
            statusEl.textContent = "Enter session ID";
            return;
        }

        const response = await fetch(`/collective/${session}/full_log.txt?t=${Date.now()}`);
        if (response.ok) {
            const text = await response.text();
            document.getElementById("logOutput").textContent = text;
            statusEl.textContent = `OK (${text.split("=====").length - 1})`;
        } else {
            statusEl.textContent = "No data";
        }
    } catch (e) {
        console.error(e);
        statusEl.textContent = "Error";
    }
}

// Обновить синтез
async function refreshSynthesis() {
    const session = localStorage.getItem("vlr_session");
    if (!session) return;

    try {
        const response = await fetch(`/collective/${session}/collaborator.txt?t=${Date.now()}`);
        if (response.ok) {
            document.getElementById("synthesisOutput").textContent = await response.text();
        }
    } catch (e) {
        console.error(e);
    }
}

// Отправить вопрос
async function sendQuestion() {
    const session = localStorage.getItem("vlr_session");
    const questionInput = document.getElementById("questionInput");
    const question = questionInput.value.trim();

    if (!session || !question) return;

    const statusEl = document.getElementById("status");
    
    try {
        let agents = JSON.parse(localStorage.getItem(`vlr_agents_${session}`)) || [];
        let metaIterations = parseInt(localStorage.getItem(`vlr_meta_${session}`)) || 4;
        
        await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question, 
                session_id: session, 
                agents, 
                meta_iterations: metaIterations 
            })
        });

        statusEl.textContent = "Started";
        questionInput.value = "";
        setTimeout(() => showTab("discussion"), 2000);
    } catch (e) {
        console.error(e);
        statusEl.textContent = "Error";
    }
}

// Включить/выключить автообновление
function toggleAutoRefresh() {
    const checkbox = document.getElementById("autoRefresh");
    if (checkbox.checked) {
        autoRefreshInterval = setInterval(refreshLogs, 3000);
    } else {
        clearInterval(autoRefreshInterval);
    }
}

// Добавить агента
function addAgent() {
    const id = document.getElementById("agentIdInput").value;
    const model = document.getElementById("modelInput").value;
    const pattern = document.getElementById("patternInput").value;

    if (!id || !model || !pattern) return;

    const agentList = document.getElementById("agentList");
    const card = document.createElement("div");
    card.className = "agent-card";

    const idInput = document.createElement("input");
    idInput.value = id;
    idInput.readOnly = true;

    const modelInput = document.createElement("input");
    modelInput.value = model;
    modelInput.readOnly = true;

    const patternInput = document.createElement("input");
    patternInput.value = pattern;
    patternInput.readOnly = true;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => {
        card.remove();
        saveSettings();
    };

    card.appendChild(idInput);
    card.appendChild(modelInput);
    card.appendChild(patternInput);
    card.appendChild(deleteBtn);
    agentList.appendChild(card);

    document.getElementById("agentIdInput").value = "";
    document.getElementById("modelInput").value = "";
    document.getElementById("patternInput").value = "";

    saveSettings();
}

// Сохранить настройки
function saveSettings() {
    const session = localStorage.getItem("vlr_session");
    if (!session) return;

    let agents = [];
    const cards = document.querySelectorAll(".agent-card");
    for (const card of cards) {
        const inputs = card.querySelectorAll("input");
        if (inputs.length >= 3) {
            agents.push({
                id: inputs[0].value,
                model: inputs[1].value,
                pattern: inputs[2].value
            });
        }
    }

    localStorage.setItem(`vlr_agents_${session}`, JSON.stringify(agents));
    localStorage.setItem(`vlr_meta_${session}`, document.getElementById("metaIterations").value);
}

// Загрузить всё при старте
async function loadInitialData() {
    const session = localStorage.getItem("vlr_session");
    if (session) {
        document.getElementById("sessionIdInput").value = session;
        loadSettingsForSession();
        await refreshLogs();
        await refreshSynthesis();
    }
    showTab(activeTab);
}

// Запуск
loadInitialData();