const canvas = document.getElementById('rasterCanvas');
const ctx = canvas.getContext('2d');
const gridStep = 10;

let ddaCalculations = "";
let currentAlgorithmPoints = [];

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
      if (labelX >= -30 && labelX <= 30) {
        ctx.fillText(labelX, x, canvas.height / 2 + 10);
      }
    }
  }
  for (let y = 0; y <= canvas.height; y += gridStep * 2) {
    if (y !== canvas.height / 2) {
      const labelY = -(y - canvas.height / 2) / gridStep;
      if (labelY >= -30 && labelY <= 30) {
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
    
    // Сохраняем точки для анализа ошибок
    if (color !== 'orange') { // Исключаем точки совпадения
      currentAlgorithmPoints.push({x, y, color});
    }
  }
}

// Функция для вычисления расстояния от точки до идеальной линии
function distanceToLine(x, y, x1, y1, x2, y2) {
  const A = y2 - y1;
  const B = x1 - x2;
  const C = x2 * y1 - x1 * y2;
  
  return Math.abs(A * x + B * y + C) / Math.sqrt(A * A + B * B);
}

// Функция для анализа ошибок алгоритма
function analyzeAlgorithmError(points, x1, y1, x2, y2, algorithmName) {
  if (points.length === 0) return null;
  
  let totalError = 0;
  let maxError = 0;
  let errorCount = 0;
  
  // Вычисляем ошибку для каждого пикселя
  for (const point of points) {
    const error = distanceToLine(point.x, point.y, x1, y1, x2, y2);
    totalError += error;
    maxError = Math.max(maxError, error);
    errorCount++;
  }
  
  const avgError = totalError / errorCount;
  
  return {
    algorithm: algorithmName,
    avgError: avgError.toFixed(4),
    maxError: maxError.toFixed(4),
    pixelCount: errorCount
  };
}

// Функция для отображения таблицы ошибок
function displayErrorComparison(results) {
  const tableBody = document.getElementById('error-table-body');
  tableBody.innerHTML = '';
  
  results.forEach(result => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${result.algorithm}</td>
      <td>${result.avgError}</td>
      <td>${result.maxError}</td>
      <td>${result.pixelCount}</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  document.getElementById('error-comparison').style.display = 'block';
}

// Пошаговый алгоритм - РИСУЕТ КРАСНЫМ
function stepAlgorithm(x1, y1, x2, y2) {
  currentAlgorithmPoints = [];
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);

  let sx = (x1 < x2) ? 1 : -1;
  let sy = (y1 < y2) ? 1 : -1;

  let steps = Math.max(dx, dy);
  let errX = 0;
  let errY = 0;

  for (let i = 0; i <= steps; i++) {
    setPixel(x1, y1, "red");

    errX += dx;
    errY += dy;

    if (errX >= steps) {
      x1 += sx;
      errX -= steps;
    }
    if (errY >= steps) {
      y1 += sy;
      errY -= steps;
    }
  }
  
  return analyzeAlgorithmError(currentAlgorithmPoints, x1, y1, x2, y2, "Пошаговый");
}

// ЦДА - РИСУЕТ СИНИМ
function ddaAlgorithm(x1, y1, x2, y2) {
  currentAlgorithmPoints = [];
  const dx = x2 - x1;
  const dy = y2 - y1;

  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  const xInc = dx / steps;
  const yInc = dy / steps;

  let x = x1;
  let y = y1;

  ddaCalculations = "";

  for (let i = 0; i <= steps; i++) {
    setPixel(Math.round(x), Math.round(y), "blue");
    ddaCalculations += `${i}: x=${x.toFixed(2)} y=${y.toFixed(2)} → (${Math.round(x)}, ${Math.round(y)})\n`;

    x += xInc;
    y += yInc;
  }
  
  return analyzeAlgorithmError(currentAlgorithmPoints, x1, y1, x2, y2, "ЦДА");
}

// Брезенхем - РИСУЕТ ЗЕЛЕНЫМ
function bresenhamLine(x1, y1, x2, y2) {
  currentAlgorithmPoints = [];
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);

  let sx = (x1 < x2) ? 1 : -1;
  let sy = (y1 < y2) ? 1 : -1;

  let err = dx - dy;

  while (true) {
    setPixel(x1, y1, "green");

    if (x1 === x2 && y1 === y2) break;

    let e2 = 2 * err;

    if (e2 > -dy) {
      err -= dy;
      x1 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y1 += sy;
    }
  }
  
  return analyzeAlgorithmError(currentAlgorithmPoints, x1, y1, x2, y2, "Брезенхем");
}

// Алгоритм Кастла-Питвея - РИСУЕТ ТЕМНО-СИНИМ
// Классический алгоритм Кастла-Питвея с анти-алиасингом
function castlePitwayLine(x1, y1, x2, y2) {
  currentAlgorithmPoints = [];
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  const steep = Math.abs(dy) > Math.abs(dx);
  
  let _x1 = x1, _y1 = y1, _x2 = x2, _y2 = y2;
  
  if (steep) {
    [_x1, _y1] = [_y1, _x1];
    [_x2, _y2] = [_y2, _x2];
  }
  if (_x1 > _x2) {
    [_x1, _x2] = [_x2, _x1];
    [_y1, _y2] = [_y2, _y1];
  }
  
  const dx2 = _x2 - _x1;
  const dy2 = _y2 - _y1;
  const gradient = dx2 === 0 ? 1 : dy2 / dx2;
  
  // Первая конечная точка
  let xend = Math.round(_x1);
  let yend = _y1 + gradient * (xend - _x1);
  let xgap = 1 - (_x1 + 0.5 - Math.floor(_x1 + 0.5));
  let xpxl1 = xend;
  let ypxl1 = Math.floor(yend);
  
  if (steep) {
    setPixelWithAlphaCastle(ypxl1, xpxl1, (1 - (yend - Math.floor(yend))) * xgap);
    setPixelWithAlphaCastle(ypxl1 + 1, xpxl1, (yend - Math.floor(yend)) * xgap);
  } else {
    setPixelWithAlphaCastle(xpxl1, ypxl1, (1 - (yend - Math.floor(yend))) * xgap);
    setPixelWithAlphaCastle(xpxl1, ypxl1 + 1, (yend - Math.floor(yend)) * xgap);
  }
  
  let intery = yend + gradient;
  
  // Вторая конечная точка
  xend = Math.round(_x2);
  yend = _y2 + gradient * (xend - _x2);
  xgap = _x2 + 0.5 - Math.floor(_x2 + 0.5);
  let xpxl2 = xend;
  let ypxl2 = Math.floor(yend);
  
  if (steep) {
    setPixelWithAlphaCastle(ypxl2, xpxl2, (1 - (yend - Math.floor(yend))) * xgap);
    setPixelWithAlphaCastle(ypxl2 + 1, xpxl2, (yend - Math.floor(yend)) * xgap);
  } else {
    setPixelWithAlphaCastle(xpxl2, ypxl2, (1 - (yend - Math.floor(yend))) * xgap);
    setPixelWithAlphaCastle(xpxl2, ypxl2 + 1, (yend - Math.floor(yend)) * xgap);
  }
  
  // Основной цикл
  if (steep) {
    for (let x = xpxl1 + 1; x < xpxl2; x++) {
      setPixelWithAlphaCastle(Math.floor(intery), x, 1 - (intery - Math.floor(intery)));
      setPixelWithAlphaCastle(Math.floor(intery) + 1, x, intery - Math.floor(intery));
      intery += gradient;
    }
  } else {
    for (let x = xpxl1 + 1; x < xpxl2; x++) {
      setPixelWithAlphaCastle(x, Math.floor(intery), 1 - (intery - Math.floor(intery)));
      setPixelWithAlphaCastle(x, Math.floor(intery) + 1, intery - Math.floor(intery));
      intery += gradient;
    }
  }
  
  return analyzeAlgorithmError(currentAlgorithmPoints, x1, y1, x2, y2, "Кастла-Питвея");
}

// Специальная функция для Кастла-Питвея
function setPixelWithAlphaCastle(x, y, alpha) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const px = centerX + x * gridStep;
    const py = centerY - y * gridStep;

    if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
        // Темно-синий цвет с прозрачностью
        const intensity = Math.floor(alpha * 139); // 139 - темно-синий
        ctx.fillStyle = `rgb(0, 0, ${intensity})`;
        ctx.fillRect(px, py, gridStep, gridStep);
        
        // Для анализа ошибок учитываем только достаточно темные пиксели
        if (alpha > 0.3) {
            currentAlgorithmPoints.push({x, y, color: "darkblue"});
        }
    }
}

function bresenhamCircle(xc, yc, r) {
  currentAlgorithmPoints = [];
  let x = 0;
  let y = r;
  let d = 3 - 2 * r;

  function plot8(xc, yc, x, y) {
    setPixel(xc + x, yc + y, 'purple');
    setPixel(xc - x, yc + y, 'purple');
    setPixel(xc + x, yc - y, 'purple');
    setPixel(xc - x, yc - y, 'purple');
    setPixel(xc + y, yc + x, 'purple');
    setPixel(xc - y, yc + x, 'purple');
    setPixel(xc + y, yc - x, 'purple');
    setPixel(xc - y, yc - x, 'purple');
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
  
  return null; // Для окружности анализ ошибок не проводится
}

// Алгоритм Ву с анти-алиасингом - РИСУЕТ С ОТТЕНКАМИ СЕРОГО
function wuLine(x1, y1, x2, y2) {
    currentAlgorithmPoints = [];
    const ipart = (x) => Math.floor(x);
    const round = (x) => ipart(x + 0.5);
    const fpart = (x) => x - ipart(x);
    const rfpart = (x) => 1 - fpart(x);
    
    const steep = Math.abs(y2 - y1) > Math.abs(x2 - x1);
    
    let _x1 = x1, _y1 = y1, _x2 = x2, _y2 = y2;
    
    if (steep) {
        [_x1, _y1] = [_y1, _x1];
        [_x2, _y2] = [_y2, _x2];
    }
    if (_x1 > _x2) {
        [_x1, _x2] = [_x2, _x1];
        [_y1, _y2] = [_y2, _y1];
    }
    
    const dx = _x2 - _x1;
    const dy = _y2 - _y1;
    const gradient = dx === 0 ? 1 : dy / dx;
    
    let xend = round(_x1);
    let yend = _y1 + gradient * (xend - _x1);
    let xgap = rfpart(_x1 + 0.5);
    const xpxl1 = xend;
    const ypxl1 = ipart(yend);
    
    if (steep) {
        setPixelWithAlpha(ypxl1, xpxl1, rfpart(yend) * xgap);
        setPixelWithAlpha(ypxl1 + 1, xpxl1, fpart(yend) * xgap);
    } else {
        setPixelWithAlpha(xpxl1, ypxl1, rfpart(yend) * xgap);
        setPixelWithAlpha(xpxl1, ypxl1 + 1, fpart(yend) * xgap);
    }
    
    let intery = yend + gradient;
    
    xend = round(_x2);
    yend = _y2 + gradient * (xend - _x2);
    xgap = fpart(_x2 + 0.5);
    const xpxl2 = xend;
    const ypxl2 = ipart(yend);
    
    if (steep) {
        setPixelWithAlpha(ypxl2, xpxl2, rfpart(yend) * xgap);
        setPixelWithAlpha(ypxl2 + 1, xpxl2, fpart(yend) * xgap);
    } else {
        setPixelWithAlpha(xpxl2, ypxl2, rfpart(yend) * xgap);
        setPixelWithAlpha(xpxl2, ypxl2 + 1, fpart(yend) * xgap);
    }
    
    if (steep) {
        for (let x = xpxl1 + 1; x < xpxl2; x++) {
            setPixelWithAlpha(ipart(intery), x, rfpart(intery));
            setPixelWithAlpha(ipart(intery) + 1, x, fpart(intery));
            intery += gradient;
        }
    } else {
        for (let x = xpxl1 + 1; x < xpxl2; x++) {
            setPixelWithAlpha(x, ipart(intery), rfpart(intery));
            setPixelWithAlpha(x, ipart(intery) + 1, fpart(intery));
            intery += gradient;
        }
    }
    
    return analyzeAlgorithmError(currentAlgorithmPoints, x1, y1, x2, y2, "Ву (сглаживание)");
}

// Вспомогательная функция для установки пикселя с прозрачностью
function setPixelWithAlpha(x, y, alpha) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const px = centerX + x * gridStep;
    const py = centerY - y * gridStep;

    if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
        const intensity = Math.floor(alpha * 255);
        ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
        ctx.fillRect(px, py, gridStep, gridStep);
        
        // Для анализа ошибок учитываем только достаточно темные пиксели
        if (intensity > 50) {
            currentAlgorithmPoints.push({x, y, color: 'gray'});
        }
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
  document.getElementById('error-comparison').style.display = 'none';

  let startTime = performance.now();
  let errorResult = null;
  
  switch (alg) {
    case 'step':
      errorResult = stepAlgorithm(x1, y1, x2, y2);
      break;
    case 'dda':
      errorResult = ddaAlgorithm(x1, y1, x2, y2);
      break;
    case 'bresenham':
      errorResult = bresenhamLine(x1, y1, x2, y2);
      break;
    case 'castle-pitway':
      errorResult = castlePitwayLine(x1, y1, x2, y2);
      break;
    case 'circle':
      bresenhamCircle(x1, y1, radius);
      break;
    case 'wu':
      errorResult = wuLine(x1, y1, x2, y2);
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
  
  // Показываем анализ ошибок для выбранного алгоритма
  if (errorResult && alg !== 'circle') {
    const results = [errorResult];
    displayErrorComparison(results);
  }
}

function clearCanvas() {
  drawGrid();
  document.getElementById('calculations-output').style.display = 'none';
  document.getElementById('error-comparison').style.display = 'none';
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

// Функция для сравнения всех алгоритмов
function compareAlgorithms() {
  drawGrid();
  const x1 = parseInt(document.getElementById('x1').value);
  const y1 = parseInt(document.getElementById('y1').value);
  const x2 = parseInt(document.getElementById('x2').value);
  const y2 = parseInt(document.getElementById('y2').value);
  
  // Собираем результаты всех алгоритмов
  const errorResults = [];
  
  // Запускаем каждый алгоритм и собираем данные об ошибках
  const stepResult = stepAlgorithm(x1, y1, x2, y2);
  const ddaResult = ddaAlgorithm(x1, y1, x2, y2);
  const bresenhamResult = bresenhamLine(x1, y1, x2, y2);
  const castleResult = castlePitwayLine(x1, y1, x2, y2);
  const wuResult = wuLine(x1, y1, x2, y2);
  
  if (stepResult) errorResults.push(stepResult);
  if (ddaResult) errorResults.push(ddaResult);
  if (bresenhamResult) errorResults.push(bresenhamResult);
  if (castleResult) errorResults.push(castleResult);
  if (wuResult) errorResults.push(wuResult);
  
  // Отображаем таблицу сравнения
  displayErrorComparison(errorResults);
  
  document.getElementById('timing-info').innerHTML = 
    'Сравнение алгоритмов: Красный - Пошаговый, Синий - ЦДА, Зеленый - Брезенхем, Темно-синий - Кастла-Питвея, Серый - Ву, Оранжевый - совпадение';
}

drawGrid();
toggleInputs();
