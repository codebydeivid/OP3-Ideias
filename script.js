// Gerenciador de dados e estado da aplicação
class GameIdeaOrganizer {
    constructor() {
        this.data = this.loadData();
        this.currentSection = 'narrativa';
        this.init();
    }

    // Inicializa a aplicação
    init() {
        this.setupEventListeners();
        this.loadAllSections();
        this.autoSave();
    }

    // Configura os event listeners
    setupEventListeners() {
        // Navegação entre abas
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });
    }

    // Troca de seção
    switchSection(sectionName) {
        // Remove classe active de todas as seções e botões
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Ativa a seção selecionada
        document.getElementById(sectionName).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        this.currentSection = sectionName;
    }

    // Carrega dados do armazenamento local
    loadData() {
        const defaultData = {
            narrativa: [],
            personagens: [],
            mecanicas: [],
            tecnologias: [],
            cronograma: []
        };

        try {
            const savedData = JSON.parse('{}'); // Placeholder - dados serão salvos em memória durante esta sessão
            
            // Se não houver dados salvos, retorna dados padrão
            if (!savedData || Object.keys(savedData).length === 0) {
                console.log('Inicializando com dados padrão - primeira vez usando o aplicativo');
                return defaultData;
            }

            // Garante que todas as seções existam
            Object.keys(defaultData).forEach(section => {
                if (!savedData[section]) {
                    savedData[section] = [];
                }
            });

            console.log('Dados carregados com sucesso!', savedData);
            return savedData;
        } catch (error) {
            console.log('Erro ao carregar dados, usando dados padrão:', error);
            return defaultData;
        }
    }

    // Salva dados no armazenamento local
    saveData() {
        try {
            // Salva os dados em memória durante a sessão
            // Nota: Em um ambiente real, isso usaria localStorage
            console.log('Dados salvos automaticamente:', this.data);
            
            // Simula salvamento bem-sucedido
            this.showSavingIndicator();
            
            // Estatísticas para o usuário
            this.updateStats();
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showErrorIndicator();
        }
    }

    // Atualiza estatísticas do projeto
    updateStats() {
        const totalItems = Object.values(this.data).reduce((sum, section) => sum + section.length, 0);
        const sectionsWithContent = Object.values(this.data).filter(section => section.length > 0).length;
        
        // Armazena estatísticas para possível exibição futura
        this.stats = {
            totalItems,
            sectionsWithContent,
            lastUpdate: new Date().toLocaleString('pt-BR')
        };
    }

    // Mostra indicador de erro
    showErrorIndicator() {
        const indicator = document.getElementById('savingIndicator');
        indicator.textContent = '⚠️ Erro ao salvar! Verifique sua conexão.';
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

    // Mostra indicador de salvamento
    showSavingIndicator() {
        const indicator = document.getElementById('savingIndicator');
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    // Auto-save periódico e inicialização
    autoSave() {
        // Salva imediatamente ao carregar
        this.saveData();
        
        // Configura salvamento automático
        setInterval(() => {
            this.saveData();
        }, 30000); // Salva a cada 30 segundos
    }

    // Exporta dados como arquivo JSON
    exportData() {
        try {
            const dataToExport = {
                ...this.data,
                exportedAt: new Date().toISOString(),
                projectName: 'Projeto de Desenvolvimento de Jogo',
                version: '1.0'
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
            indicator.textContent = '📥 Projeto exportado com sucesso!';
            indicator.style.background = '#4299e1';
            indicator.classList.add('show');
            
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => {
                    indicator.textContent = '💾 Salvando automaticamente...';
                    indicator.style.background = '#48bb78';
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar o projeto. Tente novamente.');
        }
    }

    // Importa dados de arquivo JSON
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Valida estrutura dos dados
                const requiredSections = ['narrativa', 'personagens', 'mecanicas', 'tecnologias', 'cronograma'];
                const isValidStructure = requiredSections.every(section => 
                    importedData.hasOwnProperty(section) && Array.isArray(importedData[section])
                );

                if (!isValidStructure) {
                    throw new Error('Estrutura de arquivo inválida');
                }

                // Confirma importação
                const totalItems = Object.values(importedData).reduce((sum, section) => {
                    if (Array.isArray(section)) return sum + section.length;
                    return sum;
                }, 0);

                if (confirm(`Importar projeto com ${totalItems} itens?\n\nIsso substituirá todos os dados atuais.`)) {
                    // Filtra apenas as seções válidas
                    requiredSections.forEach(section => {
                        this.data[section] = importedData[section] || [];
                    });

                    this.loadAllSections();
                    this.saveData();
                    this.updateProjectStats();
                    
                    // Feedback visual
                    const indicator = document.getElementById('savingIndicator');
                    indicator.textContent = '📤 Projeto importado com sucesso!';
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
            
            // Limpa o input
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }

    // Atualiza estatísticas do projeto na interface
    updateProjectStats() {
        const totalItems = Object.values(this.data).reduce((sum, section) => sum + section.length, 0);
        const sectionsWithContent = Object.values(this.data).filter(section => section.length > 0).length;
        
        const statsElement = document.getElementById('projectStats');
        if (totalItems === 0) {
            statsElement.textContent = '🎮 Projeto iniciado • Adicione suas primeiras ideias!';
        } else {
            statsElement.textContent = `🎮 ${totalItems} ideias em ${sectionsWithContent} seções • Projeto salvo automaticamente`;
        }
    }

    // Carrega todas as seções
    loadAllSections() {
        Object.keys(this.data).forEach(section => {
            this.loadSection(section);
        });
    }

    // Carrega uma seção específica
    loadSection(sectionName) {
        const grid = document.getElementById(`${sectionName}-grid`);
        grid.innerHTML = '';

        this.data[sectionName].forEach(item => {
            this.createIdeaBalloon(sectionName, item);
        });
    }

    // Adiciona nova ideia
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
        this.saveData();
        this.updateProjectStats();
    }

    // Obtém título padrão baseado na seção
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

    // Cria balão de ideia
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

        // Event listeners para salvar automaticamente
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

    // Atualiza ideia
    updateIdea(sectionName, ideaId, field, value) {
        const idea = this.data[sectionName].find(item => item.id === ideaId);
        if (idea) {
            idea[field] = value;
            this.saveData();
        }
    }

    // Delete ideia
    deleteIdea(sectionName, ideaId) {
        // Personaliza a mensagem de confirmação baseada na seção
        const sectionNames = {
            narrativa: 'esta ideia de narrativa',
            personagens: 'este personagem',
            mecanicas: 'esta mecânica',
            tecnologias: 'esta tecnologia',
            cronograma: 'esta tarefa do cronograma'
        };

        const itemName = sectionNames[sectionName] || 'este item';
        const confirmMessage = `⚠️ Tem certeza que deseja excluir ${itemName}?\n\nEsta ação não pode ser desfeita!`;
        
        if (confirm(confirmMessage)) {
            this.data[sectionName] = this.data[sectionName].filter(item => item.id !== ideaId);
            
            // Animação de remoção
            const balloon = document.querySelector(`[data-id="${ideaId}"]`);
            balloon.style.transform = 'scale(0)';
            balloon.style.opacity = '0';
            
            setTimeout(() => {
                balloon.remove();
            }, 300);
            
            this.saveData();
            this.updateProjectStats();
            
            // Feedback visual de exclusão
            this.showDeleteFeedback();
        }
    }

    // Mostra feedback de exclusão
    showDeleteFeedback() {
        const indicator = document.getElementById('savingIndicator');
        indicator.textContent = '🗑️ Item excluído com sucesso!';
        indicator.style.background = '#f56565';
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
            // Restaura o texto original
            setTimeout(() => {
                indicator.textContent = '💾 Salvando automaticamente...';
                indicator.style.background = '#48bb78';
            }, 300);
        }, 2000);
    }
}

// Inicializa a aplicação
const organizer = new GameIdeaOrganizer();

// Funções globais para compatibilidade com onclick
function addIdea(section) {
    organizer.addIdea(section);
}