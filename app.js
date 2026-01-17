/**
 * InputMapper - MVP Logic
 */

class InputMapper {
    constructor() {
        this.currentType = 'xbox';
        this.backgroundColor = '#192752';
        this.labels = [];
        this.isDragging = false;
        this.draggedItem = null;
        this.dragOffset = { x: 0, y: 0 };

        // Line Defaults
        this.lineConfig = {
            style: 'dashed',
            width: 2,
            color: '#ffffff',
            type: 'straight',
            end: 'none'
        };

        this.init();
    }

    async init() {
        this.cacheElements();
        this.attachListeners();
        await this.loadController(this.currentType);
    }

    cacheElements() {
        this.svgWrapper = document.getElementById('controllerSvgWrapper');
        this.linesContainer = document.getElementById('linesContainer');
        this.labelsLayer = document.getElementById('labelsLayer');
        this.workspace = document.getElementById('workspace');
        this.colorPicker = document.getElementById('controllerColor');
        this.colorIndicator = document.getElementById('colorIndicator');
        this.keySelector = document.getElementById('keySelector');
        this.mappingTitle = document.getElementById('mappingTitle');
        this.menuBtns = document.querySelectorAll('.menu-btn');
    }

    attachListeners() {
        // Controller Type Switch
        this.menuBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.menuBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadController(btn.dataset.type);
            });
        });

        // Color Picker
        this.colorPicker.addEventListener('input', (e) => {
            this.backgroundColor = e.target.value;
            this.updateControllerColor();
        });

        // Workspace Events (for dragging)
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());

        // Export Actions
        document.getElementById('exportJson').addEventListener('click', () => this.exportJson());
        document.getElementById('exportSvg').addEventListener('click', () => this.exportSvg());
        document.getElementById('exportPng').addEventListener('click', () => this.exportPng());
        document.getElementById('importBtn').addEventListener('click', () => this.triggerImport());

        // Line Settings Listeners
        const settings = ['lineStyle', 'lineWidth', 'lineColor', 'lineType', 'lineEnd'];
        settings.forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const key = id.replace('line', '').toLowerCase();
                this.lineConfig[key] = e.target.value;
                this.updateLines();
            });
        });
    }

    async loadController(type) {
        this.currentType = type;
        const response = await fetch(`./assets/img/controllers/${this.capitalize(type)}.svg`);
        let svgText = await response.text();

        // Inject SVG
        this.svgWrapper.innerHTML = svgText;

        // Mark elements that should change color
        const svg = this.svgWrapper.querySelector('svg');
        const paths = svg.querySelectorAll('path, ellipse, circle, rect');
        paths.forEach(path => {
            const fill = path.getAttribute('fill');
            if (fill && (fill.toLowerCase() === '#242424' || fill.toLowerCase() === '#232323')) {
                path.classList.add('js-body-part');
            }
        });

        this.updateControllerColor();

        // Clear workspace labels when switching if needed? 
        // For MVP, let's keep them but maybe they'll be misaligned.
        // Actually, requirement says "importer un mapping ce qui remplira les champs automatiquement sur le BON type de controller"
        // So switching manually shouldn't necessarily clear, but loading a mapping should set the controller.

        this.loadKeySelector(type);
    }

    capitalize(s) {
        if (s === 'xbox') return 'XBox';
        if (s === 'playstation') return 'PlayStation';
        return s.charAt(0).toUpperCase() + s.slice(1);
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
        // This should probably match the filenames in assets/img/keys/[type]
        const common = ['dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight', 'leftStick', 'rightStick', 'leftBumper', 'rightBumper', 'leftTrigger', 'rightTrigger', 'startButton', 'backButton'];

        if (type === 'xbox') {
            return [...common, 'aButton', 'bButton', 'xButton', 'yButton', 'leftStickClick', 'rightStickClick'];
        } else if (type === 'playstation') {
            return [...common, 'crossButton', 'circleButton', 'squareButton', 'triangleButton', 'l3Button', 'r3Button'];
        } else { // switch
            return [...common, 'aButton', 'bButton', 'xButton', 'yButton', 'leftStickClick', 'rightStickClick'];
        }
    }

    addLabelFromSelector(e, key, type) {
        e.preventDefault();
        const rect = this.workspace.getBoundingClientRect();
        const label = this.createLabel({
            id: Date.now(),
            key: key,
            type: type,
            text: '',
            x: e.clientX - rect.left - 50,
            y: e.clientY - rect.top - 20,
            targetX: 0.5, // normalized 0-1
            targetY: 0.5
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

        const input = document.createElement('input');
        input.type = 'text';
        input.value = data.text;
        input.placeholder = 'Action...';
        input.addEventListener('input', (e) => data.text = e.target.value);

        const del = document.createElement('span');
        del.className = 'delete-label material-symbols-rounded';
        del.innerHTML = 'close';
        del.onclick = (e) => {
            e.stopPropagation();
            this.removeLabel(data.id);
        };

        div.appendChild(img);
        div.appendChild(input);
        div.appendChild(del);

        div.addEventListener('mousedown', (e) => this.startDragging(e, div));

        this.labelsLayer.appendChild(div);

        // Target dot on controller
        const dot = document.createElement('div');
        dot.className = 'target-dot';
        const controllerRect = this.svgWrapper.getBoundingClientRect();
        const workspaceRect = this.workspace.getBoundingClientRect();

        // Default target position (center of controller)
        if (data.targetX === 0.5 && data.targetY === 0.5) {
            data.targetX = 0.5;
            data.targetY = 0.5;
        }

        this.updateDotPosition(dot, data);
        dot.addEventListener('mousedown', (e) => this.startDraggingDot(e, data, dot));
        this.labelsLayer.appendChild(dot);

        data.element = div;
        data.dotElement = dot;

        this.updateLines();

        return data;
    }

    updateDotPosition(dot, data) {
        const svg = this.svgWrapper.querySelector('svg');
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const workspaceRect = this.workspace.getBoundingClientRect();

        const left = (svgRect.left - workspaceRect.left) + (svgRect.width * data.targetX);
        const top = (svgRect.top - workspaceRect.top) + (svgRect.height * data.targetY);

        dot.style.left = `${left}px`;
        dot.style.top = `${top}px`;
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

        if (this.draggedItem.type === 'label') {
            const label = this.labels.find(l => l.id == this.draggedItem.id);
            if (label) {
                label.x = x - this.dragOffset.x;
                label.y = y - this.dragOffset.y;
                label.element.style.left = `${label.x}px`;
                label.element.style.top = `${label.y}px`;
            }
        } else if (this.draggedItem.type === 'dot') {
            const label = this.labels.find(l => l.id == this.draggedItem.id);
            if (label) {
                const svg = this.svgWrapper.querySelector('svg');
                const svgRect = svg.getBoundingClientRect();
                const workspaceRect = this.workspace.getBoundingClientRect();

                // Calculate normalized position within SVG
                let normX = (e.clientX - svgRect.left) / svgRect.width;
                let normY = (e.clientY - svgRect.top) / svgRect.height;

                // Clamp 0-1
                label.targetX = Math.max(0, Math.min(1, normX));
                label.targetY = Math.max(0, Math.min(1, normY));

                this.updateDotPosition(label.dotElement, label);
            }
        }

        this.updateLines();
    }

    onMouseUp() {
        this.isDragging = false;
        this.draggedItem = null;
    }

    updateLines() {
        this.linesContainer.innerHTML = '';
        const workspaceRect = this.workspace.getBoundingClientRect();

        // Setup markers for line ends
        this.setupMarkers();

        this.labels.forEach(label => {
            const labelRect = label.element.getBoundingClientRect();
            const dotRect = label.dotElement.getBoundingClientRect();

            const startX = labelRect.left - workspaceRect.left + labelRect.width / 2;
            const startY = labelRect.top - workspaceRect.top + labelRect.height / 2;
            const endX = dotRect.left - workspaceRect.left + dotRect.width / 2;
            const endY = dotRect.top - workspaceRect.top + dotRect.height / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            let d = '';
            if (this.lineConfig.type === 'straight') {
                d = `M ${startX} ${startY} L ${endX} ${endY}`;
            } else if (this.lineConfig.type === 'curved') {
                const cp1x = startX;
                const cp1y = endY;
                d = `M ${startX} ${startY} Q ${cp1x} ${cp1y} ${endX} ${endY}`;
            } else if (this.lineConfig.type === 'angle') {
                d = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
            }

            path.setAttribute('d', d);
            path.setAttribute('stroke', this.lineConfig.color);
            path.setAttribute('stroke-width', this.lineConfig.width);
            path.setAttribute('fill', 'none');

            if (this.lineConfig.style === 'dashed') {
                path.setAttribute('stroke-dasharray', '8 4');
            } else if (this.lineConfig.style === 'dotted') {
                path.setAttribute('stroke-dasharray', '2 4');
            }

            if (this.lineConfig.end !== 'none') {
                path.setAttribute('marker-end', `url(#marker-${this.lineConfig.end})`);
            }

            this.linesContainer.appendChild(path);
        });
    }

    setupMarkers() {
        let defs = this.linesContainer.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            this.linesContainer.appendChild(defs);
        }
        defs.innerHTML = `
            <marker id="marker-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="${this.lineConfig.color}" />
            </marker>
            <marker id="marker-ball" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <circle cx="5" cy="5" r="5" fill="${this.lineConfig.color}" />
            </marker>
            <marker id="marker-square" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <rect x="0" y="0" width="10" height="10" fill="${this.lineConfig.color}" />
            </marker>
        `;
    }


    // Export / Import
    exportJson() {
        const data = {
            title: this.mappingTitle.value || 'Untitled',
            type: this.currentType,
            color: this.backgroundColor,
            labels: this.labels.map(l => ({
                key: l.key,
                text: l.text,
                x: l.x,
                y: l.y,
                targetX: l.targetX,
                targetY: l.targetY
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title.replace(/\s+/g, '_')}.json`;
        a.click();
    }

    async exportSvg() {
        // Clone workspace for export
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const workspaceRect = this.workspace.getBoundingClientRect();
        svg.setAttribute('width', workspaceRect.width);
        svg.setAttribute('height', workspaceRect.height);
        svg.setAttribute('viewBox', `0 0 ${workspaceRect.width} ${workspaceRect.height}`);
        svg.style.backgroundColor = this.backgroundColor;

        // Add controller SVG content
        const controllerSvg = this.svgWrapper.querySelector('svg').cloneNode(true);
        const controllerRect = this.svgWrapper.querySelector('svg').getBoundingClientRect();
        controllerSvg.setAttribute('x', controllerRect.left - workspaceRect.left);
        controllerSvg.setAttribute('y', controllerRect.top - workspaceRect.top);
        svg.appendChild(controllerSvg);

        // Add Lines
        const lines = this.linesContainer.cloneNode(true);
        svg.appendChild(lines);

        // Add Labels (as foreignObject or text/rect)
        // For simplicity in MVP SVG export, let's use foreignObject
        this.labels.forEach(l => {
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('x', l.x);
            fo.setAttribute('y', l.y);
            fo.setAttribute('width', 200);
            fo.setAttribute('height', 50);

            const div = document.createElement('div');
            div.style.color = 'white';
            div.style.background = '#1e293b';
            div.style.padding = '5px 10px';
            div.style.borderRadius = '8px';
            div.style.display = 'inline-block';
            div.innerHTML = `${l.key}: ${l.text}`;
            fo.appendChild(div);
            svg.appendChild(fo);
        });

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.mappingTitle.value || 'mapping'}.svg`;
        a.click();
    }

    exportPng() {
        // PNG export usually requires a canvas
        // Simplified implementation using a library helper if needed, but for now let's just alert or do basic version
        alert("PNG Export: In a real app we would draw the workspace to a canvas. For this MVP, please use SVG export.");
    }

    triggerImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                const data = JSON.parse(re.target.result);
                this.importMapping(data);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async importMapping(data) {
        this.mappingTitle.value = data.title;
        this.backgroundColor = data.color || '#242424';
        this.colorPicker.value = this.backgroundColor;

        // Update menu active state
        this.menuBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === data.type);
        });

        await this.loadController(data.type);

        // Clear current labels
        this.labels.forEach(l => {
            l.element.remove();
            l.dotElement.remove();
        });
        this.labels = [];

        // Add new labels
        data.labels.forEach(lData => {
            this.labels.push(this.createLabel({
                id: Date.now() + Math.random(),
                ...lData
            }));
        });
    }
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    window.app = new InputMapper();
});
