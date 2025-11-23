// script.js — адаптированная версия для двух окон
class ClippingApp {
    constructor() {
        this.liangCanvas = document.getElementById('liangCanvas');
        this.liangCtx = this.liangCanvas.getContext('2d');
        this.polygonCanvas = document.getElementById('polygonCanvas');
        this.polygonCtx = this.polygonCanvas.getContext('2d');
        
        this.segments = [];
        this.polygon = null;
        this.window = null;
        this.padding = 200;
        
        this.liangBounds = null;
        this.polygonBounds = null;
        
        this.initUI();
        this.clearAndDrawCoordinateSystems();
    }

    initUI() {
        document.getElementById('btnLoad').onclick = () => this.loadData();
        document.getElementById('btnExample').onclick = () => this.loadExample();
        document.getElementById('btnExamplePolygon').onclick = () => this.loadPolygonExample();
        document.getElementById('btnLiang').onclick = () => this.runLiangBarsky();
        document.getElementById('btnPolyClip').onclick = () => this.runPolygonClip();
        document.getElementById('btnReset').onclick = () => this.resetView();
        document.getElementById('fileInput').addEventListener('change', (e)=>this.handleFileUpload(e));
        document.getElementById('padding').addEventListener('input', (e)=> {
            this.padding = parseFloat(e.target.value) || 200;
            this.drawAll();
        });

        this.loadExample();
    }

    handleFileUpload(e){
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            document.getElementById('inputData').value = ev.target.result;
            this.loadData();
        };
        reader.readAsText(file);
    }

    loadExample(){
        document.getElementById('inputData').value =
`5
50 50 200 150
100 100 250 50
150 200 300 100
80 180 180 80
120 120 280 200
100 100 300 250`;
        this.loadData();
    }

    loadPolygonExample(){
        document.getElementById('inputData').value =
`6
100 100 200 150 200 250 100 300 50 250 50 150
150 150 350 350`;
        this.loadData();
    }

    loadData(){
        const raw = document.getElementById('inputData').value.trim();
        if (!raw) { alert('Нет данных'); return; }
        const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
        if (lines.length < 2) { alert('Недостаточно строк'); return; }

        const first = lines[0].split(/\s+/).map(Number);
        const n = parseInt(first[0]);
        this.segments = [];
        this.polygon = null;
        this.window = null;

        try {
            // Вариант 1: отрезки
            if (lines.length >= n + 2) {
                let okSegments = true;
                const segs = [];
                for (let i=1; i<=n; i++){
                    const arr = lines[i].split(/\s+/).map(Number).filter(v=>!isNaN(v));
                    if (arr.length !== 4) { okSegments = false; break; }
                    segs.push({x1:arr[0], y1:arr[1], x2:arr[2], y2:arr[3]});
                }
                if (okSegments) {
                    const winArr = lines[n+1].split(/\s+/).map(Number).filter(v=>!isNaN(v));
                    if (winArr.length === 4) {
                        this.segments = segs;
                        this.window = {
                            xmin: Math.min(winArr[0], winArr[2]),
                            ymin: Math.min(winArr[1], winArr[3]),
                            xmax: Math.max(winArr[0], winArr[2]),
                            ymax: Math.max(winArr[1], winArr[3])
                        };
                        this.drawAll();
                        return;
                    }
                }
            }

            // Вариант 2: многоугольник
            if (lines.length >= 3) {
                const p = n;
                const verticesLine = lines[1].split(/\s+/).map(Number).filter(v=>!isNaN(v));
                if (verticesLine.length === 2 * p) {
                    const poly = [];
                    for (let i=0;i<p;i++){
                        poly.push({x: verticesLine[2*i], y: verticesLine[2*i+1]});
                    }
                    const winArr = lines[2].split(/\s+/).map(Number).filter(v=>!isNaN(v));
                    if (winArr.length === 4) {
                        this.polygon = poly;
                        this.window = {
                            xmin: Math.min(winArr[0], winArr[2]),
                            ymin: Math.min(winArr[1], winArr[3]),
                            xmax: Math.max(winArr[0], winArr[2]),
                            ymax: Math.max(winArr[1], winArr[3])
                        };
                        this.drawAll();
                        return;
                    }
                }
            }

            alert('Не удалось распознать формат.');
        } catch (err) {
            console.error(err);
            alert('Ошибка при разборе данных: ' + err.message);
        }
    }

    setupTransform(canvas, data) {
        let xmin=Infinity, xmax=-Infinity, ymin=Infinity, ymax=-Infinity;
        const feedPoint = p=>{
            xmin = Math.min(xmin, p.x);
            xmax = Math.max(xmax, p.x);
            ymin = Math.min(ymin, p.y);
            ymax = Math.max(ymax, p.y);
        };
        
        data.forEach(item => feedPoint(item));
        if (this.window) {
            feedPoint({x:this.window.xmin,y:this.window.ymin});
            feedPoint({x:this.window.xmax,y:this.window.ymax});
        }
        
        if (!isFinite(xmin)) { xmin = -100; xmax = 100; ymin = -100; ymax = 100; }

        const pad = this.padding;
        const w = xmax - xmin || 1;
        const h = ymax - ymin || 1;

        const canvasW = canvas.width;
        const canvasH = canvas.height;

        const scaleX = (canvasW - 2*pad) / w;
        const scaleY = (canvasH - 2*pad) / h;
        const scale = Math.min(scaleX, scaleY);

        const worldCenterX = (xmin + xmax)/2;
        const worldCenterY = (ymin + ymax)/2;

        return {
            xmin, xmax, ymin, ymax,
            scale,
            cx: canvasW/2,
            cy: canvasH/2,
            worldCenterX, worldCenterY
        };
    }

    worldToCanvas(pt, bounds) {
        const s = bounds.scale;
        const cx = bounds.cx;
        const cy = bounds.cy;
        const dx = pt.x - bounds.worldCenterX;
        const dy = pt.y - bounds.worldCenterY;
        return {
            x: cx + dx * s,
            y: cy - dy * s
        };
    }

    clearAndDrawCoordinateSystems() {
        this.liangCtx.clearRect(0,0,this.liangCanvas.width,this.liangCanvas.height);
        this.polygonCtx.clearRect(0,0,this.polygonCanvas.width,this.polygonCanvas.height);
    }

    drawAxesAndGrid(ctx, bounds, canvas) {
        const canvasW = canvas.width;
        const canvasH = canvas.height;

        ctx.clearRect(0,0,canvasW,canvasH);

        // Сетка
        ctx.save();
        ctx.strokeStyle = '#e6e6e6';
        ctx.lineWidth = 1;

        for (let x=0; x<=canvasW; x+=20) {
            ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvasH); ctx.stroke();
        }
        for (let y=0; y<=canvasH; y+=20) {
            ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvasW,y); ctx.stroke();
        }

        // Оси
        const origin = this.worldToCanvas({x:0,y:0}, bounds);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // X axis
        ctx.beginPath(); 
        ctx.moveTo(0, origin.y); 
        ctx.lineTo(canvasW, origin.y); 
        ctx.stroke();
        
        // Y axis
        ctx.beginPath(); 
        ctx.moveTo(origin.x, 0); 
        ctx.lineTo(origin.x, canvasH); 
        ctx.stroke();

        // Подписи осей
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('X', canvasW - 10, origin.y - 8);
        ctx.fillText('Y', origin.x + 8, 12);

        ctx.restore();
    }

    drawAll(){
        if (!this.window && this.segments.length===0 && !this.polygon) {
            this.clearAndDrawCoordinateSystems();
            return;
        }

        // Для алгоритма Лианга-Барски
        if (this.segments.length > 0) {
            const liangData = [];
            this.segments.forEach(s => {
                liangData.push({x:s.x1,y:s.y1});
                liangData.push({x:s.x2,y:s.y2});
            });
            this.liangBounds = this.setupTransform(this.liangCanvas, liangData);
            this.drawAxesAndGrid(this.liangCtx, this.liangBounds, this.liangCanvas);
            this.drawWindow(this.liangCtx, this.liangBounds);
            this.drawSegments(this.liangCtx, this.liangBounds);
        }

        // Для алгоритма Sutherland-Hodgman
        if (this.polygon) {
            this.polygonBounds = this.setupTransform(this.polygonCanvas, this.polygon);
            this.drawAxesAndGrid(this.polygonCtx, this.polygonBounds, this.polygonCanvas);
            this.drawWindow(this.polygonCtx, this.polygonBounds);
            this.drawPolygon(this.polygonCtx, this.polygonBounds, this.polygon, '#3498db', 2, true);
        }
    }

    drawWindow(ctx, bounds) {
        if (!this.window) return;
        const a = this.worldToCanvas({x: this.window.xmin, y: this.window.ymin}, bounds);
        const b = this.worldToCanvas({x: this.window.xmax, y: this.window.ymax}, bounds);
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);

        ctx.save();
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = 'rgba(231,76,60,0.08)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(x,y,w,h);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawSegments(ctx, bounds) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3498db';
        this.segments.forEach(s => {
            const p1 = this.worldToCanvas({x:s.x1,y:s.y1}, bounds);
            const p2 = this.worldToCanvas({x:s.x2,y:s.y2}, bounds);
            ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        });
        ctx.restore();
    }

    drawClippedSegment(ctx, bounds, x1,y1,x2,y2) {
        const p1 = this.worldToCanvas({x:x1,y:y1}, bounds);
        const p2 = this.worldToCanvas({x:x2,y:y2}, bounds);
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#27ae60';
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        ctx.restore();
    }

    drawPolygon(ctx, bounds, poly, stroke='#3498db', width=2, fill=false) {
        if (!poly || poly.length===0) return;
        ctx.save();
        if (fill) {
            ctx.fillStyle = 'rgba(52,152,219,0.1)';
            ctx.beginPath();
            poly.forEach((v,i)=> {
                const p = this.worldToCanvas(v, bounds);
                if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
            });
            ctx.closePath(); 
            ctx.fill();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.beginPath();
        poly.forEach((v,i)=> {
            const p = this.worldToCanvas(v, bounds);
            if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
        });
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = stroke;
        poly.forEach(v => {
            const p = this.worldToCanvas(v, bounds);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.restore();
    }

    resetView() {
        this.segments = [];
        this.polygon = null;
        this.window = null;
        this.drawAll();
    }

    // ======= Liand-Barsky (отрезки) =======
    runLiangBarsky() {
        if (!this.window || !this.segments || this.segments.length===0) {
            alert('Загрузите данные (отрезки + окно).');
            return;
        }
        this.drawAll();
        this.segments.forEach(s => {
            const clipped = this.liangBarskyClip(s.x1,s.y1,s.x2,s.y2, this.window.xmin,this.window.ymin,this.window.xmax,this.window.ymax);
            if (clipped) {
                this.drawClippedSegment(this.liangCtx, this.liangBounds, clipped.x1,clipped.y1,clipped.x2,clipped.y2);
            }
        });
    }

    liangBarskyClip(x1,y1,x2,y2, xmin,ymin,xmax,ymax) {
        let t0 = 0, t1 = 1;
        const dx = x2 - x1, dy = y2 - y1;
        const p = [-dx, dx, -dy, dy];
        const q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];

        for (let i=0;i<4;i++){
            const pi = p[i], qi = q[i];
            if (pi === 0) {
                if (qi < 0) return null;
            } else {
                const t = qi / pi;
                if (pi < 0) {
                    if (t > t1) return null;
                    if (t > t0) t0 = t;
                } else {
                    if (t < t0) return null;
                    if (t < t1) t1 = t;
                }
            }
        }
        if (t0 > t1) return null;
        return {
            x1: x1 + t0*dx,
            y1: y1 + t0*dy,
            x2: x1 + t1*dx,
            y2: y1 + t1*dy
        };
    }

    // ======= Sutherland–Hodgman (многоугольники) =======
    runPolygonClip() {
        if (!this.window || !this.polygon) {
            alert('Загрузите данные (многоугольник + окно).');
            return;
        }
        
        if (this.polygon.length < 3) {
            alert('Многоугольник должен иметь хотя бы 3 вершины.');
            return;
        }
        
        this.drawAll();
        
        const clipPolygon = [
            {x: this.window.xmin, y: this.window.ymin},
            {x: this.window.xmax, y: this.window.ymin},
            {x: this.window.xmax, y: this.window.ymax},
            {x: this.window.xmin, y: this.window.ymax}
        ];
        
        const clippedPolygon = this.sutherlandHodgman(this.polygon, clipPolygon);
        
        if (clippedPolygon && clippedPolygon.length >= 3) {
            this.drawClippedPolygon(this.polygonCtx, this.polygonBounds, clippedPolygon);
        } else {
            alert('Многоугольник полностью отсечён.');
        }
    }

    inside(point, clipStart, clipEnd) {
        return (clipEnd.x - clipStart.x) * (point.y - clipStart.y) > 
               (clipEnd.y - clipStart.y) * (point.x - clipStart.x);
    }

    intersection(start, end, clipStart, clipEnd) {
        const dir = {
            x: end.x - start.x,
            y: end.y - start.y
        };
        const clipDir = {
            x: clipEnd.x - clipStart.x,
            y: clipEnd.y - clipStart.y
        };
        
        const denom = clipDir.y * dir.x - clipDir.x * dir.y;
        
        if (Math.abs(denom) < 1e-10) {
            return start;
        }
        
        const t = ((clipStart.x - start.x) * clipDir.y + (start.y - clipStart.y) * clipDir.x) / denom;
        
        return {
            x: start.x + t * dir.x,
            y: start.y + t * dir.y
        };
    }

    sutherlandHodgman(subjectPolygon, clipPolygon) {
        let outputList = subjectPolygon;
        
        for (let i = 0; i < clipPolygon.length; i++) {
            const inputList = outputList;
            outputList = [];
            
            const clipStart = clipPolygon[i];
            const clipEnd = clipPolygon[(i + 1) % clipPolygon.length];
            
            if (inputList.length === 0) break;
            
            let S = inputList[inputList.length - 1];
            
            for (let j = 0; j < inputList.length; j++) {
                const E = inputList[j];
                
                if (this.inside(E, clipStart, clipEnd)) {
                    if (!this.inside(S, clipStart, clipEnd)) {
                        outputList.push(this.intersection(S, E, clipStart, clipEnd));
                    }
                    outputList.push(E);
                } else if (this.inside(S, clipStart, clipEnd)) {
                    outputList.push(this.intersection(S, E, clipStart, clipEnd));
                }
                
                S = E;
            }
        }
        
        return outputList;
    }

    drawClippedPolygon(ctx, bounds, polygon) {
        ctx.save();
        
        // Заливка
        ctx.fillStyle = 'rgba(39, 174, 96, 0.3)';
        ctx.beginPath();
        polygon.forEach((vertex, index) => {
            const point = this.worldToCanvas(vertex, bounds);
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        
        // Контур
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 3;
        ctx.beginPath();
        polygon.forEach((vertex, index) => {
            const point = this.worldToCanvas(vertex, bounds);
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.stroke();
        
        // Вершины
        ctx.fillStyle = '#27ae60';
        polygon.forEach(vertex => {
            const point = this.worldToCanvas(vertex, bounds);
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.restore();
    }
}

let app = null;
window.onload = () => {
    app = new ClippingApp();
};