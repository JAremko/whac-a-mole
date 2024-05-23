let port;
let writer;

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    if ("serial" in navigator) {
        await loadCommands();
        setupConnectButton();
    } else {
        displayNotSupportedError();
    }
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
    } catch (err) {
        console.error('There was an error opening the serial port:', err);
        alert('There was an error opening the serial port:', err);
    }
}

function enableCommandButtons(commands) {
    const container = document.createElement('div');
    commands.forEach(command => {
        const button = document.createElement('button');
        button.id = command.id;
        button.textContent = command.label;
        button.className = 'button';
        button.addEventListener('click', () => sendCommand(command.data));
        container.appendChild(button);
    });
    document.body.appendChild(container);
}

async function sendCommand(commandArray) {
    if (writer) {
        const payload = new Uint8Array(commandArray);
        console.log('Sending command:', payload);
        await writer.write(payload);
        console.log('Command sent:', payload);
    } else {
        console.error('Serial port not connected or writer not set up.');
    }
}
