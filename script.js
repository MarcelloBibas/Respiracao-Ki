// Variáveis globais
let trainingActive = false;
let startTime = null;
let currentPhase = 'waiting';
let breathCount = 0;
let isExhaling = true; // Sempre começa com expiração
let currentBreathTime = 4;
let warmupComplete = false;
let trainingInterval = null;
let breathInterval = null;
let countdownInterval = null;
let audio = null;

// Elementos DOM
const elapsedTimeEl = document.getElementById('elapsedTime');
const currentPhaseEl = document.getElementById('currentPhase');
const breathInstructionEl = document.getElementById('breathInstruction');
const breathTimeEl = document.getElementById('breathTime');
const countdownDisplayEl = document.getElementById('countdownDisplay');
const countdownNumberEl = document.getElementById('countdownNumber');
const progressFillEl = document.getElementById('progressFill');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// Inputs
const totalTimeInput = document.getElementById('totalTime');
const warmupTimeInput = document.getElementById('warmupTime');
const initialBreathInput = document.getElementById('initialBreath');
const maxBreathInput = document.getElementById('maxBreath');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    audio = document.getElementById('breathSound');
    setupValidation();
    updateDisplay();
    
    // Configurar eventos dos botões
    document.getElementById('startBtn').addEventListener('click', startTraining);
    document.getElementById('stopBtn').addEventListener('click', stopTraining);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// Configurar validação dos inputs
function setupValidation() {
    totalTimeInput.addEventListener('change', function() {
        const totalTime = parseInt(this.value);
        const warmupTime = parseInt(warmupTimeInput.value);
        
        if (totalTime < 6) {
            this.value = 6;
            alert('O tempo total não pode ser menor que 6 minutos.');
        }
        
        // Ajustar tempo de aquecimento se necessário
        const maxWarmup = Math.floor(totalTime * 0.5);
        if (warmupTime > maxWarmup) {
            warmupTimeInput.value = maxWarmup;
        }
        warmupTimeInput.max = maxWarmup;
    });

    warmupTimeInput.addEventListener('change', function() {
        const totalTime = parseInt(totalTimeInput.value);
        const warmupTime = parseInt(this.value);
        const maxWarmup = Math.floor(totalTime * 0.5);
        
        if (warmupTime > maxWarmup) {
            this.value = maxWarmup;
            alert(`O tempo de aquecimento deve ser menor ou igual a 50% do tempo total (máximo: ${maxWarmup} minutos).`);
        }
    });

    initialBreathInput.addEventListener('change', function() {
        if (this.value < 2) this.value = 2;
        if (this.value > 6) this.value = 6;
    });

    maxBreathInput.addEventListener('change', function() {
        const initialBreath = parseInt(initialBreathInput.value);
        if (this.value <= initialBreath) {
            this.value = initialBreath + 1;
            alert('O tempo máximo deve ser maior que o tempo inicial.');
        }
    });
}

// Alternar tema
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

// Iniciar treino
function startTraining() {
    if (trainingActive) return;
    
    // Validar inputs
    if (!validateInputs()) return;
    
    // Configurar estado inicial
    trainingActive = true;
    startTime = Date.now();
    currentPhase = 'countdown';
    breathCount = 0;
    isExhaling = true;
    warmupComplete = false;
    currentBreathTime = parseInt(initialBreathInput.value);
    
    // Atualizar interface
    startBtn.disabled = true;
    stopBtn.disabled = false;
    breathInstructionEl.textContent = 'Preparando...';
    currentPhaseEl.textContent = 'Contagem Regressiva';
    
    // Iniciar contagem regressiva
    startCountdown();
}

// Validar inputs
function validateInputs() {
    const totalTime = parseInt(totalTimeInput.value);
    const warmupTime = parseInt(warmupTimeInput.value);
    const initialBreath = parseInt(initialBreathInput.value);
    const maxBreath = parseInt(maxBreathInput.value);
    
    if (totalTime < 6) {
        alert('O tempo total deve ser de pelo menos 6 minutos.');
        return false;
    }
    
    if (warmupTime > totalTime * 0.5) {
        alert('O tempo de aquecimento deve ser menor ou igual a 50% do tempo total.');
        return false;
    }
    
    if (initialBreath < 2 || initialBreath > 6) {
        alert('O tempo inicial deve estar entre 2 e 6 segundos.');
        return false;
    }
    
    if (maxBreath <= initialBreath) {
        alert('O tempo máximo deve ser maior que o tempo inicial.');
        return false;
    }
    
    return true;
}

// Contagem regressiva
function startCountdown() {
    let countdown = 5;
    countdownDisplayEl.style.display = 'flex';
    countdownNumberEl.textContent = countdown;
    
    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownNumberEl.textContent = countdown;
            countdownNumberEl.classList.remove('pulse');
            setTimeout(() => countdownNumberEl.classList.add('pulse'), 10);
        } else {
            clearInterval(countdownInterval);
            countdownDisplayEl.style.display = 'none';
            startActualTraining();
        }
    }, 1000);
}

// Iniciar treino real
function startActualTraining() {
    currentPhase = 'warmup';
    currentPhaseEl.textContent = 'Aquecimento';
    breathInstructionEl.textContent = 'Expire';
    
    // Iniciar timer principal
    trainingInterval = setInterval(updateTimer, 100);
    
    // Iniciar primeiro ciclo de respiração
    scheduleNextBreath();
}

// Agendar próxima respiração
function scheduleNextBreath() {
    if (!trainingActive) return;
    
    const totalTimeMs = parseInt(totalTimeInput.value) * 60 * 1000;
    const warmupTimeMs = parseInt(warmupTimeInput.value) * 60 * 1000;
    const elapsedTime = Date.now() - startTime;
    
    // Determinar fase atual
    if (elapsedTime < warmupTimeMs) {
        currentPhase = 'warmup';
        currentPhaseEl.textContent = 'Aquecimento';
        currentBreathTime = parseInt(initialBreathInput.value);
    } else {
        if (!warmupComplete) {
            warmupComplete = true;
            breathCount = 0; // Resetar contador para fase de respiração
        }
        currentPhase = 'breathing';
        currentPhaseEl.textContent = 'Respiração';
        
        // Calcular tempo de respiração progressivo
        currentBreathTime = calculateProgressiveBreathTime(elapsedTime, warmupTimeMs, totalTimeMs);
    }
    
    // Tocar som e atualizar instrução
    playBreathSound();
    updateBreathInstruction();
    
    // Verificar se deve terminar após esta respiração
    // O treino deve terminar após a primeira expiração que exceder o tempo total
    if (elapsedTime >= totalTimeMs && isExhaling) {
        // Terminar imediatamente após esta expiração
        endTraining();
        return;
    }
    
    // Se a próxima respiração (inspiração) exceder o tempo total, mas a atual é uma expiração, agendar término após esta expiração
    const nextBreathEndTime = elapsedTime + (currentBreathTime * 1000);
    if (nextBreathEndTime > totalTimeMs && isExhaling) {
        breathInterval = setTimeout(() => {
            endTraining();
        }, currentBreathTime * 1000);
        return;
    }
    
    // Agendar próxima respiração
    breathInterval = setTimeout(() => {
        scheduleNextBreath();
    }, currentBreathTime * 1000);
}

// Calcular tempo de respiração progressivo
function calculateProgressiveBreathTime(elapsedTime, warmupTimeMs, totalTimeMs) {
    const breathingPhaseTime = totalTimeMs - warmupTimeMs;
    const breathingElapsed = elapsedTime - warmupTimeMs;
    
    const initialBreath = parseInt(initialBreathInput.value);
    const maxBreath = parseInt(maxBreathInput.value);
    
    // Calcular quantas respirações restam (aproximadamente)
    const avgBreathTime = (initialBreath + maxBreath) / 2;
    const remainingTime = totalTimeMs - elapsedTime;
    const estimatedRemainingBreaths = Math.floor(remainingTime / (avgBreathTime * 1000 * 2)); // *2 porque cada ciclo tem expire+inspire
    
    // Se restam 4 ou menos respirações, usar tempo máximo
    if (estimatedRemainingBreaths <= 4) {
        return maxBreath;
    }
    
    // Calcular o tempo disponível para progressão (descontando as últimas 4 respirações)
    const timeForLastBreaths = 4 * maxBreath * 1000 * 2; // 4 respirações no tempo máximo
    const progressionTime = breathingPhaseTime - timeForLastBreaths;
    
    // Se ainda estamos no período de progressão
    if (breathingElapsed < progressionTime) {
        // Calcular quantos ciclos de respiração já passaram desde o início da fase de respiração
        let cyclesPassed = 0;
        let timeAccumulated = 0;
        let currentTime = initialBreath;
        
        // Calcular incremento fixo de 1 segundo por ciclo completo
        let increment = 1;
        
        // Simular a progressão até o tempo atual
        while (timeAccumulated < breathingElapsed / 1000) {
            const cycleTime = currentTime * 2; // expire + inspire
            if (timeAccumulated + cycleTime <= breathingElapsed / 1000) {
                timeAccumulated += cycleTime;
                cyclesPassed++;
                // Incrementar 1 segundo a cada ciclo completo
                if (currentTime + increment <= maxBreath) {
                    currentTime += increment;
                } else {
                    currentTime = maxBreath;
                }
            } else {
                break;
            }
        }
        
        return Math.min(maxBreath, Math.max(initialBreath, currentTime));
    } else {
        // Estamos no período das últimas respirações, usar tempo máximo
        return maxBreath;
    }
}

// Tocar som de respiração
function playBreathSound() {
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Erro ao reproduzir áudio:', e));
    }
}

// Atualizar instrução de respiração
function updateBreathInstruction() {
    if (isExhaling) {
        breathInstructionEl.textContent = 'Expire';
        breathInstructionEl.style.background = 'var(--accent-color)';
    } else {
        breathInstructionEl.textContent = 'Inspire';
        breathInstructionEl.style.background = 'var(--button-bg)';
    }
    
    // Atualizar o tempo da respiração atual
    breathTimeEl.textContent = `${currentBreathTime}s`;
    
    // Alternar para próxima instrução
    isExhaling = !isExhaling;
    breathCount++;
    
    // Adicionar animação
    breathInstructionEl.classList.remove('pulse');
    setTimeout(() => breathInstructionEl.classList.add('pulse'), 10);
}

// Atualizar timer
function updateTimer() {
    if (!trainingActive || !startTime) return;
    
    const elapsedTime = Date.now() - startTime;
    const totalTimeMs = parseInt(totalTimeInput.value) * 60 * 1000;
    
    // Atualizar tempo decorrido
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    elapsedTimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Atualizar barra de progresso (pode ultrapassar 100% se necessário para terminar com expiração)
    const progress = Math.min(100, (elapsedTime / totalTimeMs) * 100);
    progressFillEl.style.width = `${progress}%`;
}

// Terminar treino
function stopTraining() {
    if (!trainingActive) return;
    endTraining();
}

// Finalizar treino
function endTraining() {
    trainingActive = false;
    
    // Limpar intervalos
    if (trainingInterval) clearInterval(trainingInterval);
    if (breathInterval) clearTimeout(breathInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Tocar três sinais finais
    playFinalSounds();
    
    // Atualizar interface
    currentPhaseEl.textContent = 'Concluído';
    breathInstructionEl.textContent = 'Treino Finalizado';
    breathInstructionEl.style.background = 'var(--accent-color)';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    countdownDisplayEl.style.display = 'none';
    
    // Resetar estado
    setTimeout(() => {
        resetTraining();
    }, 3000);
}

// Tocar sinais finais
function playFinalSounds() {
    let soundCount = 0;
    const finalSoundInterval = setInterval(() => {
        playBreathSound();
        soundCount++;
        if (soundCount >= 3) {
            clearInterval(finalSoundInterval);
        }
    }, 500);
}

// Resetar treino
function resetTraining() {
    startTime = null;
    currentPhase = 'waiting';
    breathCount = 0;
    isExhaling = true;
    warmupComplete = false;
    currentBreathTime = parseInt(initialBreathInput.value);
    
    updateDisplay();
}

// Atualizar display
function updateDisplay() {
    elapsedTimeEl.textContent = '00:00';
    currentPhaseEl.textContent = 'Aguardando';
    breathInstructionEl.textContent = 'Pressione Iniciar';
    breathInstructionEl.style.background = 'var(--accent-color)';
    breathTimeEl.textContent = `${parseInt(initialBreathInput.value)}s`;
    progressFillEl.style.width = '0%';
}


// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    audio = document.getElementById('breathSound');
    setupValidation();
    updateDisplay();
    
    // Adicionar eventos dos botões
    startBtn.addEventListener('click', startTraining);
    stopBtn.addEventListener('click', stopTraining);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Atualizar display quando os inputs mudarem
    initialBreathInput.addEventListener('input', updateDisplay);
});

