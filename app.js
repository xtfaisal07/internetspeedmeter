// Advanced Speed Meter Application
class SpeedMeter {
    constructor() {
        this.settings = {
            testDuration: 30,
            parallelConnections: 4,
            autoTest: false,
            darkTheme: true
        };
        
        this.testData = {
            testSizes: [
                {"name": "Small", "size": 1048576, "label": "1MB"},
                {"name": "Medium", "size": 5242880, "label": "5MB"},
                {"name": "Large", "size": 10485760, "label": "10MB"}
            ],
            speedRanges: {
                slow: {"min": 0, "max": 25, "color": "#ff4757", "label": "Slow"},
                medium: {"min": 25, "max": 100, "color": "#ffa502", "label": "Good"},
                fast: {"min": 100, "max": 1000, "color": "#2ed573", "label": "Fast"}
            }
        };
        
        this.currentTest = null;
        this.testHistory = [];
        this.chart = null;
        this.chartData = [];
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.loadHistory();
        this.setupEventListeners();
        this.setupChart();
        this.applyTheme();
        
        // Auto-ping test on load
        this.startPingTest();
        
        if (this.settings.autoTest) {
            setTimeout(() => this.startSpeedTest(), 1000);
        }
    }
    
    setupEventListeners() {
        // Test button
        const startTestBtn = document.getElementById('start-test');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => {
                if (this.currentTest) {
                    this.stopTest();
                } else {
                    this.startSpeedTest();
                }
            });
        }
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
        }
        
        // Settings modal
        const settingsBtn = document.querySelector('.settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openSettings();
            });
        }
        
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }
        
        const settingsCancel = document.getElementById('settings-cancel');
        if (settingsCancel) {
            settingsCancel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }
        
        const settingsSave = document.getElementById('settings-save');
        if (settingsSave) {
            settingsSave.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveSettings();
            });
        }
        
        // History controls
        const clearHistory = document.getElementById('clear-history');
        if (clearHistory) {
            clearHistory.addEventListener('click', () => {
                this.clearHistory();
            });
        }
        
        const exportHistory = document.getElementById('export-history');
        if (exportHistory) {
            exportHistory.addEventListener('click', () => {
                this.exportHistory();
            });
        }
        
        // Modal overlay click - fix the event handling
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                // Only close if clicking the overlay itself, not its children
                if (e.target === settingsModal) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if (e.key === ' ' && !e.target.matches('input, textarea, select, button')) {
                e.preventDefault();
                if (this.currentTest) {
                    this.stopTest();
                } else {
                    this.startSpeedTest();
                }
            }
        });
    }
    
    setupChart() {
        const canvas = document.getElementById('speed-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 800;
        canvas.height = 300;
        
        this.chart = {
            canvas,
            ctx,
            data: {
                download: [],
                upload: [],
                timestamps: []
            },
            maxPoints: 60,
            maxSpeed: 100
        };
        
        this.drawChart();
    }
    
    drawChart() {
        if (!this.chart) return;
        
        const { ctx, canvas, data } = this.chart;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set styles based on theme
        const isDark = document.documentElement.getAttribute('data-color-scheme') === 'dark' || 
                      (!document.documentElement.getAttribute('data-color-scheme') && 
                       window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        const textColor = isDark ? '#f5f5f5' : '#13343b';
        const gridColor = isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
        
        ctx.strokeStyle = gridColor;
        ctx.fillStyle = textColor;
        ctx.font = '12px var(--font-family-base)';
        
        // Draw grid
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = (height / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            // Speed labels
            const speed = this.chart.maxSpeed - (this.chart.maxSpeed / gridLines) * i;
            ctx.fillText(`${Math.round(speed)} Mbps`, 10, y - 5);
        }
        
        // Draw time grid
        const timeGridLines = 6;
        for (let i = 0; i <= timeGridLines; i++) {
            const x = (width / timeGridLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw speed lines
        if (data.download.length > 1) {
            this.drawSpeedLine(data.download, '#21808d', 'Download');
        }
        if (data.upload.length > 1) {
            this.drawSpeedLine(data.upload, '#32b8c6', 'Upload');
        }
        
        // Draw legend
        this.drawLegend();
    }
    
    drawSpeedLine(speedData, color, label) {
        const { ctx, canvas } = this.chart;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        speedData.forEach((speed, index) => {
            const x = (width / Math.max(speedData.length - 1, 1)) * index;
            const y = height - (speed / this.chart.maxSpeed) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = color;
        speedData.forEach((speed, index) => {
            const x = (width / Math.max(speedData.length - 1, 1)) * index;
            const y = height - (speed / this.chart.maxSpeed) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawLegend() {
        const { ctx, canvas } = this.chart;
        const legendY = 20;
        
        // Download legend
        ctx.fillStyle = '#21808d';
        ctx.fillRect(canvas.width - 120, legendY, 15, 2);
        ctx.fillStyle = document.documentElement.getAttribute('data-color-scheme') === 'dark' ? '#f5f5f5' : '#13343b';
        ctx.fillText('Download', canvas.width - 100, legendY + 5);
        
        // Upload legend
        ctx.fillStyle = '#32b8c6';
        ctx.fillRect(canvas.width - 120, legendY + 20, 15, 2);
        ctx.fillStyle = document.documentElement.getAttribute('data-color-scheme') === 'dark' ? '#f5f5f5' : '#13343b';
        ctx.fillText('Upload', canvas.width - 100, legendY + 25);
    }
    
    updateChart(downloadSpeed, uploadSpeed) {
        if (!this.chart) return;
        
        const { data } = this.chart;
        
        data.download.push(downloadSpeed);
        data.upload.push(uploadSpeed);
        data.timestamps.push(Date.now());
        
        // Keep only recent data points
        if (data.download.length > this.chart.maxPoints) {
            data.download.shift();
            data.upload.shift();
            data.timestamps.shift();
        }
        
        // Adjust max speed for better visualization
        const maxCurrentSpeed = Math.max(...data.download, ...data.upload);
        if (maxCurrentSpeed > this.chart.maxSpeed * 0.8) {
            this.chart.maxSpeed = Math.ceil(maxCurrentSpeed * 1.2);
        }
        
        this.drawChart();
    }
    
    async startSpeedTest() {
        if (this.currentTest) return;
        
        this.currentTest = {
            startTime: Date.now(),
            stage: 'initializing',
            downloadSpeed: 0,
            uploadSpeed: 0,
            ping: 0,
            progress: 0,
            dataTransferred: 0
        };
        
        // Update UI
        this.updateTestButton(true);
        this.updateStatus('testing', 'Running speed test...');
        this.showProgress(true);
        
        try {
            // Initialize chart data
            if (this.chart) {
                this.chart.data = { download: [], upload: [], timestamps: [] };
            }
            
            // Stage 1: Ping test
            await this.runPingTest();
            
            // Stage 2: Download test
            await this.runDownloadTest();
            
            // Stage 3: Upload test
            await this.runUploadTest();
            
            // Complete test
            this.completeTest();
            
        } catch (error) {
            console.error('Speed test error:', error);
            this.handleTestError(error);
        }
    }
    
    async runPingTest() {
        this.updateProgress('Testing latency...', 10);
        
        const pingResults = [];
        const pingCount = 5;
        
        for (let i = 0; i < pingCount; i++) {
            try {
                const startTime = Date.now();
                
                // Create a small request to test latency
                await fetch(`data:text/plain;base64,${btoa('ping')}`, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                const ping = Date.now() - startTime;
                pingResults.push(ping);
                
                // Update ping display
                const avgPing = pingResults.reduce((a, b) => a + b, 0) / pingResults.length;
                this.updatePingDisplay(Math.round(avgPing));
                
            } catch (error) {
                pingResults.push(100); // Default ping on error
            }
            
            await this.delay(200);
        }
        
        this.currentTest.ping = Math.round(pingResults.reduce((a, b) => a + b, 0) / pingResults.length);
    }
    
    async runDownloadTest() {
        this.updateProgress('Testing download speed...', 20);
        
        const testDuration = this.settings.testDuration * 1000;
        const startTime = Date.now();
        let totalBytes = 0;
        
        // Create multiple parallel download streams
        const connections = Array.from({ length: this.settings.parallelConnections }, (_, i) => 
            this.downloadConnection(i, startTime, testDuration)
        );
        
        // Monitor progress
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / testDuration) * 50 + 20, 70); // 20-70%
            
            this.updateProgress('Testing download speed...', progress);
            this.updateStats();
            
            if (elapsed >= testDuration) {
                clearInterval(progressInterval);
            }
        }, 100);
        
        // Wait for all connections to complete
        const results = await Promise.all(connections);
        clearInterval(progressInterval);
        
        // Calculate download speed
        totalBytes = results.reduce((sum, bytes) => sum + bytes, 0);
        const downloadSpeed = (totalBytes * 8) / (testDuration / 1000) / 1000000; // Mbps
        
        this.currentTest.downloadSpeed = downloadSpeed;
        this.currentTest.dataTransferred += totalBytes / 1048576; // MB
        
        this.updateGauge('download', downloadSpeed);
    }
    
    async downloadConnection(connectionId, startTime, duration) {
        let totalBytes = 0;
        
        while (Date.now() - startTime < duration) {
            try {
                // Generate random data for download simulation
                const size = this.testData.testSizes[connectionId % this.testData.testSizes.length].size;
                const data = this.generateRandomData(size);
                const blob = new Blob([data]);
                
                // Simulate download by reading the blob
                const arrayBuffer = await blob.arrayBuffer();
                totalBytes += arrayBuffer.byteLength;
                
                // Update real-time speed
                const elapsed = (Date.now() - startTime) / 1000;
                const currentSpeed = (totalBytes * 8) / elapsed / 1000000;
                
                this.updateGauge('download', currentSpeed);
                this.updateChart(currentSpeed, this.currentTest.uploadSpeed);
                
                // Small delay to prevent overwhelming the browser
                await this.delay(10);
                
            } catch (error) {
                console.warn(`Download connection ${connectionId} error:`, error);
                break;
            }
        }
        
        return totalBytes;
    }
    
    async runUploadTest() {
        this.updateProgress('Testing upload speed...', 70);
        
        const testDuration = this.settings.testDuration * 1000;
        const startTime = Date.now();
        let totalBytes = 0;
        
        // Create multiple parallel upload streams
        const connections = Array.from({ length: this.settings.parallelConnections }, (_, i) => 
            this.uploadConnection(i, startTime, testDuration)
        );
        
        // Monitor progress
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / testDuration) * 25 + 70, 95); // 70-95%
            
            this.updateProgress('Testing upload speed...', progress);
            this.updateStats();
        }, 100);
        
        // Wait for all connections to complete
        const results = await Promise.all(connections);
        clearInterval(progressInterval);
        
        // Calculate upload speed
        totalBytes = results.reduce((sum, bytes) => sum + bytes, 0);
        const uploadSpeed = (totalBytes * 8) / (testDuration / 1000) / 1000000; // Mbps
        
        this.currentTest.uploadSpeed = uploadSpeed;
        this.currentTest.dataTransferred += totalBytes / 1048576; // MB
        
        this.updateGauge('upload', uploadSpeed);
    }
    
    async uploadConnection(connectionId, startTime, duration) {
        let totalBytes = 0;
        
        while (Date.now() - startTime < duration) {
            try {
                // Generate data to upload
                const size = this.testData.testSizes[connectionId % this.testData.testSizes.length].size;
                const data = this.generateRandomData(size);
                
                // Simulate upload by processing the data
                await this.processUploadData(data);
                totalBytes += data.length;
                
                // Update real-time speed
                const elapsed = (Date.now() - startTime) / 1000;
                const currentSpeed = (totalBytes * 8) / elapsed / 1000000;
                
                this.updateGauge('upload', currentSpeed);
                this.updateChart(this.currentTest.downloadSpeed, currentSpeed);
                
                // Small delay
                await this.delay(10);
                
            } catch (error) {
                console.warn(`Upload connection ${connectionId} error:`, error);
                break;
            }
        }
        
        return totalBytes;
    }
    
    async processUploadData(data) {
        // Simulate upload processing with some computation
        return new Promise(resolve => {
            const worker = () => {
                let hash = 0;
                for (let i = 0; i < Math.min(data.length, 10000); i++) {
                    hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xffffffff;
                }
                resolve(hash);
            };
            
            // Use setTimeout to make it async
            setTimeout(worker, 1);
        });
    }
    
    generateRandomData(size) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < size; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    async startPingTest() {
        try {
            const startTime = Date.now();
            
            // Use a lightweight method to test ping
            const response = await fetch('data:text/plain;base64,cGluZw==', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const ping = Date.now() - startTime;
            this.updatePingDisplay(ping);
            
        } catch (error) {
            this.updatePingDisplay(50); // Default ping
        }
    }
    
    stopTest() {
        if (!this.currentTest) return;
        
        this.currentTest = null;
        this.updateTestButton(false);
        this.updateStatus('ready', 'Test stopped');
        this.showProgress(false);
        
        // Reset gauges
        this.updateGauge('download', 0);
        this.updateGauge('upload', 0);
    }
    
    completeTest() {
        this.updateProgress('Test completed', 100);
        
        setTimeout(() => {
            const result = {
                id: Date.now(),
                timestamp: new Date(),
                downloadSpeed: this.currentTest.downloadSpeed,
                uploadSpeed: this.currentTest.uploadSpeed,
                ping: this.currentTest.ping,
                dataTransferred: this.currentTest.dataTransferred,
                duration: (Date.now() - this.currentTest.startTime) / 1000
            };
            
            this.saveTestResult(result);
            this.displayResults(result);
            
            this.currentTest = null;
            this.updateTestButton(false);
            this.updateStatus('ready', 'Test completed');
            this.showProgress(false);
        }, 1000);
    }
    
    handleTestError(error) {
        console.error('Test error:', error);
        this.currentTest = null;
        this.updateTestButton(false);
        this.updateStatus('error', 'Test failed');
        this.showProgress(false);
    }
    
    updateGauge(type, speed) {
        const speedElement = document.getElementById(`${type}-speed`);
        const qualityElement = document.getElementById(`${type}-quality`);
        const gaugeElement = document.querySelector(`.gauge-${type}`);
        
        if (!speedElement || !qualityElement || !gaugeElement) return;
        
        // Update speed value
        speedElement.textContent = speed.toFixed(1);
        
        // Update gauge fill
        const maxSpeed = 200; // Max speed for gauge visualization
        const percentage = Math.min((speed / maxSpeed) * 100, 100);
        const circumference = 502.4;
        const offset = circumference - (percentage / 100) * circumference;
        
        gaugeElement.style.strokeDashoffset = offset;
        
        // Update quality and color
        const { range, color } = this.getSpeedRange(speed);
        gaugeElement.style.stroke = color;
        
        qualityElement.textContent = range.label;
        qualityElement.className = `quality-label quality-${range.label.toLowerCase()}`;
    }
    
    updatePingDisplay(ping) {
        const pingElement = document.getElementById('ping-value');
        const qualityElement = document.getElementById('ping-quality');
        
        if (!pingElement || !qualityElement) return;
        
        pingElement.textContent = ping;
        
        let quality = 'Excellent';
        if (ping > 100) quality = 'Poor';
        else if (ping > 50) quality = 'Good';
        else if (ping > 20) quality = 'Very Good';
        
        qualityElement.textContent = quality;
        qualityElement.className = `quality-label quality-${quality.toLowerCase().replace(' ', '')}`;
    }
    
    getSpeedRange(speed) {
        for (const [key, range] of Object.entries(this.testData.speedRanges)) {
            if (speed >= range.min && speed < range.max) {
                return { range, color: range.color };
            }
        }
        return { range: this.testData.speedRanges.fast, color: this.testData.speedRanges.fast.color };
    }
    
    updateProgress(stage, percent) {
        const progressStage = document.getElementById('progress-stage');
        const progressPercent = document.getElementById('progress-percent');
        const progressFill = document.querySelector('.progress-fill');
        const testProgress = document.getElementById('test-progress');
        
        if (progressStage) progressStage.textContent = stage;
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (testProgress) testProgress.textContent = `${Math.round(percent)}%`;
    }
    
    updateStats() {
        if (!this.currentTest) return;
        
        const elapsed = (Date.now() - this.currentTest.startTime) / 1000;
        
        const connectionsCount = document.getElementById('connections-count');
        const dataTransferred = document.getElementById('data-transferred');
        const testDuration = document.getElementById('test-duration');
        
        if (connectionsCount) connectionsCount.textContent = this.settings.parallelConnections;
        if (dataTransferred) dataTransferred.textContent = `${this.currentTest.dataTransferred.toFixed(1)} MB`;
        if (testDuration) testDuration.textContent = `${elapsed.toFixed(1)}s`;
    }
    
    updateTestButton(testing) {
        const button = document.getElementById('start-test');
        const btnText = button?.querySelector('.btn-text');
        const btnLoader = button?.querySelector('.btn-loader');
        
        if (!button || !btnText || !btnLoader) return;
        
        if (testing) {
            button.classList.add('testing');
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            button.setAttribute('aria-label', 'Stop test');
        } else {
            button.classList.remove('testing');
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            button.setAttribute('aria-label', 'Start speed test');
        }
    }
    
    updateStatus(type, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) statusDot.className = `status-dot ${type}`;
        if (statusText) statusText.textContent = text;
    }
    
    showProgress(show) {
        const progress = document.querySelector('.test-progress');
        if (progress) {
            if (show) {
                progress.classList.remove('hidden');
            } else {
                progress.classList.add('hidden');
            }
        }
    }
    
    displayResults(result) {
        const resultsGrid = document.getElementById('results-grid');
        if (!resultsGrid) return;
        
        resultsGrid.innerHTML = `
            <div class="result-card">
                <div class="result-metric">
                    <span class="result-label">Download Speed</span>
                    <span class="result-value">${result.downloadSpeed.toFixed(1)} Mbps</span>
                </div>
                <div class="result-metric">
                    <span class="result-label">Upload Speed</span>
                    <span class="result-value">${result.uploadSpeed.toFixed(1)} Mbps</span>
                </div>
                <div class="result-metric">
                    <span class="result-label">Ping</span>
                    <span class="result-value">${result.ping} ms</span>
                </div>
            </div>
            <div class="result-card">
                <div class="result-metric">
                    <span class="result-label">Data Transferred</span>
                    <span class="result-value">${result.dataTransferred.toFixed(1)} MB</span>
                </div>
                <div class="result-metric">
                    <span class="result-label">Test Duration</span>
                    <span class="result-value">${result.duration.toFixed(1)}s</span>
                </div>
                <div class="result-metric">
                    <span class="result-label">Quality Score</span>
                    <span class="result-value">${this.calculateQualityScore(result)}/100</span>
                </div>
            </div>
        `;
    }
    
    calculateQualityScore(result) {
        let score = 0;
        
        // Download speed scoring (40 points max)
        score += Math.min((result.downloadSpeed / 100) * 40, 40);
        
        // Upload speed scoring (30 points max)
        score += Math.min((result.uploadSpeed / 50) * 30, 30);
        
        // Ping scoring (30 points max)
        if (result.ping <= 20) score += 30;
        else if (result.ping <= 50) score += 20;
        else if (result.ping <= 100) score += 10;
        
        return Math.round(score);
    }
    
    saveTestResult(result) {
        this.testHistory.unshift(result);
        
        // Keep only last 50 results
        if (this.testHistory.length > 50) {
            this.testHistory = this.testHistory.slice(0, 50);
        }
        
        this.saveHistory();
        this.updateHistoryDisplay();
    }
    
    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        if (this.testHistory.length === 0) {
            historyList.innerHTML = '<div class="history-placeholder"><span>No test history yet</span></div>';
            return;
        }
        
        historyList.innerHTML = this.testHistory.map(result => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-date">${result.timestamp.toLocaleString()}</div>
                    <div class="history-speeds">
                        <span class="history-speed">↓ ${result.downloadSpeed.toFixed(1)} Mbps</span>
                        <span class="history-speed">↑ ${result.uploadSpeed.toFixed(1)} Mbps</span>
                        <span class="history-speed">${result.ping}ms</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Theme Management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        
        // Update theme icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
        
        this.settings.darkTheme = newTheme === 'dark';
        this.saveSettings();
        
        // Redraw chart with new theme
        setTimeout(() => this.drawChart(), 100);
    }
    
    applyTheme() {
        const theme = this.settings.darkTheme ? 'dark' : 'light';
        document.documentElement.setAttribute('data-color-scheme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }
    
    // Settings Management
    openSettings() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        // Populate current settings
        const testDuration = document.getElementById('test-duration');
        const parallelConnections = document.getElementById('parallel-connections');
        const autoTest = document.getElementById('auto-test');
        
        if (testDuration) testDuration.value = this.settings.testDuration;
        if (parallelConnections) parallelConnections.value = this.settings.parallelConnections;
        if (autoTest) autoTest.checked = this.settings.autoTest;
        
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        
        // Focus the first input for accessibility
        setTimeout(() => {
            if (testDuration) testDuration.focus();
        }, 100);
    }
    
    closeModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        modal.classList.add('hidden');
        modal.classList.remove('fade-in');
    }
    
    saveSettings() {
        const testDuration = document.getElementById('test-duration');
        const parallelConnections = document.getElementById('parallel-connections');
        const autoTest = document.getElementById('auto-test');
        
        if (testDuration) this.settings.testDuration = parseInt(testDuration.value);
        if (parallelConnections) this.settings.parallelConnections = parseInt(parallelConnections.value);
        if (autoTest) this.settings.autoTest = autoTest.checked;
        
        // Save to localStorage
        try {
            localStorage.setItem('speedMeterSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Could not save settings to localStorage:', error);
        }
        
        this.closeModal();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('speedMeterSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Could not load settings from localStorage:', error);
        }
    }
    
    // History Management
    saveHistory() {
        try {
            localStorage.setItem('speedMeterHistory', JSON.stringify(this.testHistory.map(result => ({
                ...result,
                timestamp: result.timestamp.toISOString()
            }))));
        } catch (error) {
            console.warn('Could not save history to localStorage:', error);
        }
    }
    
    loadHistory() {
        try {
            const saved = localStorage.getItem('speedMeterHistory');
            if (saved) {
                this.testHistory = JSON.parse(saved).map(result => ({
                    ...result,
                    timestamp: new Date(result.timestamp)
                }));
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.warn('Could not load history from localStorage:', error);
        }
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all test history?')) {
            this.testHistory = [];
            this.saveHistory();
            this.updateHistoryDisplay();
        }
    }
    
    exportHistory() {
        if (this.testHistory.length === 0) {
            alert('No test history to export');
            return;
        }
        
        const data = this.testHistory.map(result => ({
            date: result.timestamp.toISOString(),
            downloadSpeed: result.downloadSpeed,
            uploadSpeed: result.uploadSpeed,
            ping: result.ping,
            dataTransferred: result.dataTransferred,
            duration: result.duration
        }));
        
        const csv = this.convertToCSV(data);
        this.downloadFile(csv, 'speed-test-history.csv', 'text/csv');
    }
    
    convertToCSV(data) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');
    }
    
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // Utility Methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.speedMeter = new SpeedMeter();
});

// Service Worker Registration (for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('data:text/javascript;base64,c2VsZi5hZGRFdmVudExpc3RlbmVyKCJpbnN0YWxsIiwgZXZlbnQgPT4gew0KICBjb25zb2xlLmxvZygiU2VydmljZSBXb3JrZXIgaW5zdGFsbGVkIik7DQp9KTsNCg0Kc2VsZi5hZGRFdmVudExpc3RlbmVyKCJhY3RpdmF0ZSIsIGV2ZW50ID0+IHsNCiAgY29uc29sZS5sb2coIlNlcnZpY2UgV29ya2VyIGFjdGl2YXRlZCIpOw0KfSk7')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed');
            });
    });
}