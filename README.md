# Whac-a-Mole Serial Device Controller

A web-based interface for controlling serial devices using the Web Serial API. Features a colorful button interface inspired by the whac-a-mole game aesthetic.

## Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd whac-a-mole

# Install dependencies
make install

# Run the application
make
```

Then open `http://localhost:8000` in your browser. All debug information will be printed to your terminal.

## Features

- **Web Serial API Integration** - Direct browser-to-device communication
- **Command Chaining** - Execute multiple commands with configurable delays
- **Dynamic UI** - Colorful, randomized button styling
- **CRC16 Checksums** - Automatic checksum calculation for reliable communication
- **State Management** - Track device zoom levels and color modes
- **No Backend Required** - Pure client-side application

## Requirements

- Modern browser with Web Serial API support (Chrome, Edge, Opera)
- Secure context (HTTPS or localhost - see [Security Notes](#security-notes))
- Serial device operating at 115200 baud

## Quick Start

### Using Make (Recommended)
```bash
# Install dependencies
make install

# Run server with debug logging (default)
make

# Show available commands
make help
```

### Using npm
```bash
# Install dependencies
npm install

# Start development server
npm start

# Start server and open browser
npm run dev

# Start with debug backend (logs all frontend activity)
npm run debug
```

### Manual Setup (without debug logging)
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve -p 8000 .
```

Note: Manual setup won't provide debug logging. Use `make` or `npm run debug` for full logging capabilities.

## Architecture

### Command Structure

Commands are defined in `commands.js` with two main components:

1. **Command Definitions** - Raw byte sequences with hex literals
   ```javascript
   const commandDefinitions = {
       calibrate: {
           data: [0x10, 0x02, 0xF4, 0x02, ...]
       }
   };
   ```

2. **Button Configurations** - UI buttons that can trigger command chains
   ```javascript
   const buttonConfigs = [
       {
           id: "calibrateAndFocus",
           label: "Calibrate & Focus",
           commands: [
               { command: "calibrate" },
               { delay: 2000 },
               { command: "autoFocus" }
           ]
       }
   ];
   ```

### Serial Communication

- Baud rate: 115200
- Data format: 8 data bits, 1 stop bit, no parity
- CRC16 checksum automatically calculated and appended
- Command format: `[header][payload][crc16][footer]`

## Debug Mode

When running locally with the debug backend (`make` or `npm run debug`), the application will:

- Log all JavaScript console output to the terminal
- Capture and display all JavaScript errors with stack traces
- Show all serial commands sent (with hex representation)
- Display all serial responses received
- Track command chain execution
- Use color-coded output for different log types

This is particularly useful for:
- Debugging serial communication issues
- Monitoring application behavior for automation/AI agents
- Troubleshooting device compatibility
- Developing new command sequences

The debug backend runs on port 8001 and only works when accessing the application via localhost.

## Customization

### Adding New Commands

1. Add command definition to `commandDefinitions` in `commands.js`
2. Create button configuration in `buttonConfigs`
3. Reload the page

### Creating Command Chains

```javascript
{
    id: "mySequence",
    label: "My Sequence",
    commands: [
        { command: "command1" },
        { delay: 1000 },      // Wait 1 second
        { command: "command2" },
        { delay: 500 },       // Wait 0.5 seconds
        { command: "command3" }
    ]
}
```

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome  | ✅ (89+)  |
| Edge    | ✅ (89+)  |
| Opera   | ✅ (75+)  |
| Firefox | ❌        |
| Safari  | ❌        |

## License

GNU General Public License v3.0

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security Notes

### Web Serial API Secure Context Requirements

The Web Serial API requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) to function:

- **Local Development**: `http://localhost` and `http://127.0.0.1` are treated as secure contexts
- **Production**: HTTPS is required for all non-localhost deployments
- **Local Network**: Accessing from other devices on your network requires HTTPS with self-signed certificates

### Other Security Considerations

- Requires explicit user permission for serial port access
- No data is sent to external servers
- All processing happens client-side
- Each serial connection request triggers a browser permission dialog