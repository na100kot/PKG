class ImageProcessor {
  constructor() {
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');
    this.outputCanvas = document.createElement('canvas');
    this.outputCtx = this.outputCanvas.getContext('2d');
  }

  getImageDataFromImage(img) {
    const w = img.width, h = img.height;
    this.tempCanvas.width = w;
    this.tempCanvas.height = h;
    this.tempCtx.clearRect(0, 0, w, h);
    this.tempCtx.drawImage(img, 0, 0);
    return this.tempCtx.getImageData(0, 0, w, h);
  }

  createImageFromData(data) {
    const w = data.width, h = data.height;
    this.outputCanvas.width = w;
    this.outputCanvas.height = h;
    this.outputCtx.putImageData(data, 0, 0);
    return this.outputCanvas.toDataURL('image/png');
  }

  linearContrast(img) {
    const data = this.getImageDataFromImage(img);
    const d = data.data;
    const alpha = 1.5;
    for (let i = 0; i < d.length; i += 4) {
      d[i]     = Math.min(255, Math.max(0, alpha * d[i]));
      d[i + 1] = Math.min(255, Math.max(0, alpha * d[i + 1]));
      d[i + 2] = Math.min(255, Math.max(0, alpha * d[i + 2]));
    }
    return this.createImageFromData(data);
  }

  equalizeGrayscale(img) {
    const data = this.getImageDataFromImage(img);
    const d = data.data;
    const w = data.width, h = data.height;

    const gray = new Uint8Array(w * h);
    const hist = new Uint32Array(256).fill(0);

    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const idx = Math.floor(i / 4);
      const gInt = Math.round(g);
      gray[idx] = gInt;
      hist[gInt]++;
    }

    let cumsum = 0;
    const cdf = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      cumsum += hist[i];
      cdf[i] = cumsum;
    }

    let cdfMin = -1;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    const total = w * h;
    const lut = new Uint8Array(256);

    if (cdfMin === -1 || cdfMin === total) {
      for (let i = 0; i < 256; i++) lut[i] = i;
    } else {
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
      }
    }

    for (let i = 0; i < d.length; i += 4) {
      const g = gray[Math.floor(i / 4)];
      const eq = lut[g];
      d[i] = d[i + 1] = d[i + 2] = eq;
    }

    return this.createImageFromData(data);
  }

  equalizeRGB(img) {
    const data = this.getImageDataFromImage(img);
    const d = data.data;

    const buildLUT = (channelValues) => {
      const hist = new Uint32Array(256).fill(0);
      for (let val of channelValues) hist[val]++;

      let cumsum = 0;
      const cdf = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        cumsum += hist[i];
        cdf[i] = cumsum;
      }

      let cdfMin = -1;
      for (let i = 0; i < 256; i++) {
        if (cdf[i] > 0) {
          cdfMin = cdf[i];
          break;
        }
      }

      const total = channelValues.length;
      const lut = new Uint8Array(256);
      if (cdfMin === -1 || cdfMin === total) {
        for (let i = 0; i < 256; i++) lut[i] = i;
      } else {
        for (let i = 0; i < 256; i++) {
          lut[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
        }
      }
      return lut;
    };

    const r = [], g = [], b = [];
    for (let i = 0; i < d.length; i += 4) {
      r.push(d[i]);
      g.push(d[i + 1]);
      b.push(d[i + 2]);
    }

    const lutR = buildLUT(r);
    const lutG = buildLUT(g);
    const lutB = buildLUT(b);

    for (let i = 0; i < d.length; i += 4) {
      d[i]     = lutR[d[i]];
      d[i + 1] = lutG[d[i + 1]];
      d[i + 2] = lutB[d[i + 2]];
    }

    return this.createImageFromData(data);
  }

  equalizeHSV(img) {
    const data = this.getImageDataFromImage(img);
    const d = data.data;
    const w = data.width, h = data.height;

    const rgbToHsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const diff = max - min;
      let h, s, v = max;
      if (diff === 0) h = 0;
      else if (max === r) h = (g - b) / diff % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
      h /= 6;
      s = max === 0 ? 0 : diff / max;
      return [h, s, v];
    };

    const hsvToRgb = (h, s, v) => {
      let r, g, b;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const vValues = [];
    const pixels = [];

    for (let i = 0; i < d.length; i += 4) {
      const [h, s, v] = rgbToHsv(d[i], d[i + 1], d[i + 2]);
      vValues.push(Math.round(v * 255));
      pixels.push({ h, s, v });
    }

    const hist = new Uint32Array(256).fill(0);
    for (let val of vValues) hist[val]++;

    let cumsum = 0;
    const cdf = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      cumsum += hist[i];
      cdf[i] = cumsum;
    }

    let cdfMin = -1;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    const total = vValues.length;
    const lut = new Uint8Array(256);
    if (cdfMin === -1 || cdfMin === total) {
      for (let i = 0; i < 256; i++) lut[i] = i;
    } else {
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
      }
    }

    for (let i = 0; i < d.length; i += 4) {
      const pixel = pixels[Math.floor(i / 4)];
      const newV = lut[Math.round(pixel.v * 255)] / 255;
      const [r, g, b] = hsvToRgb(pixel.h, pixel.s, newV);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }

    return this.createImageFromData(data);
  }

  applyMedianFilter(img, kernelSize = 3) {
    const data = this.getImageDataFromImage(img);
    const d = data.data;
    const w = data.width, h = data.height;
    const half = Math.floor(kernelSize / 2);
    const newData = new Uint8ClampedArray(d.length);

    const getPixel = (x, y, ch) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return 0;
      return d[(y * w + x) * 4 + ch];
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
          const window = [];
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              window.push(getPixel(x + dx, y + dy, c));
            }
          }
          window.sort((a, b) => a - b);
          newData[(y * w + x) * 4 + c] = window[Math.floor(window.length / 2)];
        }
        newData[(y * w + x) * 4 + 3] = 255;
      }
    }

    return this.createImageFromData(new ImageData(newData, w, h));
  }

  applyMinMaxFilter(img, mode = 'min') {
    const data = this.getImageDataFromImage(img);
    const d = data.data;
    const w = data.width, h = data.height;
    const newData = new Uint8ClampedArray(d.length);
    const half = 1;

    const getPixel = (x, y, ch) => {
      if (x < 0 || x >= w || y < 0 || y >= h) {
        return mode === 'min' ? 255 : 0;
      }
      return d[(y * w + x) * 4 + ch];
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
          let val = mode === 'min' ? 255 : 0;
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              const p = getPixel(x + dx, y + dy, c);
              if (mode === 'min') val = Math.min(val, p);
              else val = Math.max(val, p);
            }
          }
          newData[(y * w + x) * 4 + c] = val;
        }
        newData[(y * w + x) * 4 + 3] = 255;
      }
    }

    return this.createImageFromData(new ImageData(newData, w, h));
  }

  drawHistogram(imageData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const histR = new Uint32Array(256).fill(0);
    const histG = new Uint32Array(256).fill(0);
    const histB = new Uint32Array(256).fill(0);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      histR[d[i]]++;
      histG[d[i + 1]]++;
      histB[d[i + 2]]++;
    }

    const maxVal = Math.max(...histR, ...histG, ...histB);
    if (maxVal === 0) return;

    const colors = ['red', 'green', 'blue'];
    const hists = [histR, histG, histB];

    for (let c = 0; c < 3; c++) {
      ctx.strokeStyle = colors[c];
      ctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const y = h - (hists[c][i] / maxVal) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

const processor = new ImageProcessor();