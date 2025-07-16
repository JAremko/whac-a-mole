#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const DEBUG_PORT = process.env.DEBUG_PORT || 8001;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Timestamp function
function timestamp() {
    return new Date().toISOString().replace('T', ' ').substr(0, 19);
}

// Log with color
function log(type, message, data = null) {
    const typeColors = {
        'ERROR': colors.red,
        'SERIAL_SEND': colors.green,
        'SERIAL_RECV': colors.blue,
        'CONSOLE': colors.yellow,
        'INFO': colors.cyan,
        'COMMAND': colors.magenta
    };
    
    const color = typeColors[type] || colors.reset;
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${color}${colors.bright}[${type}]${colors.reset} ${message}`);
    
    if (data) {
        console.log(`${colors.dim}Data:${colors.reset}`, JSON.stringify(data, null, 2));
    }
}

// Debug server to receive logs from frontend
const debugServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                switch(data.type) {
                    case 'error':
                        log('ERROR', data.message, data.data);
                        break;
                    case 'serial_send':
                        log('SERIAL_SEND', `Command: ${data.message}`, data.data);
                        break;
                    case 'serial_recv':
                        log('SERIAL_RECV', 'Received data', data.data);
                        break;
                    case 'console':
                        log('CONSOLE', `console.${data.level}: ${data.message}`, data.data);
                        break;
                    case 'command_chain':
                        log('COMMAND', `Executing chain: ${data.message}`, data.data);
                        break;
                    default:
                        log('INFO', data.message, data.data);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (error) {
                console.error('Failed to parse log data:', error);
                res.writeHead(400);
                res.end();
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Main file server
const fileServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // Default to index.html
    if (pathname.endsWith('/')) {
        pathname = path.join(pathname, 'index.html');
    }
    
    fs.exists(pathname, exist => {
        if (!exist) {
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }
        
        // Read file
        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                // Set content type
                const ext = path.parse(pathname).ext;
                res.setHeader('Content-type', mimeTypes[ext] || 'text/plain');
                res.end(data);
            }
        });
    });
});

// Start servers
debugServer.listen(DEBUG_PORT, () => {
    log('INFO', `Debug server listening on port ${DEBUG_PORT}`);
});

fileServer.listen(PORT, () => {
    log('INFO', `File server listening on http://localhost:${PORT}`);
    log('INFO', 'Frontend will send debug logs to the debug server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('INFO', 'Shutting down servers...');
    debugServer.close();
    fileServer.close();
    process.exit(0);
});