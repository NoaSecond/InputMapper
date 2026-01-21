import { UIController } from './modules/UIController.js';
import { Renderer } from './modules/Renderer.js';
import { Storage } from './modules/Storage.js';
import { Utils } from './modules/Utils.js';
import { DEFAULT_POSITIONS } from './modules/Config.js';

export class InputMapper {
    constructor() {
        this.currentType = 'xbox';
        this.backgroundColor = '#192752';
        this.labels = [];
        this.isDragging = false;
        this.draggedItem = null;
        this.dragOffset = { x: 0, y: 0 };
        this.zoom = 1;

        this.lineConfig = {
            style: 'dashed',
            width: 2,
            color: '#cebbbb',
            type: 'straight',
            end: 'ball'
        };

        this.coordPreview = this.createCoordPreview();
        this.init();
    }

    createCoordPreview() {
        const div = document.createElement('div');
        div.className = 'coord-preview';
        div.style.display = 'none';
        document.body.appendChild(div);
        return div;
    }

    async init() {
        UIController.init(this);
        await this.loadController(this.currentType);
    }

    async loadController(type) {
        this.currentType = type;
        const response = await fetch(`./assets/img/controllers/${Utils.capitalize(type)}.svg`);
        let svgText = await response.text();

        this.svgWrapper.innerHTML = svgText;

        const svg = this.svgWrapper.querySelector('svg');
        const paths = svg.querySelectorAll('path, ellipse, circle, rect');
        paths.forEach(path => {
            const fill = path.getAttribute('fill');
            if (fill && (fill.toLowerCase() === '#242424' || fill.toLowerCase() === '#232323')) {
                path.classList.add('js-body-part');
            }
        });

        this.updateControllerColor();
        this.loadKeySelector(type);
    }

    updateControllerColor() {
        const svg = this.svgWrapper.querySelector('svg');
        if (!svg) return;

        const bodyParts = svg.querySelectorAll('.js-body-part');
        bodyParts.forEach(part => {
            part.setAttribute('fill', this.backgroundColor);
        });

        if (this.colorIndicator) {
            this.colorIndicator.style.backgroundColor = this.backgroundColor;
        }
    }

    async loadKeySelector(type) {
        this.keySelector.innerHTML = '';
        const keys = this.getAvailableKeys(type);

        for (const key of keys) {
            const item = document.createElement('div');
            item.className = 'key-item';
            item.title = key;

            const img = document.createElement('img');
            img.src = `./assets/img/keys/${type}/${key}.svg`;

            item.appendChild(img);
            item.addEventListener('mousedown', (e) => this.addLabelFromSelector(e, key, type));
            this.keySelector.appendChild(item);
        }
    }

    getAvailableKeys(type) {
        const common = ['dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight', 'leftStick', 'rightStick', 'leftBumper', 'rightBumper', 'leftTrigger', 'rightTrigger', 'startButton', 'backButton'];

        if (type === 'xbox') {
            return [...common, 'aButton', 'bButton', 'xButton', 'yButton', 'leftStickClick', 'rightStickClick'];
        } else if (type === 'playstation') {
            return [...common, 'crossButton', 'circleButton', 'squareButton', 'triangleButton', 'l3Button', 'r3Button'];
        } else if (type === 'switch') {
            return [...common, 'aButton', 'bButton', 'xButton', 'yButton', 'leftStickClick', 'rightStickClick'];
        } else if (type === 'keyboard') {
            return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Space', 'Tab', 'Caps', 'Esc', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        } else if (type === 'mouse') {
            return ['LeftClick', 'MiddleClick', 'RightClick', 'ScrollUp', 'ScrollDown'];
        }
        return [];
    }

    addLabelFromSelector(e, key, type) {
        e.preventDefault();
        const rect = this.workspace.getBoundingClientRect();

        let initialX = e.clientX - rect.left - 50;
        let initialY = e.clientY - rect.top - 20;

        const marginX = 40;
        const sidePanelLimit = rect.width - 360;
        const topLimit = 100;
        const bottomLimit = rect.height - 120;

        initialX = Math.max(marginX, Math.min(sidePanelLimit, initialX));
        initialY = Math.max(topLimit, Math.min(bottomLimit, initialY));

        // Get default position if available
        const defaultPos = (DEFAULT_POSITIONS[type] && DEFAULT_POSITIONS[type][key]) || { targetX: 0.5, targetY: 0.5 };

        const label = this.createLabel({
            id: Date.now(),
            key: key,
            type: type,
            text: '',
            x: initialX,
            y: initialY,
            targetX: defaultPos.targetX,
            targetY: defaultPos.targetY
        });

        this.labels.push(label);
        this.startDragging(e, label.element);
    }

    createLabel(data) {
        const div = document.createElement('div');
        div.className = 'mapping-label';
        div.style.left = `${data.x}px`;
        div.style.top = `${data.y}px`;
        div.dataset.id = data.id;

        const img = document.createElement('img');
        img.src = `./assets/img/keys/${this.currentType}/${data.key}.svg`;
        img.className = 'key-icon';

        const input = document.createElement('textarea');
        input.value = data.text;
        input.placeholder = 'Action...';
        input.rows = 1;
        input.addEventListener('input', (e) => {
            data.text = e.target.value;
            this.updateInputWidth(e.target);
        });

        input.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' && e.shiftKey) || e.key === 'Escape') {
                e.preventDefault();
                input.blur();
            }
        });

        const hint = document.createElement('div');
        hint.className = 'input-hint';
        hint.textContent = 'Shift+Enter to Done';

        input.addEventListener('focus', () => {
            hint.classList.add('visible');
            div.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            hint.classList.remove('visible');
            div.classList.remove('focused');
        });

        div.appendChild(hint);

        const del = document.createElement('span');
        del.className = 'delete-label material-symbols-rounded';
        del.innerHTML = 'close';
        del.onclick = (e) => {
            e.stopPropagation();
            this.removeLabel(data.id);
        };

        img.addEventListener('mousedown', (e) => e.preventDefault()); // Prevent default image drag

        div.appendChild(img);
        div.appendChild(input);
        div.appendChild(del);

        div.addEventListener('mousedown', (e) => this.startDragging(e, div));
        this.labelsLayer.appendChild(div);

        const dot = document.createElement('div');
        dot.className = 'target-dot';
        this.updateDotPosition(dot, data);
        dot.addEventListener('mousedown', (e) => this.startDraggingDot(e, data, dot));
        this.labelsLayer.appendChild(dot);

        data.element = div;
        data.dotElement = dot;

        // Force a layout recalculation or use requestAnimationFrame to ensure rects are ready
        setTimeout(() => this.updateLines(), 0);

        // Initial resize
        this.updateInputWidth(input);

        return data;
    }

    clearLabels() {
        this.labels.forEach(l => {
            l.element.remove();
            l.dotElement.remove();
        });
        this.labels = [];
        this.updateLines();
    }

    updateInputWidth(input) {
        const span = document.createElement('span');
        span.style.font = window.getComputedStyle(input).font;
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';

        const lines = (input.value || input.placeholder).split('\n');
        let maxWidth = 0;

        lines.forEach(line => {
            // Replace spaces with non-breaking spaces for accurate measurement of trailing spaces if needed
            span.textContent = line || ' ';
            document.body.appendChild(span);
            const w = span.getBoundingClientRect().width;
            if (w > maxWidth) maxWidth = w;
            document.body.removeChild(span);
        });

        // Add buffer and ensure min-width
        input.style.width = `${Math.max(60, maxWidth + 10)}px`;

        // Calculate height based on lines to avoid jumping
        const roCount = lines.length;
        input.style.height = `${roCount * 1.4}em`;

        // Update lines during CSS transition
        const startTime = performance.now();
        const duration = 250; // Match text transition

        const animate = (time) => {
            this.updateLines();
            if (time - startTime < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    updateDotPosition(dot, data) {
        const svg = this.svgWrapper.querySelector('svg');
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const workspaceRect = this.workspace.getBoundingClientRect();

        // Logical endpoint
        const lx = (svgRect.left - workspaceRect.left) + (svgRect.width * data.targetX);
        const ly = (svgRect.top - workspaceRect.top) + (svgRect.height * data.targetY);

        // Calculate offset based on direction from label
        // Using approximate label center
        const sx = data.x + 50;
        const sy = data.y + 20;

        const dx = lx - sx;
        const dy = ly - sy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const offset = 25;
        const visualX = lx + (dx / dist) * offset;
        const visualY = ly + (dy / dist) * offset;

        dot.style.left = `${visualX}px`;
        dot.style.top = `${visualY}px`;
    }

    removeLabel(id) {
        const index = this.labels.findIndex(l => l.id == id);
        if (index > -1) {
            this.labels[index].element.remove();
            this.labels[index].dotElement.remove();
            this.labels.splice(index, 1);
            this.updateLines();
        }
    }

    startDragging(e, element) {
        if (e.target.tagName === 'INPUT') return;

        this.isDragging = true;
        this.draggedItem = { type: 'label', id: element.dataset.id };
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDraggingDot(e, data, dot) {
        e.stopPropagation();
        this.isDragging = true;
        this.draggedItem = { type: 'dot', id: data.id };
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.draggedItem) return;

        const rect = this.workspace.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Show coordinate preview further from cursor to avoid overlap
        this.coordPreview.style.display = 'block';
        this.coordPreview.style.left = `${e.clientX + 25}px`;
        this.coordPreview.style.top = `${e.clientY + 25}px`;

        if (this.draggedItem.type === 'label') {
            const label = this.labels.find(l => l.id == this.draggedItem.id);
            if (label) {
                label.x = x - this.dragOffset.x;
                label.y = y - this.dragOffset.y;
                label.element.style.left = `${label.x}px`;
                label.element.style.top = `${label.y}px`;
                this.updateDotPosition(label.dotElement, label);

                this.coordPreview.textContent = `X: ${Math.round(label.x)} Y: ${Math.round(label.y)}`;
            }
        } else if (this.draggedItem.type === 'dot') {
            const label = this.labels.find(l => l.id == this.draggedItem.id);
            if (label) {
                const svg = this.svgWrapper.querySelector('svg');
                const svgRect = svg.getBoundingClientRect();

                // When dragging, we want the handle (dot) at the mouse.
                // Since the handle is offset from the target, we must reverse the calculation.
                // handle = target + normalize(target - start) * offset
                // target approx= mouse - normalize(mouse - start) * offset

                const sx = label.x + 50;
                const sy = label.y + 20;
                const mx = e.clientX;
                const my = e.clientY;

                const dx = mx - sx;
                const dy = my - sy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const offset = 25;

                const logicalX_px = mx - (dx / dist) * offset;
                const logicalY_px = my - (dy / dist) * offset;

                // Normalize back to 0-1 for storage
                let normX = (logicalX_px - svgRect.left) / svgRect.width;
                let normY = (logicalY_px - svgRect.top) / svgRect.height;

                label.targetX = Math.max(0, Math.min(1, normX));
                label.targetY = Math.max(0, Math.min(1, normY));

                this.updateDotPosition(label.dotElement, label);

                this.coordPreview.textContent = `X: ${Math.round(label.targetX * 100)}% Y: ${Math.round(label.targetY * 100)}%`;
            }
        }
        this.updateLines();
    }

    onMouseUp() {
        this.isDragging = false;
        this.draggedItem = null;
        if (this.coordPreview) {
            this.coordPreview.style.display = 'none';
        }
    }

    updateLines() {
        Renderer.updateLines(this);
    }

    setZoom(scale) {
        this.zoom = Math.max(0.2, Math.min(3, scale));
        const zoomStage = document.getElementById('zoomStage');

        if (zoomStage) {
            zoomStage.style.transform = `scale(${this.zoom})`;
        }

        // Update lines during transition (approx 300ms)
        const startTime = performance.now();
        const duration = 350; // Slightly longer than CSS transition

        const animate = (time) => {
            this.updateLines();
            if (time - startTime < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);

        if (this.zoomLevelDisplay) {
            this.zoomLevelDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    setupMarkers() {
        Renderer.setupMarkers(this);
    }

    exportJson() { Storage.exportJson(this); }
    exportSvg() { Storage.exportSvg(this); }
    exportPng() { Storage.exportPng(this); }
    triggerImport() { Storage.triggerImport(this); }

    async importMapping(data) {
        this.mappingTitle.value = data.title;
        this.backgroundColor = data.color || '#242424';
        this.colorPicker.value = this.backgroundColor;

        this.menuBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === data.type);
        });

        await this.loadController(data.type);

        this.labels.forEach(l => {
            l.element.remove();
            l.dotElement.remove();
        });
        this.labels = [];

        data.labels.forEach(lData => {
            const label = this.createLabel({
                id: Date.now() + Math.random(),
                ...lData
            });
            this.labels.push(label);
        });

        setTimeout(() => this.updateLines(), 100);
    }
}
