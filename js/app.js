/**
 * Blood Group Predictor - Main App logic
 */

const BLOODGROUP_CONFIG = window.BLOODGROUP_CONFIG || {};
const APP_API_BASE = (BLOODGROUP_CONFIG.appApiBase || "").replace(/\/$/, "");

function getAppApiUrl(endpoint) {
    return APP_API_BASE ? `${APP_API_BASE}/${endpoint}` : `api/${endpoint}`;
}

const APP = {
    chart: null,

    init: async function() {
        console.log('App initializing...');
        this.bindEvents();
        this.initTabs();
        await this.loadHistory();
    },

    initTabs: function() {
        const tabGenetics = document.getElementById('tabGenetics');
        const tabClinical = document.getElementById('tabClinical');
        const geneticsSection = document.getElementById('geneticsSection');
        const clinicalSection = document.getElementById('clinicalSection');

        tabGenetics.addEventListener('click', () => {
            tabGenetics.classList.add('active');
            tabClinical.classList.remove('active');
            geneticsSection.style.display = 'block';
            clinicalSection.style.display = 'none';
        });

        tabClinical.addEventListener('click', () => {
            tabClinical.classList.add('active');
            tabGenetics.classList.remove('active');
            clinicalSection.style.display = 'block';
            geneticsSection.style.display = 'none';
        });
    },

    bindEvents: function() {
        document.getElementById('calculateBtn').addEventListener('click', () => this.handleCalculate());
        document.getElementById('checkCompatibilityBtn').addEventListener('click', () => this.handleClinicalCalculate());
    },

    handleCalculate: async function() {
        const p1Raw = document.getElementById('parent1').value;
        const p2Raw = document.getElementById('parent2').value;

        const p1Abo = p1Raw.substring(0, p1Raw.length - 1);
        const rh1 = p1Raw.substring(p1Raw.length - 1);
        const p2Abo = p2Raw.substring(0, p2Raw.length - 1);
        const rh2 = p2Raw.substring(p2Raw.length - 1);

        let data = null;
        let results;
        let limit = 50;

        try {
            const response = await fetch(getAppApiUrl('calculate.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent1: p1Raw, parent2: p2Raw })
            });

            if (response.status === 503) {
                data = await response.json();
                alert(data.error);
                return;
            }

            data = await response.json();
            if (!data.success) {
                throw new Error('API Error');
            }

            results = data.results;
            limit = (data.settings && data.settings.max_history) ? parseInt(data.settings.max_history, 10) : 50;
            console.log('Result from PHP API');
        } catch (err) {
            console.log('Using local genetics engine (offline or backend unavailable)');
            results = GENETICS.calculate(p1Abo, rh1, p2Abo, rh2);
        }

        this.displayResults(results);

        if (data && data.genetic_analysis) {
            this.displayAnalysis(data.genetic_analysis);
        } else {
            document.getElementById('analysisSection').style.display = 'none';
        }

        await DB.saveCalculation({
            parent1: p1Raw,
            parent2: p2Raw,
            results: results,
            timestamp: Date.now()
        }, limit);

        this.loadHistory();
    },

    handleClinicalCalculate: function() {
        const p1 = document.getElementById('personA').value;
        const p2 = document.getElementById('personB').value;

        const analysis = CLINICAL.analyze(p1, p2);
        this.displayClinicalResults(analysis);
    },

    displayClinicalResults: function(analysis) {
        const resultDiv = document.getElementById('clinicalResult');
        const statusCard = document.getElementById('compatibilityStatus');
        const icon = document.getElementById('statusIcon');
        const title = document.getElementById('statusTitle');
        const subtitle = document.getElementById('statusSubtitle');
        const transfusion = document.getElementById('transfusionStatus');
        const pregnancy = document.getElementById('pregnancyStatus');
        const explanation = document.getElementById('clinicalExplanation');

        resultDiv.style.display = 'block';

        // Set Transfusion Status
        transfusion.innerText = analysis.transfusion.status;
        transfusion.style.color = analysis.transfusion.compatible ? '#27ae60' : '#e74c3c';

        // Set Pregnancy Status
        pregnancy.innerText = analysis.pregnancy.status;
        pregnancy.style.color = analysis.pregnancy.risk ? '#f1c40f' : '#27ae60';

        // Overall Status Styling
        statusCard.className = 'glass-card compatibility-status-card';
        if (analysis.transfusion.compatible && !analysis.pregnancy.risk) {
            statusCard.classList.add('status-compatible');
            icon.innerText = '✓';
            title.innerText = 'Highly Compatible';
            subtitle.innerText = 'Biological & clinical indicators are overall positive.';
        } else if (!analysis.transfusion.compatible) {
            statusCard.classList.add('status-incompatible');
            icon.innerText = '✕';
            title.innerText = 'Incompatible / High Risk';
            subtitle.innerText = 'Critical clinical warnings detected.';
        } else {
            statusCard.classList.add('status-warning');
            icon.innerText = '!';
            title.innerText = 'Compatible with Warnings';
            subtitle.innerText = 'Biological compatibility exists but requires medical attention.';
        }

        explanation.innerText = analysis.transfusion.explanation + '\n\n' + analysis.pregnancy.message;
        
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    },

    displayResults: function(results) {
        const resultSection = document.getElementById('resultSection');
        const resultList = document.getElementById('resultList');
        
        resultSection.style.display = 'block';
        resultList.innerHTML = '';

        results.forEach((res, index) => {
            const details = GENETICS.getDetails(res.group);
            const item = document.createElement('div');
            item.className = 'result-item';
            item.style.animationDelay = `${index * 0.1}s`;
            
            item.innerHTML = `
                <div class="blood-group-badge" style="background: ${this.getGroupColor(res.group)}">${res.group}</div>
                <div class="result-info">
                    <h3>${res.group} Blood Group</h3>
                    <p><strong>Pros:</strong> ${details.pros}</p>
                    <p><strong>Cons:</strong> ${details.cons}</p>
                    <p><em>${details.notes}</em></p>
                </div>
                <div class="probability-tag">${res.probability}%</div>
            `;
            resultList.appendChild(item);
        });

        this.renderChart(results);
        resultSection.scrollIntoView({ behavior: 'smooth' });
    },

    getGroupColor: function(group) {
        const colors = {
            'A+': '#27ae60', 'A-': '#2ecc71',
            'B+': '#2d98da', 'B-': '#3498db',
            'AB+': '#8e44ad', 'AB-': '#9b59b6',
            'O+': '#e67e22', 'O-': '#e74c3c'
        };
        return colors[group] || '#27ae60';
    },

    displayAnalysis: function(analysis) {
        const analysisSection = document.getElementById('analysisSection');
        const riskCard = document.getElementById('rhRiskCard');
        const riskBadge = document.getElementById('riskBadge');
        const riskMessage = document.getElementById('riskMessage');
        const aiContent = document.getElementById('aiInsightsContent');
        const genotypeList = document.getElementById('genotypeList');

        analysisSection.style.display = 'block';

        // 1. Rh Risk
        riskBadge.innerText = analysis.rh_risk.status;
        riskBadge.className = 'badge ' + (analysis.rh_risk.level === 'Red' ? 'risk' : 'safe');
        riskMessage.innerText = analysis.rh_risk.message;
        riskCard.style.borderLeftColor = analysis.rh_risk.level === 'Red' ? '#e74c3c' : '#27ae60';

        // 2. Genotype Breakdown
        genotypeList.innerHTML = '';
        analysis.genotypes.slice(0, 4).forEach(g => {
            const item = document.createElement('div');
            item.className = 'genotype-item';
            item.innerHTML = `
                <span class="genotype-val">${g.genotype}</span>
                <span class="genotype-pct">${g.probability}%</span>
            `;
            genotypeList.appendChild(item);
        });

        // 3. AI Insights
        if (analysis.ai_insights) {
            this.typeEffect(aiContent, analysis.ai_insights);
        } else {
            aiContent.innerHTML = "<p style='color: #64748b; font-style: italic;'>AI insights unavailable. Please check your Gemini API key configuration.</p>";
        }
    },

    typeEffect: function(element, text) {
        element.innerHTML = "";
        let i = 0;
        const speed = 5;
        function type() {
            if (i < text.length) {
                const char = text.charAt(i);
                if (char === "\n") {
                    element.appendChild(document.createElement("br"));
                } else {
                    element.appendChild(document.createTextNode(char));
                }
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    },

    renderChart: function(results) {
        const ctx = document.getElementById('probabilityChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = results.map(r => r.group);
        const data = results.map(r => r.probability);
        
        this.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#27ae60', '#2ecc71', '#2d98da', '#3498db', 
                        '#1abc9c', '#16a085', '#009432', '#A3CB38'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
                    }
                }
            }
        });
    },

    loadHistory: async function() {
        const history = await DB.getHistory();
        const historyGrid = document.getElementById('historyGrid');
        historyGrid.innerHTML = '';

        if (history.length === 0) {
            historyGrid.innerHTML = '<p style="color: var(--text-secondary);">No history yet. Start by predicting results!</p>';
            return;
        }

        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const card = document.createElement('div');
            card.className = 'glass-card history-card';
            
            // Show main result group
            const topResult = item.results[0].group;

            card.innerHTML = `
                <div class="meta">
                    <span>${date}</span>
                    <span style="color: var(--primary-color); font-weight: 700;">${topResult} (Likely)</span>
                </div>
                <p><strong>P1:</strong> ${item.parent1} | <strong>P2:</strong> ${item.parent2}</p>
                <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
                    ${item.results.map(r => `${r.group}: ${r.probability}%`).join(', ')}
                </div>
            `;
            historyGrid.appendChild(card);
        });
    }
};

// Start app
window.addEventListener('DOMContentLoaded', () => APP.init());
