# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based serial device control interface that uses the Web Serial API to communicate with hardware devices (likely thermal imaging equipment). It's a purely client-side web application with no build process or backend.

## Development Commands

**Quick Start with Make:**
```bash
make install  # Install dependencies
make          # Run debug server (logs everything to terminal)
make help     # Show all available commands
```

**Using npm:**
```bash
npm install   # Install dependencies
npm start     # Start development server
npm run dev   # Start server and open browser
```

**Alternative Servers (no debug logging):**
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve -p 8000 .
```

**Testing:** No automated tests. Manual testing with actual serial devices.

**Note on Secure Contexts:** The Web Serial API requires a secure context. For local development, `http://localhost` works fine. For production or network access, HTTPS is required.

## Architecture

### File Structure
- `index.html` - Main UI with Bulma CSS framework
- `serial.js` - Core logic for serial communication and UI management
- `commands.js` - Command definitions and button configurations (ES6 module)
- `server.js` - Node.js debug server for logging frontend activity
- `debug-logger.js` - Frontend module that sends logs to debug server
- `bulma.css` - CSS framework (vendored)
- `Makefile` - Simple build commands for Mac/Linux

### Key Components

1. **Serial Communication (serial.js)**
   - Connects at 115200 baud rate
   - Implements CRC16 checksum calculation
   - Handles command sending with proper byte sequences
   - Reader loop for device responses
   - Supports command chaining with delays

2. **Command System**
   - Commands defined in `commands.js` using hex literals (0x10, 0x02, etc.)
   - Separation of command definitions (hash map) and button configurations
   - Support for command chains with optional delays between commands
   - Each command has a data array with header/footer bytes and CRC placeholders

3. **State Management**
   - Tracks zoom levels: Wide, Middle, Narrow
   - Tracks color modes: White Hot, Black Hot
   - State changes modify command parameters

4. **Debug System (server.js + debug-logger.js)**
   - Node.js server serves files on port 8000
   - Debug endpoint on port 8001 receives logs from frontend
   - Captures all console output, errors, and serial communication
   - Color-coded terminal output for different log types
   - Only active when running on localhost

### Technical Details

- **Web Serial API**: Requires user permission, only works in secure contexts
- **CRC16 Implementation**: Uses lookup table for performance
- **Command Format**: Fixed header [0x10, 0x02], variable payload, fixed footer [0x10, 0x03, 0xE2, 0xD8]
- **Dynamic UI**: Buttons generated from button configurations with randomized colors
- **Command Chaining**: Buttons can execute multiple commands with delays
- **ES6 Modules**: Uses modern JavaScript module system

### Security Considerations

- No server-side components
- Serial access requires explicit user permission
- Licensed under GNU GPL v3