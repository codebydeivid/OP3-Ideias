class HistoryManager {
    constructor() {
        this.storageKey = 'gameOrganizerHistory';
        this.maxHistoryEntries = 50; // Máximo de entradas no histórico
        this.currentStateId = null;
    }

    saveToHistory(data, description = 'Estado atualizado') {
        try {
            const historyData = this.getHistoryData();
            const stateId = this.generateStateId();
            
            const newEntry = {
                id: stateId,
                timestamp: Date.now(),
                description: description,
                data: JSON.parse(JSON.stringify(data)),
                url: window.location.href
            };

          
            if (historyData.entries.length >= this.maxHistoryEntries) {
                historyData.entries = historyData.entries.slice(-this.maxHistoryEntries + 1);
            }

            historyData.entries.push(newEntry);
            historyData.currentStateId = stateId;
            
            sessionStorage.setItem(this.storageKey, JSON.stringify(historyData));
            
            const newUrl = `${window.location.pathname}?state=${stateId}`;
            history.replaceState({ stateId: stateId, data: data }, '', newUrl);
            
            this.currentStateId = stateId;
            
            console.log(`Estado salvo no histórico: ${description}`);
            return stateId;
        } catch (error) {
            console.error('Erro ao salvar no histórico:', error);
            return null;
        }
    }

    getHistoryData() {
        try {
            const stored = sessionStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Erro ao ler histórico:', error);
        }
        
        return {
            entries: [],
            currentStateId: null,
            createdAt: Date.now()
        };
    }

    loadLastState() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const stateId = urlParams.get('state');
            
            const historyData = this.getHistoryData();
            
            if (stateId) {
                const specificEntry = historyData.entries.find(entry => entry.id === stateId);
                if (specificEntry) {
                    console.log('Estado carregado da URL:', specificEntry.description);
                    return specificEntry.data;
                }
            }
            
            if (historyData.entries.length > 0) {
                const lastEntry = historyData.entries[historyData.entries.length - 1];
                console.log('Último estado carregado:', lastEntry.description);
                this.currentStateId = lastEntry.id;
                return lastEntry.data;
            }
            
            console.log('Nenhum estado anterior encontrado');
            return null;
        } catch (error) {
            console.error('Erro ao carregar último estado:', error);
            return null;
        }
    }

    generateStateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    clearHistory() {
        try {
            sessionStorage.removeItem(this.storageKey);
            const newUrl = window.location.pathname;
            history.replaceState({}, '', newUrl);
            console.log('Histórico limpo com sucesso');
            return true;
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            return false;
        }
    }

    getHistoryStats() {
        const historyData = this.getHistoryData();
        return {
            totalEntries: historyData.entries.length,
            oldestEntry: historyData.entries.length > 0 ? new Date(historyData.entries[0].timestamp) : null,
            newestEntry: historyData.entries.length > 0 ? new Date(historyData.entries[historyData.entries.length - 1].timestamp) : null,
            currentStateId: this.currentStateId
        };
    }
}

class GameIdeaOrganizer {
    constructor() {
        this.historyManager = new HistoryManager();
        this.data = this.loadData();
        this.currentSection = 'narrativa';
        this.isOnline = navigator.onLine;
        this.saveTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPopstateListener();
        this.setupOnlineOfflineListeners();
        this.loadAllSections();
        this.autoSave();
        this.updateConnectionStatus();
        
        setTimeout(() => {
            this.updateProjectStats();
            this.showLoadingComplete();
        }, 500);
    }

    setupPopstateListener() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.stateId) {
                console.log('Navegação do histórico detectada:', event.state.stateId);
                this.loadStateFromHistory(event.state.stateId);
            }
        });
    }

    setupOnlineOfflineListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.saveData('Reconectado - dados sincronizados');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        if (this.isOnline) {
            statusEl.innerHTML = '🟢 Online';
            statusEl.classList.remove('offline');
        } else {
            statusEl.innerHTML = '🔴 Offline';
            statusEl.classList.add('offline');
        }
    }

    loadStateFromHistory(stateId) {
        const historyData = this.historyManager.getHistoryData();
        const entry = historyData.entries.find(e => e.id === stateId);
        
        if (entry) {
            this.data = entry.data;
            this.loadAllSections();
            this.updateProjectStats();
            this.showHistoryLoadFeedback(entry.description);
        }
    }

    showHistoryLoadFeedback(description) {
        const indicator = document.getElementById('savingIndicator');
        indicator.textContent = `📚 Histórico: ${description}`;
        indicator.style.background = '#4299e1';
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.textContent = '💾 Salvando automaticamente...';
                indicator.style.background = '#48bb78';
            }, 300);
        }, 3000);
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        window.addEventListener('beforeunload', (e) => {
            this.saveData('Dados salvos antes de sair');
        });

        window.addEventListener('blur', () => {
            this.saveData('Dados salvos ao perder foco');
        });
    }

    switchSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        document.getElementById(sectionName).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        this.currentSection = sectionName;
        
        this.scheduleSave(`Navegou para seção: ${sectionName}`);
    }

    loadData() {
        const defaultData = {
            narrativa: [],
            personagens: [],
            mecanicas: [],
            tecnologias: [],
            cronograma: []
        };

        try {
            const historicalData = this.historyManager.loadLastState();
            
            if (historicalData) {
                const isValidStructure = Object.keys(defaultData).every(section => 
                    historicalData.hasOwnProperty(section) && Array.isArray(historicalData[section])
                );
                
                if (isValidStructure) {
                    console.log('Dados carregados do histórico com sucesso!');
                    return historicalData;
                }
            }

            console.log('Inicializando com dados padrão');
            return defaultData;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return defaultData;
        }
    }

    scheduleSave(description = 'Dados atualizados') {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveData(description);
            this.saveTimeout = null;
        }, 1000);
    }

    saveData(description = 'Estado atualizado') {
        try {
            const stateId = this.historyManager.saveToHistory(this.data, description);
            
            if (stateId) {
                this.showSavingIndicator();
                this.updateStats();
                
                console.log(`Dados salvos: ${description}`);
                return true;
            } else {
                throw new Error('Falha ao salvar no histórico');
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showErrorIndicator();
            return false;
        }
    }

    showLoadingComplete() {
        const indicator = document.getElementById('savingIndicator');
        const stats = this.historyManager.getHistoryStats();
        
        if (stats.totalEntries > 0) {
            indicator.textContent = `📚 Projeto carregado!`;
        } else {
            indicator.textContent = '🆕 Novo projeto iniciado!';
        }
        
        indicator.style.background = '#4299e1';
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.textContent = '💾 Salvando automaticamente...';
                indicator.style.background = '#48bb78';
            }, 300);
        }, 3000);
    }

    updateStats() {
        const totalItems = Object.values(this.data).reduce((sum, section) => sum + section.length, 0);
        const sectionsWithContent = Object.values(this.data).filter(section => section.length > 0).length;
        const historyStats = this.historyManager.getHistoryStats();
        
        this.stats = {
            totalItems,
            sectionsWithContent,
            historyEntries: historyStats.totalEntries,
            lastUpdate: new Date().toLocaleString('pt-BR')
        };
    }

    showSavingIndicator() {
        const indicator = document.getElementById('savingIndicator');
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    showErrorIndicator() {
        const indicator = document.getElementById('savingIndicator');
        indicator.textContent = '⚠️ Erro ao salvar! Tentando novamente...';
        indicator.style.background = '#f56565';
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.textContent = '💾 Salvando automaticamente...';
                indicator.style.background = '#48bb78';
            }, 300);
        }, 3000);
    }

    autoSave() {
        this.saveData('Aplicação inicializada');
        
        setInterval(() => {
            if (this.isOnline) {
                this.saveData('Salvamento automático periódico');
            }
        }, 30000);
    }

    exportData() {
        try {
            const historyStats = this.historyManager.getHistoryStats();
            const dataToExport = {
                projectData: this.data,
                metadata: {
                    exportedAt: new Date().toISOString(),
                    projectName: 'Projeto de Desenvolvimento de Jogo',
                    version: '2.0',
                    totalItems: Object.values(this.data).reduce((sum, section) => sum + section.length, 0),
                    historyEntries: historyStats.totalEntries,
                    lastUpdate: this.stats?.lastUpdate || new Date().toLocaleString('pt-BR')
                },
                historyBackup: this.historyManager.getHistoryData() // Backup do histórico
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `game-project-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            // Feedback visual
            const indicator = document.getElementById('savingIndicator');
            indicator.textContent = '📥 Projeto exportado com histórico!';
            indicator.style.background = '#4299e1';
            indicator.classList.add('show');
            
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => {
                    indicator.textContent = '💾 Salvando automaticamente...';
                    indicator.style.background = '#48bb78';
                }, 300);
            }, 3000);

            this.saveData('Projeto exportado');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar o projeto. Tente novamente.');
        }
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                let projectData;
                let historyBackup = null;
                
                if (importedData.projectData && importedData.metadata) {
                    projectData = importedData.projectData;
                    historyBackup = importedData.historyBackup;
                } else {
                    projectData = importedData;
                }
                
                const requiredSections = ['narrativa', 'personagens', 'mecanicas', 'tecnologias', 'cronograma'];
                const isValidStructure = requiredSections.every(section => 
                    projectData.hasOwnProperty(section) && Array.isArray(projectData[section])
                );

                if (!isValidStructure) {
                    throw new Error('Estrutura de arquivo inválida');
                }

                const totalItems = Object.values(projectData).reduce((sum, section) => {
                    if (Array.isArray(section)) return sum + section.length;
                    return sum;
                }, 0);

                const historyInfo = historyBackup ? ` e ${historyBackup.entries?.length || 0} entradas de histórico` : '';
                const confirmMessage = `Importar projeto com ${totalItems} itens${historyInfo}?\n\nIsso substituirá todos os dados atuais e o histórico.`;

                if (confirm(confirmMessage)) {
                    this.historyManager.clearHistory();
                    
                    requiredSections.forEach(section => {
                        this.data[section] = projectData[section] || [];
                    });

                    if (historyBackup && historyBackup.entries) {
                        try {
                            sessionStorage.setItem(this.historyManager.storageKey, JSON.stringify(historyBackup));
                            console.log('Histórico restaurado com sucesso');
                        } catch (error) {
                            console.warn('Não foi possível restaurar o histórico:', error);
                        }
                    }

                    this.loadAllSections();
                    this.saveData('Projeto importado com sucesso');
                    this.updateProjectStats();
                    
                    const indicator = document.getElementById('savingIndicator');
                    indicator.textContent = '📤 Projeto importado com histórico!';
                    indicator.style.background = '#48bb78';
                    indicator.classList.add('show');
                    
                    setTimeout(() => {
                        indicator.classList.remove('show');
                        setTimeout(() => {
                            indicator.textContent = '💾 Salvando automaticamente...';
                            indicator.style.background = '#48bb78';
                        }, 300);
                    }, 3000);
                }
            } catch (error) {
                console.error('Erro ao importar:', error);
                alert('Erro ao importar arquivo. Verifique se o arquivo está no formato correto.');
            }
            
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }

    clearAllData() {
        const historyStats = this.historyManager.getHistoryStats();
        const totalItems = Object.values(this.data).reduce((sum, section) => sum + section.length, 0);
        
        const confirmMessage = `⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados!\n\n` +
            `• ${totalItems} itens do projeto\n` +
            `• ${historyStats.totalEntries} entradas do histórico\n` +
            `• Todo o progresso será perdido permanentemente\n\n` +
            `Tem certeza absoluta que deseja continuar?`;
        
        if (confirm(confirmMessage)) {
            const secondConfirm = confirm('🚨 ÚLTIMA CHANCE!\n\nEsta ação NÃO PODE ser desfeita!\n\nDigite "CONFIRMAR" se realmente deseja apagar tudo.');
            
            if (secondConfirm) {
                this.data = {
                    narrativa: [],
                    personagens: [],
                    mecanicas: [],
                    tecnologias: [],
                    cronograma: []
                };
                
                this.historyManager.clearHistory();
                
                this.loadAllSections();
                this.updateProjectStats();
                
                this.saveData('Projeto reiniciado');
                
                const indicator = document.getElementById('savingIndicator');
                indicator.textContent = '🗑️ Todos os dados foram limpos!';
                indicator.style.background = '#f56565';
                indicator.classList.add('show');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                    setTimeout(() => {
                        indicator.textContent = '💾 Salvando automaticamente...';
                        indicator.style.background = '#48bb78';
                    }, 300);
                }, 3000);
            }
        }
    }

    updateProjectStats() {
        const totalItems = Object.values(this.data).reduce((sum, section) => sum + section.length, 0);
        const sectionsWithContent = Object.values(this.data).filter(section => section.length > 0).length;
        const historyStats = this.historyManager.getHistoryStats();
        
        const statsElement = document.getElementById('projectStats');
        
        if (totalItems === 0) {
            statsElement.textContent = '🎮 Projeto iniciado • Adicione suas primeiras ideias!';
        } else {
            const lastUpdate = historyStats.newestEntry ? 
                historyStats.newestEntry.toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : 'Agora';
            
            statsElement.textContent = `🎮 ${totalItems} ideias em ${sectionsWithContent} seções •`;
        }
    }

    loadAllSections() {
        Object.keys(this.data).forEach(section => {
            this.loadSection(section);
        });
    }

    loadSection(sectionName) {
        const grid = document.getElementById(`${sectionName}-grid`);
        grid.innerHTML = '';

        this.data[sectionName].forEach(item => {
            this.createIdeaBalloon(sectionName, item);
        });
    }

    addIdea(sectionName) {
        const newIdea = {
            id: Date.now(),
            title: this.getDefaultTitle(sectionName),
            content: '',
            date: sectionName === 'cronograma' ? '' : undefined,
            createdAt: new Date().toISOString()
        };

        this.data[sectionName].push(newIdea);
        this.createIdeaBalloon(sectionName, newIdea);
        
        this.scheduleSave(`Nova ideia adicionada: ${this.getDefaultTitle(sectionName)}`);
        this.updateProjectStats();
    }

    getDefaultTitle(sectionName) {
        const titles = {
            narrativa: 'Nova Ideia de História',
            personagens: 'Novo Personagem',
            mecanicas: 'Nova Mecânica',
            tecnologias: 'Nova Tecnologia',
            cronograma: 'Nova Tarefa'
        };
        return titles[sectionName] || 'Nova Ideia';
    }

    createIdeaBalloon(sectionName, ideaData) {
        const grid = document.getElementById(`${sectionName}-grid`);
        const balloon = document.createElement('div');
        balloon.className = `idea-balloon ${sectionName === 'cronograma' ? 'schedule-balloon' : ''}`;
        balloon.dataset.id = ideaData.id;

        balloon.innerHTML = `
            <div class="balloon-header">
                <input type="text" class="balloon-title" value="${ideaData.title}" 
                        placeholder="Título da ideia...">
                <button class="delete-button" onclick="organizer.deleteIdea('${sectionName}', ${ideaData.id})">
                    ×
                </button>
            </div>
            ${sectionName === 'cronograma' ? 
                `<input type="date" class="date-input" value="${ideaData.date || ''}" 
                        placeholder="Data limite">` : ''
            }
            <textarea class="balloon-content" 
                        placeholder="Descreva sua ideia aqui...">${ideaData.content}</textarea>
        `;

        const titleInput = balloon.querySelector('.balloon-title');
        const contentInput = balloon.querySelector('.balloon-content');
        const dateInput = balloon.querySelector('.date-input');

        titleInput.addEventListener('input', (e) => {
            this.updateIdea(sectionName, ideaData.id, 'title', e.target.value);
        });

        contentInput.addEventListener('input', (e) => {
            this.updateIdea(sectionName, ideaData.id, 'content', e.target.value);
        });

        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.updateIdea(sectionName, ideaData.id, 'date', e.target.value);
            });
        }

        grid.appendChild(balloon);
    }

    updateIdea(sectionName, ideaId, field, value) {
        const idea = this.data[sectionName].find(item => item.id === ideaId);
        if (idea) {
            const oldValue = idea[field];
            idea[field] = value;
            
            // Salva apenas se o valor mudou significativamente
            if (oldValue !== value) {
                const description = `${field === 'title' ? 'Título' : field === 'content' ? 'Conteúdo' : 'Data'} atualizado: ${idea.title}`;
                this.scheduleSave(description);
            }
        }
    }

    deleteIdea(sectionName, ideaId) {
        const idea = this.data[sectionName].find(item => item.id === ideaId);
        if (!idea) return;

        const sectionNames = {
            narrativa: 'esta ideia de narrativa',
            personagens: 'este personagem',
            mecanicas: 'esta mecânica',
            tecnologias: 'esta tecnologia',
            cronograma: 'esta tarefa do cronograma'
        };

        const itemName = sectionNames[sectionName] || 'este item';
        const confirmMessage = `⚠️ Tem certeza que deseja excluir ${itemName}?\n\n"${idea.title}"\n\nEsta ação não pode ser desfeita!`;
        
        if (confirm(confirmMessage)) {
            this.data[sectionName] = this.data[sectionName].filter(item => item.id !== ideaId);
            
            const balloon = document.querySelector(`[data-id="${ideaId}"]`);
            if (balloon) {
                balloon.style.transform = 'scale(0)';
                balloon.style.opacity = '0';
                
                setTimeout(() => {
                    balloon.remove();
                }, 300);
            }
            
            this.saveData(`Item excluído: ${idea.title}`);
            this.updateProjectStats();
            
            this.showDeleteFeedback(idea.title);
        }
    }

    showDeleteFeedback(itemTitle) {
        const indicator = document.getElementById('savingIndicator');
        indicator.textContent = `🗑️ "${itemTitle}" excluído!`;
        indicator.style.background = '#f56565';
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.textContent = '💾 Salvando automaticamente...';
                indicator.style.background = '#48bb78';
            }, 300);
        }, 2000);
    }
}

const organizer = new GameIdeaOrganizer();

function addIdea(section) {
    organizer.addIdea(section);
}

function showHistoryStats() {
    const stats = organizer.historyManager.getHistoryStats();
    console.log('📊 Estatísticas do Histórico:', stats);
    
    const historyData = organizer.historyManager.getHistoryData();
    console.log('📚 Entradas do Histórico:', historyData.entries.map(entry => ({
        id: entry.id,
        description: entry.description,
        timestamp: new Date(entry.timestamp).toLocaleString('pt-BR'),
        itemCount: Object.values(entry.data).reduce((sum, section) => sum + section.length, 0)
    })));
}

window.showHistoryStats = showHistoryStats;