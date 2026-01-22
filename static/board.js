const socket = io();

// Join the whiteboard room
if (typeof roomId !== 'undefined') {
    socket.emit('join-room', roomId, 'whiteboard-' + socket.id, 'WhiteboardUser');
    console.log('Joined whiteboard room:', roomId);
} else {
    console.error('roomId is not defined!');
}

let canvas = document.getElementById('canvas');

// Debug: Check if canvas exists
console.log('Canvas element:', canvas);
console.log('Socket connected:', socket.connected);

// Handle window resize
const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
};

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial sizing

let ctx = canvas.getContext("2d");
console.log('Canvas context:', ctx);

let x;
let y;
let mouseDown = false;
let currentColor = '#000000';
let currentLineWidth = 2;

// Initialize drawing settings
ctx.strokeStyle = currentColor;
ctx.lineWidth = currentLineWidth;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    console.log('Mouse down at:', e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
    socket.emit('down', {x: e.clientX, y: e.clientY, color: currentColor});
    mouseDown = true;
});

canvas.addEventListener('mouseup', (e) => {
    console.log('Mouse up');
    mouseDown = false;
    ctx.closePath();
});

canvas.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;

    if(mouseDown) {
        socket.emit('draw', {x, y, color: currentColor});
        ctx.strokeStyle = currentColor; // Ensure we use our selected color
        ctx.lineTo(x, y);
        ctx.stroke();
    }
});

socket.on('ondraw', ({x, y, color}) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = currentLineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
});

socket.on('ondown', ({x, y, color}) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = currentLineWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
});

// Clear canvas event
socket.on('clear-canvas', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Function to change color
function changeColor(color) {
    currentColor = color;
    ctx.strokeStyle = currentColor;
}

// Function to change line width
function changeLineWidth(width) {
    currentLineWidth = width;
    ctx.lineWidth = currentLineWidth;
}

// Function to clear canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-canvas');
}