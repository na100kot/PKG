const canvas = document.getElementById('rasterCanvas');
const ctx = canvas.getContext('2d');
const gridStep = 20;

let ddaCalculations = "";

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += gridStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += gridStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = '10px Arial';
  for (let x = 0; x <= canvas.width; x += gridStep * 2) {
    if (x !== canvas.width / 2) {
      const labelX = (x - canvas.width / 2) / gridStep;
      if (labelX >= -15 && labelX <= 15) {
        ctx.fillText(labelX, x, canvas.height / 2 + 10);
      }
    }
  }
  for (let y = 0; y <= canvas.height; y += gridStep * 2) {
    if (y !== canvas.height / 2) {
      const labelY = -(y - canvas.height / 2) / gridStep;
      if (labelY >= -15 && labelY <= 15) {
        ctx.fillText(labelY, canvas.width / 2 + 5, y);
      }
    }
  }
}

function setPixel(x, y, color = 'black') {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const px = centerX + x * gridStep;
  const py = centerY - y * gridStep;

  if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, gridStep, gridStep);
  }
}

function stepAlgorithm(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xInc = dx / steps;
  const yInc = dy / steps;

  let x = x1;
  let y = y1;
  for (let i = 0; i <= steps; i++) {
    setPixel(Math.round(x), Math.round(y));
    x += xInc;
    y += yInc;
  }
}

function ddaAlgorithm(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xInc = dx / steps;
  const yInc = dy / steps;

  let x = x1;
  let y = y1;

  ddaCalculations = `dx = ${dx}\ndy = ${dy}\nsteps = ${steps}\nxInc = ${xInc.toFixed(4)}\nyInc = ${yInc.toFixed(4)}\n\n`;
  ddaCalculations += `i\t\tx\t\ty\t\tround(x)\tround(y)\n`;
  ddaCalculations += `--------------------------------------------------------\n`;

  for (let i = 0; i <= steps; i++) {
    ddaCalculations += `${i}\t\t${x.toFixed(2)}\t\t${y.toFixed(2)}\t\t${Math.round(x)}\t\t${Math.round(y)}\n`;
    setPixel(Math.round(x), Math.round(y));
    x += xInc;
    y += yInc;
  }
}

function bresenhamLine(x1, y1, x2, y2) {
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);
  let sx = (x1 < x2) ? 1 : -1;
  let sy = (y1 < y2) ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    setPixel(x, y);
    if (x === x2 && y === y2) break;
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function bresenhamCircle(xc, yc, r) {
  let x = 0;
  let y = r;
  let d = 3 - 2 * r;

  function plot8(xc, yc, x, y) {
    setPixel(xc + x, yc + y);
    setPixel(xc - x, yc + y);
    setPixel(xc + x, yc - y);
    setPixel(xc - x, yc - y);
    setPixel(xc + y, yc + x);
    setPixel(xc - y, yc + x);
    setPixel(xc + y, yc - x);
    setPixel(xc - y, yc - x);
  }

  while (x <= y) {
    plot8(xc, yc, x, y);
    if (d < 0) {
      d += 4 * x + 6;
    } else {
      d += 4 * (x - y) + 10;
      y--;
    }
    x++;
  }
}

function draw() {
  drawGrid();
  const alg = document.getElementById('algorithm').value;
  const x1 = parseInt(document.getElementById('x1').value);
  const y1 = parseInt(document.getElementById('y1').value);
  const x2 = parseInt(document.getElementById('x2').value);
  const y2 = parseInt(document.getElementById('y2').value);
  const radius = parseInt(document.getElementById('radius').value);

  ddaCalculations = "";

  let startTime = performance.now();
  switch (alg) {
    case 'step':
      stepAlgorithm(x1, y1, x2, y2);
      break;
    case 'dda':
      ddaAlgorithm(x1, y1, x2, y2);
      break;
    case 'bresenham':
      bresenhamLine(x1, y1, x2, y2);
      break;
    case 'circle':
      bresenhamCircle(x1, y1, radius);
      break;
  }
  let endTime = performance.now();
  document.getElementById('timing-info').innerHTML = `Время выполнения: ${(endTime - startTime).toFixed(4)} мс`;

  if (alg === 'dda') {
    document.getElementById('calculations-output').style.display = 'block';
    document.getElementById('calculations-text').textContent = ddaCalculations;
  } else {
    document.getElementById('calculations-output').style.display = 'none';
  }
}

function clearCanvas() {
  drawGrid();
  document.getElementById('calculations-output').style.display = 'none';
}

function toggleInputs() {
  const alg = document.getElementById('algorithm').value;
  const lineParams = document.getElementById('line-params');
  if (alg === 'circle') {
    lineParams.style.display = 'none';
  } else {
    lineParams.style.display = 'inline';
  }
}

drawGrid();
toggleInputs();