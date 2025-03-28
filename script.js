// Elementos del DOM
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const bestSolutionEl = document.getElementById('bestSolution');
const bestFitnessEl = document.getElementById('bestFitness');
const currentIterationEl = document.getElementById('currentIteration');
const executionTimeEl = document.getElementById('executionTime');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Variables del algoritmo
let animationId = null;
let isRunning = false;
let startTime = 0;
let foodSources = [];
let fitnessValues = [];
let trialCounters = [];
let bestSolution = [];
let bestFitness = Infinity;
let iteration = 0;
let maxIterations = 100;

// Funciones objetivo
const functions = {
    quadratic: x => x[0] * x[0] + 2 * x[0] + 1,
    rastrigin: x => 10 + (x[0] * x[0] - 10 * Math.cos(2 * Math.PI * x[0])),
    sphere: x => x[0] * x[0],
    rosenbrock: ([x, y]) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2)
};

// Inicialización del canvas
function initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}

// Función para reiniciar la simulación
function resetSimulation() {
    stopABC();
    resetAlgorithmState();
    updateUI();
    drawVisualization([], [0, 0], functions.quadratic);
}

function resetAlgorithmState() {
    foodSources = [];
    fitnessValues = [];
    trialCounters = [];
    bestSolution = [];
    bestFitness = Infinity;
    iteration = 0;
    startTime = 0;
}

// Función para dibujar la visualización
function drawVisualization(foodSources, range, func) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 70;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    ctx.clearRect(0, 0, width, height);
    
    // Dibujar cuadrícula
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Cuadrícula horizontal
    const ySteps = 10;
    const minY = getMinY(range, func);
    const maxY = getMaxY(range, func);
    
    for (let i = 0; i <= ySteps; i++) {
        const y = padding + (i * graphHeight / ySteps);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Etiquetas del eje Y
        const value = minY + (maxY - minY) * (1 - i / ySteps);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(2), padding - 10, y + 4);
    }
    
    // Cuadrícula vertical
    const xSteps = 10;
    for (let i = 0; i <= xSteps; i++) {
        const x = padding + (i * graphWidth / xSteps);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // Etiquetas del eje X
        const value = range[0] + (range[1] - range[0]) * (i / xSteps);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(2), x, height - padding + 20);
    }
    
    // Dibujar ejes principales
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Dibujar la función
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const step = (range[1] - range[0]) / graphWidth;
    for (let x = range[0]; x <= range[1]; x += step) {
        const screenX = padding + ((x - range[0]) / (range[1] - range[0])) * graphWidth;
        const y = func([x]);
        const screenY = height - padding - ((y - minY) / (maxY - minY)) * graphHeight;
        
        if (x === range[0]) {
            ctx.moveTo(screenX, screenY);
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    ctx.stroke();
    
    // Dibujar las abejas
    if (foodSources.length > 0) {
        // Dibujar todas las abejas
        ctx.fillStyle = 'rgba(230, 126, 34, 0.7)';
        for (const source of foodSources) {
            drawBee(source, range, func, false);
        }
        
        // Dibujar la mejor abeja con estilo diferente
        if (bestSolution.length > 0) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
            drawBee(bestSolution, range, func, true);
        }
    }
}

function drawBee(source, range, func, isBest) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 70;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    const minY = getMinY(range, func);
    const maxY = getMaxY(range, func);
    
    const screenX = padding + ((source[0] - range[0]) / (range[1] - range[0])) * graphWidth;
    const y = func(source);
    const screenY = height - padding - ((y - minY) / (maxY - minY)) * graphHeight;
    
    // Línea al eje X
    ctx.strokeStyle = isBest ? 'rgba(231, 76, 60, 0.3)' : 'rgba(230, 126, 34, 0.2)';
    ctx.beginPath();
    ctx.moveTo(screenX, height - padding);
    ctx.lineTo(screenX, screenY);
    ctx.stroke();
    
    // Punto de la abeja
    ctx.beginPath();
    ctx.arc(screenX, screenY, isBest ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = isBest ? 2 : 1;
    ctx.stroke();
}

// Funciones auxiliares
function getMinY(range, func) {
    let min = Infinity;
    const step = (range[1] - range[0]) / 100;
    for (let x = range[0]; x <= range[1]; x += step) {
        min = Math.min(min, func([x]));
    }
    return min;
}

function getMaxY(range, func) {
    let max = -Infinity;
    const step = (range[1] - range[0]) / 100;
    for (let x = range[0]; x <= range[1]; x += step) {
        max = Math.max(max, func([x]));
    }
    return max;
}

function generateNeighbor(x, range) {
    if (Array.isArray(x)) {
        return x.map(val => {
            const newVal = val + (Math.random() * 2 - 1) * 0.5;
            return Math.max(range[0], Math.min(range[1], newVal));
        });
    }
    const newX = x + (Math.random() * 2 - 1) * 0.5;
    return Math.max(range[0], Math.min(range[1], newX));
}

// Algoritmo ABC
function runABC() {
    if (isRunning) return;
    
    resetAlgorithmState();
    startTime = performance.now();
    isRunning = true;
    runBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = true;
    
    // Obtener parámetros
    const beeCount = parseInt(document.getElementById('beeCount').value);
    maxIterations = parseInt(document.getElementById('maxIterations').value);
    const limit = parseInt(document.getElementById('limit').value);
    const rangeMin = parseFloat(document.getElementById('rangeMin').value);
    const rangeMax = parseFloat(document.getElementById('rangeMax').value);
    const range = [rangeMin, rangeMax];
    const funcName = document.getElementById('function').value;
    const func = functions[funcName];
    const is2D = funcName === 'rosenbrock';
    
    // Inicialización
    if (is2D) {
        foodSources = Array.from({length: beeCount}, () => [
            Math.random() * (rangeMax - rangeMin) + rangeMin,
            Math.random() * (rangeMax - rangeMin) + rangeMin
        ]);
    } else {
        foodSources = Array.from({length: beeCount}, () => 
            [Math.random() * (rangeMax - rangeMin) + rangeMin]
        );
    }
    
    fitnessValues = foodSources.map(source => func(source));
    trialCounters = Array(beeCount).fill(0);
    bestSolution = [...foodSources[0]];
    bestFitness = fitnessValues[0];
    iteration = 0;
    
    // Iniciar iteración
    updateUI();
    drawVisualization(foodSources, range, func);
    animationId = requestAnimationFrame(() => abcIteration(range, func, is2D, limit, beeCount));
}

function abcIteration(range, func, is2D, limit, beeCount) {
    if (!isRunning || iteration >= maxIterations) {
        stopABC();
        return;
    }
    
    iteration++;
    
    // Fase de abejas empleadas
    for (let i = 0; i < beeCount; i++) {
        const neighbor = generateNeighbor(foodSources[i], range);
        const neighborFitness = func(neighbor);
        
        if (neighborFitness < fitnessValues[i]) {
            foodSources[i] = neighbor;
            fitnessValues[i] = neighborFitness;
            trialCounters[i] = 0;
            
            if (fitnessValues[i] < bestFitness) {
                bestSolution = [...foodSources[i]];
                bestFitness = fitnessValues[i];
            }
        } else {
            trialCounters[i]++;
        }
    }
    
    // Fase de abejas observadoras
    const fitnessTotal = fitnessValues.reduce((sum, f) => sum + f, 0);
    const probabilities = fitnessValues.map(f => (1 - (f / fitnessTotal)));
    const probSum = probabilities.reduce((sum, p) => sum + p, 0);
    const normalizedProb = probabilities.map(p => p / probSum);
    
    for (let i = 0; i < beeCount; i++) {
        let rand = Math.random();
        let selectedIndex = 0;
        let sumProb = normalizedProb[0];
        
        while (rand > sumProb && selectedIndex < beeCount - 1) {
            selectedIndex++;
            sumProb += normalizedProb[selectedIndex];
        }
        
        const neighbor = generateNeighbor(foodSources[selectedIndex], range);
        const neighborFitness = func(neighbor);
        
        if (neighborFitness < fitnessValues[selectedIndex]) {
            foodSources[selectedIndex] = neighbor;
            fitnessValues[selectedIndex] = neighborFitness;
            trialCounters[selectedIndex] = 0;
            
            if (fitnessValues[selectedIndex] < bestFitness) {
                bestSolution = [...foodSources[selectedIndex]];
                bestFitness = fitnessValues[selectedIndex];
            }
        } else {
            trialCounters[selectedIndex]++;
        }
    }
    
    // Fase de abejas exploradoras
    for (let i = 0; i < beeCount; i++) {
        if (trialCounters[i] >= limit) {
            if (is2D) {
                foodSources[i] = [
                    Math.random() * (rangeMax - rangeMin) + rangeMin,
                    Math.random() * (rangeMax - rangeMin) + rangeMin
                ];
            } else {
                foodSources[i] = [Math.random() * (rangeMax - rangeMin) + rangeMin];
            }
            fitnessValues[i] = func(foodSources[i]);
            trialCounters[i] = 0;
            
            if (fitnessValues[i] < bestFitness) {
                bestSolution = [...foodSources[i]];
                bestFitness = fitnessValues[i];
            }
        }
    }
    
    // Actualizar UI
    updateUI();
    drawVisualization(foodSources, range, func);
    
    // Continuar iteración
    animationId = requestAnimationFrame(() => abcIteration(range, func, is2D, limit, beeCount));
}

function stopABC() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    runBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = false;
    
    // Actualizar tiempo de ejecución
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    executionTimeEl.textContent = `${executionTime.toFixed(2)}s`;
}

function updateUI() {
    const progressValue = (iteration / maxIterations) * 100;
    progress.value = progressValue;
    progressText.textContent = `${Math.round(progressValue)}%`;
    
    const funcName = document.getElementById('function').value;
    const is2D = funcName === 'rosenbrock';
    
    bestSolutionEl.textContent = is2D 
        ? `x = ${bestSolution[0].toFixed(4)}, y = ${bestSolution[1].toFixed(4)}`
        : `x = ${bestSolution[0].toFixed(4)}`;
    
    bestFitnessEl.textContent = bestFitness.toFixed(6);
    currentIterationEl.textContent = `${iteration}/${maxIterations}`;
}

// Event listeners
runBtn.addEventListener('click', runABC);
stopBtn.addEventListener('click', stopABC);
resetBtn.addEventListener('click', resetSimulation);
window.addEventListener('load', initCanvas);
window.addEventListener('resize', initCanvas);

// Inicialización
resetSimulation();