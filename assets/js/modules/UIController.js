export class UIController {
    static init(app) {
        this.cacheElements(app);
        this.attachListeners(app);
    }

    static cacheElements(app) {
        app.svgWrapper = document.getElementById('controllerSvgWrapper');
        app.linesContainer = document.getElementById('linesContainer');
        app.labelsLayer = document.getElementById('labelsLayer');
        app.workspace = document.getElementById('workspace');
        app.colorPicker = document.getElementById('controllerColor');
        app.colorIndicator = document.getElementById('colorIndicator');
        app.keySelector = document.getElementById('keySelector');
        app.mappingTitle = document.getElementById('mappingTitle');
        app.menuBtns = document.querySelectorAll('.menu-btn');
        app.exportDropdown = document.querySelector('.export-dropdown');
        app.exportMenuBtn = document.getElementById('exportMenuBtn');
        app.lineWidthValue = document.getElementById('lineWidthValue');
        app.zoomLevelDisplay = document.getElementById('zoomLevel');
    }

    static attachListeners(app) {
        // Controller Type Switch
        app.menuBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                app.menuBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                app.loadController(btn.dataset.type);
            });
        });

        // Color Picker
        app.colorPicker.addEventListener('input', (e) => {
            app.backgroundColor = e.target.value;
            app.updateControllerColor();
        });

        // Workspace Events (for dragging)
        window.addEventListener('mousemove', (e) => app.onMouseMove(e));
        window.addEventListener('mouseup', () => app.onMouseUp());

        // Export Actions
        app.exportMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            app.exportDropdown.classList.toggle('open');
        });

        window.addEventListener('click', () => {
            app.exportDropdown.classList.remove('open');
            document.querySelectorAll('.dropdown-container').forEach(c => c.classList.remove('open'));
        });

        document.getElementById('exportJson').addEventListener('click', () => app.exportJson());
        document.getElementById('exportSvg').addEventListener('click', () => app.exportSvg());
        document.getElementById('exportPng').addEventListener('click', () => app.exportPng());
        document.getElementById('importBtn').addEventListener('click', () => app.triggerImport());

        // Line Settings
        document.getElementById('lineWidth').addEventListener('input', (e) => {
            const val = e.target.value;
            app.lineConfig.width = val;
            app.lineWidthValue.textContent = `${val}px`;
            app.updateLines();
        });

        // Zoom Controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            app.setZoom(app.zoom + 0.1);
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            app.setZoom(app.zoom - 0.1);
        });

        document.getElementById('zoomReset').addEventListener('click', () => {
            app.setZoom(1);
        });

        document.getElementById('lineColor').addEventListener('input', (e) => {
            app.lineConfig.color = e.target.value;
            app.updateLines();
            app.setupMarkers();
        });

        // Custom Select Dropdowns
        document.querySelectorAll('.custom-select').forEach(container => {
            const trigger = container.querySelector('.select-trigger');
            const items = container.querySelectorAll('.dropdown-item');
            const settingId = container.dataset.id.replace('line', '').toLowerCase();

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown-container').forEach(c => {
                    if (c !== container) c.classList.remove('open');
                });
                container.classList.toggle('open');
            });

            items.forEach(item => {
                item.addEventListener('click', () => {
                    const value = item.dataset.value;
                    const label = item.textContent;

                    container.querySelector('.selected-value').textContent = label;
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');

                    app.lineConfig[settingId] = value;
                    app.updateLines();
                    container.classList.remove('open');
                });
            });
        });
    }
}
