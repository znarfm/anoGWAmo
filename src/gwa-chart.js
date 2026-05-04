export default class GWAChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    
    // Create canvas
    this.canvasDiv = document.createElement('div');
    this.canvasDiv.className = 'gwa-chart-container';
    this.canvasDiv.style.position = 'relative';
    this.canvasDiv.style.width = '100%';
    this.canvasDiv.style.height = '100%';
    this.canvasDiv.style.minHeight = '320px';
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.outline = 'none';
    this.canvasDiv.appendChild(this.canvas);
    this.container.appendChild(this.canvasDiv);
    
    this.ctx = this.canvas.getContext('2d');
    
    this.options = {
      lineColor: '#800000',
      fillStart: 'rgba(128, 0, 0, 0.4)',
      fillEnd: 'rgba(128, 0, 0, 0.0)',
      gridColor: '#e0e0e0',

      textColor: '#888',
      pointRadius: 4,
      pointHoverRadius: 6,
      font: '12px system-ui, -apple-system, sans-serif',
      ...options
    };
    
    this.margins = { top: 30, right: 20, bottom: 40, left: 40 };
    
    this.data = [];
    this.points = [];
    this.hoverIndex = -1;
    this.tooltip = this.createTooltip();
    this.cachedRect = null;
    
    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    
    // Event listeners
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'gwa-chart-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseenter', this.handleMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }

  updateCachedRect() {
    this.cachedRect = this.canvas.getBoundingClientRect();
  }

  handleResize() {
    if (this.data.length > 0) {
      this.renderChart(this.data);
    }
  }

  handleScroll() {
    this.updateCachedRect();
  }

  handleMouseEnter() {
    this.updateCachedRect();
  }

  handleMouseMove(e) {
    if (!this.data || this.data.length === 0) return;
    
    if (!this.cachedRect) {
      this.updateCachedRect();
    }
    const rect = this.cachedRect;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find closest point (X-axis distance)
    let closestIdx = -1;
    let minDistance = Infinity;
    
    for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        const dist = Math.abs(p.x - x);
        if (dist < 30 && dist < minDistance) {
            minDistance = dist;
            closestIdx = i;
        }
    }
    
    if (closestIdx !== this.hoverIndex) {
        this.hoverIndex = closestIdx;
        this.draw(); // Redraw for hover highlight
        
        if (closestIdx !== -1) {
            const point = this.points[closestIdx];
            const item = this.data[closestIdx];
            
            this.tooltip.textContent = "";
            const semStrong = document.createElement("strong");
            semStrong.textContent = item.semester;
            this.tooltip.appendChild(semStrong);
            this.tooltip.appendChild(document.createElement("br"));
            this.tooltip.append("GWA: ");
            const gwaStrong = document.createElement("strong");
            gwaStrong.textContent = item.gwa.toFixed(4);
            this.tooltip.appendChild(gwaStrong);
            
            this.tooltip.classList.add('visible');
            
            const tooltipRect = this.tooltip.getBoundingClientRect();
            let left = rect.left + point.x - (tooltipRect.width || 0) / 2;
            let top = rect.top + point.y - (tooltipRect.height || 0) - 15;
            
            if (top < 0) top = rect.top + point.y + 15;
            
            this.tooltip.style.left = `${left + window.scrollX}px`;
            this.tooltip.style.top = `${top + window.scrollY}px`;
        } else {
            this.tooltip.classList.remove('visible');
        }
    }
  }

  handleMouseLeave() {
    this.hoverIndex = -1;
    this.tooltip.classList.remove('visible');
    this.draw();
  }

  renderChart(data) {
    this.data = data;
    this.updateCachedRect();
    
    // High DPI scaling
    const rect = this.canvasDiv.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Prevent collapse calculations
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    
    this.calculateLayout();
    this.draw();
  }

  calculateLayout() {
    const { cssWidth: width, cssHeight: height } = this;
    const margins = this.margins;
    
    const innerWidth = width - margins.left - margins.right;
    const innerHeight = height - margins.top - margins.bottom;
    
    this.innerWidth = innerWidth;
    this.innerHeight = innerHeight;
    
    // Adaptive Scaling
    if (this.data.length > 0) {
        let minVal = Math.min(...this.data.map(d => d.gwa));
        let maxVal = Math.max(...this.data.map(d => d.gwa));
        
        if (minVal === maxVal) {
            minVal -= 0.1;
            maxVal += 0.1;
        }
        
        const rangeMargin = (maxVal - minVal) * 0.2;
        this.topGwa = Math.max(1.0, Math.floor((minVal - rangeMargin) * 10) / 10);
        this.bottomGwa = Math.min(5.0, Math.ceil((maxVal + rangeMargin) * 10) / 10);
        
        // Ensure minimum vertical spread
        if (this.bottomGwa - this.topGwa < 0.2) {
            this.topGwa = Math.max(1.0, this.topGwa - 0.1);
            this.bottomGwa = Math.min(5.0, this.bottomGwa + 0.1);
        }
    } else {
        this.topGwa = 1.0;
        this.bottomGwa = 5.0;
    }
    
    const yRange = this.bottomGwa - this.topGwa;
    
    this.points = this.data.map((item, index) => {
        const x = margins.left + (index * (innerWidth / Math.max(1, this.data.length - 1)));
        const normalizedGwa = (item.gwa - this.topGwa) / yRange;
        const y = margins.top + (normalizedGwa * innerHeight);
        return { x, y, value: item.gwa, label: item.semester };
    });
  }

  draw() {
    const { ctx, cssWidth: width, cssHeight: height } = this;
    
    ctx.clearRect(0, 0, width, height);
    
    if (this.data.length === 0) return;
    
    this.drawGrid();
    this.drawLine();
    this.drawPoints();
  }


  drawGrid() {
    const { ctx, cssWidth: width, cssHeight: height } = this;
    const { gridColor, textColor, font } = this.options;
    const margins = this.margins;
    
    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    
    // Adaptive Y-axis ticks
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const gwa = this.topGwa + (i / steps) * (this.bottomGwa - this.topGwa);
        const y = margins.top + (i / steps) * this.innerHeight;
        
        ctx.textAlign = 'right';
        ctx.fillText(gwa.toFixed(2), margins.left - 10, y);
        
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(margins.left, Math.round(y) - 0.5);
        ctx.lineTo(width - margins.right, Math.round(y) - 0.5);
        ctx.stroke();
        ctx.restore();
    }
    
    // Labels X
    const xLabels = this.data.length;
    const stepX = Math.max(1, Math.ceil(xLabels / Math.max(1, this.innerWidth / 40))); 

    for (let i = 0; i < xLabels; i += stepX) {
        const p = this.points[i];
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText((i + 1).toString(), p.x, height - margins.bottom + 10);
        ctx.restore();
    }
  }

  drawLine() {

    const { ctx, cssHeight: height } = this;
    const { lineColor, fillStart, fillEnd } = this.options;
    const margins = this.margins;
    
    if (this.points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // Bezier Curves
    for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        
        const cp1x = p1.x + (p2.x - p1.x) / 2;
        const cp1y = p1.y;
        const cp2x = p1.x + (p2.x - p1.x) / 2;
        const cp2y = p2.y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    
    // Fill Area under line
    ctx.lineTo(this.points[this.points.length - 1].x, height - margins.bottom);
    ctx.lineTo(this.points[0].x, height - margins.bottom);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, margins.top, 0, height - margins.bottom);
    gradient.addColorStop(0, fillStart);
    gradient.addColorStop(1, fillEnd);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw Stroke
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const cp1x = p1.x + (p2.x - p1.x) / 2;
        const cp1y = p1.y;
        const cp2x = p1.x + (p2.x - p1.x) / 2;
        const cp2y = p2.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawPoints() {
    const { ctx } = this;
    const { lineColor, pointRadius, pointHoverRadius } = this.options;
    
    for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        const isHovered = i === this.hoverIndex;
        const radius = isHovered ? pointHoverRadius : pointRadius;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();
    }
  }
}
