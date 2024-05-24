document.addEventListener('DOMContentLoaded', initializeApp);

let port;
let writer;
let crcTable;
let currentZoom = "Wide";
let currentColorMode = "White Hot";

async function initializeApp() {
    if ("serial" in navigator) {
        CRC_table();
        setupStateDependentButtons();
        await loadCommands();
        setupConnectButton();
    } else {
        displayNotSupportedError();
    }
}

function setupStateDependentButtons() {
    const controlButtonsDiv = document.getElementById('controlButtons');
    createButtons(controlButtonsDiv, ['Wide', 'Middle', 'Narrow'], 'Zoom');
    createButtons(controlButtonsDiv, ['White Hot', 'Black Hot'], '');
}

function createButtons(container, options, prefix) {
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = prefix ? `${prefix} ${option}` : option;
        button.className = 'button';
        button.addEventListener('click', () => {
            if (prefix === 'Zoom') {
                setCurrentZoom(option);
            } else {
                setCurrentColorMode(option);
            }
        });
        container.appendChild(button);
    });
    updateButtonColors();
}

function updateButtonColors() {
    const buttons = document.querySelectorAll('.button');
    const numberOfButtons = buttons.length;
    buttons.forEach((button, index) => {
        const hue = (360 / numberOfButtons) * index;
        const backgroundColor = `hsl(${hue}, 70%, 50%)`;
        const textColor = `hsl(${hue}, 30%, 90%)`;

        button.style.backgroundColor = backgroundColor;
        button.style.color = textColor;
        button.style.textShadow = `1px 1px 2px rgba(0, 0, 0, 0.3), -1px -1px 2px rgba(255, 255, 255, 0.5)`;
    });
}

async function loadCommands() {
    try {
        const response = await fetch('cmd.json');
        const commands = await response.json();
        enableCommandButtons(commands);
    } catch (error) {
        console.error('Failed to load command configuration:', error);
    }
}

function enableCommandButtons(commands) {
    const controlButtonsDiv = document.getElementById('controlButtons');
    commands.forEach(command => {
        const button = document.createElement('button');
        button.id = command.id;
        button.textContent = command.label;
        button.className = 'button';
        button.addEventListener('click', () => sendCommand(command.data));
        controlButtonsDiv.appendChild(button);
    });
    updateButtonColors();
}

function setupConnectButton() {
    const connectContainer = document.getElementById('connectContainer');
    connectContainer.innerHTML = '<button id="connect" class="button is-link">Connect to Serial Device</button>';
    document.getElementById('connect').addEventListener('click', connectSerial);
}

function displayNotSupportedError() {
    const connectContainer = document.getElementById('connectContainer');
    connectContainer.innerHTML = '<div class="notification is-danger">Web Serial API is not supported in this browser. ' +
                                 'Please check <a href="https://caniuse.com/web-serial" target="_blank">browser compatibility</a>.</div>';
}

async function startReading() {
    const reader = port.readable.getReader();
    const textDecoder = new TextDecoder();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log('Stream closed');
                break;
            }
            console.log('Received:', textDecoder.decode(value));
        }
    } catch (error) {
        console.error('Error reading from serial port:', error);
    } finally {
        reader.releaseLock();
    }
}

async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 2,
            flowControl: 'none'
        });
        writer = port.writable.getWriter();
        console.log('Connected to the serial port');
        document.getElementById('connect').style.display = 'none';
        startReading();
        setDefaultState();
    } catch (err) {
        console.error('There was an error opening the serial port:', err);
        alert('There was an error opening the serial port:', err);
    }
}

function setDefaultState() {
    setCurrentZoom(currentZoom);
    setCurrentColorMode(currentColorMode);
}

function setCurrentZoom(zoom) {
    currentZoom = zoom;
    sendZoomColorCommand();
}

function setCurrentColorMode(color) {
    currentColorMode = color;
    sendZoomColorCommand();
}

async function sendZoomColorCommand() {
    const command = getCommandByState(currentZoom, currentColorMode);
    const fullCommand = [...command, 0, 0]; // Append two bytes for CRC placeholders
    sendCommand(fullCommand);
}

function getCommandByState(zoom, color) {
    const commandBase = {
        "Wide": 100,
        "Middle": 200,
        "Narrow": 144
    };
    const colorOffset = color === "White Hot" ? 32 : 0;
    return [16, 2, 244, 2, colorOffset, 32, 0, zoom === "Narrow" ? 1 : 0, commandBase[zoom], 16, 3];
}

function CRC_table() {
    crcTable = [];
    let r, h, k;
    for (h = 0; h < 256; h++) {
        r = h << 8;
        for (k = 0; k < 8; k++) {
            if (r & 0x8000) {
                r = (r << 1) ^ 0x1021;
            } else {
                r = r << 1;
            }
        }
        crcTable[h] = r;
    }
}

function crc16(bytes) {
    let crc = 0;
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc << 8) ^ crcTable[((crc >> 8) ^ bytes[i]) & 0xFF];
    }
    return crc;
}

async function sendCommand(commandArray) {
    if (writer) {
        // Find the end index for the CRC calculation, identified by the sequence [16, 3]
        let endIndex = commandArray.indexOf(16, 2); // Start searching from index 2
        while (endIndex !== -1 && commandArray[endIndex + 1] !== 3) {
            endIndex = commandArray.indexOf(16, endIndex + 1);
        }

        // Slice the command array starting from index 2 to the found endIndex
        // or to the entire length of the array if [16, 3] is not found
        const commandPayload = commandArray.slice(2, endIndex === -1 ? commandArray.length : endIndex);

        // Calculate CRC16 for the sliced payload
        const crc = crc16(new Uint8Array(commandPayload));

        // Set the CRC in the last two bytes of the original command array with swapped order
        commandArray[commandArray.length - 2] = (crc >> 8) & 0xFF;  // Higher byte first
        commandArray[commandArray.length - 1] = crc & 0xFF;         // Lower byte second

        // Send the command using the serial port writer
        const payload = new Uint8Array(commandArray);
        console.log('Sending command:', payload);
        await writer.write(payload);
        console.log('Command sent:', payload);
    } else {
        console.error('Serial port not connected or writer not set up.');
    }
}
