import { commandDefinitions } from './commands.js';
import { debugLogger } from './debug-logger.js';

document.addEventListener('DOMContentLoaded', initializeApp);

let port;
let writer;
let crcTable;
let inactivityTimer;

// State variables
let brightnessLevel = 0;
let mideLevel = 0;
let contrastLevel = 0;
let zoomLevel = 0; // 0: wide, 1: mid, 2: narrow
let colorMode = 0; // 0: white hot, 1: black hot

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        sendPing();
    }, 200);
}

function sendPing() {
    sendCommand(commandDefinitions.ping.data, 'ping');
    inactivityTimer = setTimeout(sendPing, 200);
}

async function initializeApp() {
    // Always create the UI first, then check for API support
    createRemoteUI();
    setupConnectButton();
    CRC_table();

    if (!("serial" in navigator)) {
        displayNotSupportedError();
        const connectButton = document.getElementById('connect');
        if (connectButton) {
            connectButton.disabled = true;
            connectButton.textContent = 'Web Serial API Not Supported';
        }
    } else {
        resetInactivityTimer();
    }
}

function createRemoteUI() {
    const controlButtonsDiv = document.getElementById('controlButtons');
    controlButtonsDiv.innerHTML = ''; // Clear existing buttons

    // Use a grid layout for proper alignment
    controlButtonsDiv.style.display = 'grid';
    controlButtonsDiv.style.gridTemplateColumns = 'repeat(4, 1fr)';
    controlButtonsDiv.style.gap = '10px';

    const buttonLayout = [
        'Brightness', 'Mide', 'Invert', 'Contrast',
        'Zoom +', 'Calibrate', 'Auto Focus', 'Focus +',
        'Zoom -', null, null, 'Focus -'
    ];

    buttonLayout.forEach(label => {
        if (label) {
            const button = document.createElement('button');
            button.textContent = label;
            button.className = 'button';
            button.id = `btn-${label.toLowerCase().replace(/ /g, '').replace('+', 'plus').replace('-', 'minus')}`;
            if (label === 'Focus +' || label === 'Focus -') {
                button.addEventListener('mousedown', () => handleButtonClick(label, 'down'));
                button.addEventListener('mouseup', () => handleButtonClick(label, 'up'));
                button.addEventListener('mouseleave', () => handleButtonClick(label, 'up'));
            } else {
                button.addEventListener('click', () => handleButtonClick(label));
            }
            controlButtonsDiv.appendChild(button);
        } else {
            // Add an empty div as a placeholder to maintain grid structure
            controlButtonsDiv.appendChild(document.createElement('div'));
        }
    });

    updateButtonColors();
}


function handleButtonClick(label, eventType) {
    resetInactivityTimer();
    switch (label) {
        case 'Brightness':
            brightnessLevel = (brightnessLevel + 1) % 8;
            sendCommand(commandDefinitions[`brightness${brightnessLevel}`].data, `brightness${brightnessLevel}`);
            break;
        case 'Mide':
            mideLevel = (mideLevel + 1) % 16;
            sendCommand(commandDefinitions[`mide${mideLevel}`].data, `mide${mideLevel}`);
            break;
        case 'Invert':
            colorMode = 1 - colorMode;
            const colorCommand = colorMode === 0 ? 'whiteHot' : 'blackHot';
            sendCommand(commandDefinitions[colorCommand].data, colorCommand);
            break;
        case 'Contrast':
            contrastLevel = (contrastLevel + 1) % 8;
            sendCommand(commandDefinitions[`contrast${contrastLevel}`].data, `contrast${contrastLevel}`);
            break;
        case 'Zoom +':
            if (zoomLevel < 2) zoomLevel++;
            sendZoomCommand();
            break;
        case 'Zoom -':
            if (zoomLevel > 0) zoomLevel--;
            sendZoomCommand();
            break;
        case 'Calibrate':
            sendCommand(commandDefinitions.calibrate.data, 'calibrate');
            break;
        case 'Auto Focus':
            sendCommand(commandDefinitions.autoFocus.data, 'autoFocus');
            break;
        case 'Focus +':
            if (eventType === 'down') {
                sendCommand(commandDefinitions.focusPlus.data, 'focusPlus');
            } else {
                sendCommand(commandDefinitions.focusStop.data, 'focusStop');
            }
            break;
        case 'Focus -':
            if (eventType === 'down') {
                sendCommand(commandDefinitions.focusMinus.data, 'focusMinus');
            } else {
                sendCommand(commandDefinitions.focusStop.data, 'focusStop');
            }
            break;
    }
}

function sendZoomCommand() {
    const zoomCommands = ['wideView', 'midView', 'narrowView'];
    const commandName = zoomCommands[zoomLevel];
    sendCommand(commandDefinitions[commandName].data, commandName);
}

async function executeCommandChain(commands, buttonId) {
    debugLogger.logCommandChain(buttonId, commands);

    for (const item of commands) {
        if (item.delay) {
            await new Promise(resolve => setTimeout(resolve, item.delay));
        } else if (item.command) {
            const cmdDef = commandDefinitions[item.command];
            if (cmdDef) {
                await sendCommand(cmdDef.data, item.command);
            } else {
                console.error(`Command not found: ${item.command}`);
            }
        }
    }
}

function updateButtonColors() {
    const buttons = document.querySelectorAll('#controlButtons .button');
    let hues = [15, 45, 90, 135, 180, 225, 270, 315, 355];

    for (let i = hues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [hues[i], hues[j]] = [hues[j], hues[i]];
    }

    buttons.forEach((button, index) => {
        const hueIndex = index % hues.length;
        const hue = hues[hueIndex];
        const backgroundColor = `hsl(${hue}, 80%, 40%)`;
        const textColor = `hsl(${hue}, 100%, 85%)`;

        button.style.backgroundColor = backgroundColor;
        button.style.color = textColor;
        button.style.textShadow = `1px 1px 2px rgba(0, 0, 0, 0.7), -1px -1px 2px rgba(255, 255, 255, 0.4)`;
    });
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
            const decodedValue = textDecoder.decode(value);
            console.log('Received:', decodedValue);
            debugLogger.logSerialReceive(decodedValue);
        }
    } catch (error) {
        console.error('Error reading from serial port:', error);
    } finally {
        reader.releaseLock();
    }
}

async function connectSerial() {
    if (!("serial" in navigator)) {
        alert("Web Serial API is not supported by your browser.");
        return;
    }
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
    } catch (err) {
        console.error('There was an error opening the serial port:', err);
        alert('There was an error opening the serial port:', err);
    }
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

function crc16_ccitt(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        crc = (crc << 8) ^ crcTable[((crc >> 8) ^ data[i]) & 0xFF];
    }
    return crc & 0xFFFF;
}

async function sendCommand(commandArray, commandName = 'Unknown') {
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
        const crc = crc16_ccitt(new Uint8Array(commandPayload));

        // Set the CRC in the last two bytes of the original command array with swapped order
        commandArray[commandArray.length - 2] = (crc >> 8) & 0xFF;  // Higher byte first
        commandArray[commandArray.length - 1] = crc & 0xFF;         // Lower byte second

        // Send the command using the serial port writer
        const payload = new Uint8Array(commandArray);
        console.log('Sending command:', payload);
        debugLogger.logSerialSend(commandName, payload);
        await writer.write(payload);
        console.log('Command sent:', payload);
    } else {
        console.error('Serial port not connected or writer not set up.');
    }
}