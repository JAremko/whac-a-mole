// Debug logger that sends information to backend when running locally
export class DebugLogger {
    constructor() {
        this.debugEndpoint = 'http://localhost:8001/log';
        this.isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.queue = [];
        this.isOnline = false;
        
        if (this.isLocal) {
            this.checkBackendConnection();
            this.setupErrorHandlers();
            this.interceptConsole();
        }
    }
    
    async checkBackendConnection() {
        try {
            const response = await fetch(this.debugEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'info', message: 'Frontend connected' })
            });
            
            if (response.ok) {
                this.isOnline = true;
                console.log('Debug backend connected');
                
                // Send any queued messages
                while (this.queue.length > 0) {
                    const msg = this.queue.shift();
                    this.send(msg.type, msg.message, msg.data);
                }
            }
        } catch (error) {
            // Backend not available, operating in standalone mode
            this.isOnline = false;
            console.log('Debug backend not available, operating in standalone mode');
        }
    }
    
    setupErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.send('error', `${event.message}`, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? event.error.stack : null
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.send('error', `Unhandled Promise Rejection: ${event.reason}`, {
                reason: event.reason,
                promise: event.promise
            });
        });
    }
    
    interceptConsole() {
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        ['log', 'error', 'warn', 'info'].forEach(level => {
            console[level] = (...args) => {
                // Call original console method
                originalConsole[level].apply(console, args);
                
                // Send to backend
                this.send('console', args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '), { level });
            };
        });
    }
    
    send(type, message, data = null) {
        if (!this.isLocal) return;
        
        const logData = {
            type,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        
        if (!this.isOnline) {
            this.queue.push(logData);
            return;
        }
        
        // Send to backend, but don't await to avoid blocking
        fetch(this.debugEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        }).catch(() => {
            // If send fails, mark as offline and queue future messages
            this.isOnline = false;
            this.queue.push(logData);
        });
    }
    
    logSerialSend(command, data) {
        this.send('serial_send', command, {
            data: Array.from(data),
            hex: Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
        });
    }
    
    logSerialReceive(data) {
        this.send('serial_recv', 'Serial data received', {
            raw: data,
            length: data.length
        });
    }
    
    logCommandChain(buttonId, commands) {
        this.send('command_chain', buttonId, {
            commands: commands.map(cmd => cmd.command || `delay: ${cmd.delay}ms`)
        });
    }
}

// Create singleton instance
export const debugLogger = new DebugLogger();