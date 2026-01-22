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
        app.secondaryColorPicker = document.getElementById('secondaryColor');
        app.secondaryIndicator = document.getElementById('secondaryIndicator');
        app.accentColorPicker = document.getElementById('accentColor');
        app.accentIndicator = document.getElementById('accentIndicator');
        app.keySelector = document.getElementById('keySelector');
        app.mappingTitle = document.getElementById('mappingTitle');
        app.menuBtns = document.querySelectorAll('.menu-btn');
        app.controllerDropdownItems = document.querySelectorAll('.controller-dropdown .dropdown-item');
        app.controllerDropdownTrigger = document.getElementById('controllerMenuBtn');
        app.currentControllerName = document.getElementById('currentControllerName');
        app.exportDropdown = document.querySelector('.export-dropdown');
        app.exportMenuBtn = document.getElementById('exportMenuBtn');
        app.lineWidthValue = document.getElementById('lineWidthValue');
        app.zoomLevelDisplay = document.getElementById('zoomLevel');
    }

    static attachListeners(app) {
        // Controller Type Switch
        const switchModal = document.getElementById('switchModal');
        const confirmBtn = document.getElementById('confirmSwitch');
        const cancelBtn = document.getElementById('cancelSwitch');

        // Helper for switching controller
        const switchController = async (newType, element) => {
            if (newType === app.currentType) return;

            if (app.labels.length > 0) {
                switchModal.classList.add('active');
                const userAction = await new Promise(resolve => {
                    const onConfirm = () => { cleanup(); resolve(true); };
                    const onCancel = () => { cleanup(); resolve(false); };
                    const cleanup = () => {
                        confirmBtn.removeEventListener('click', onConfirm);
                        cancelBtn.removeEventListener('click', onCancel);
                        switchModal.classList.remove('active');
                    };
                    confirmBtn.addEventListener('click', onConfirm);
                    cancelBtn.addEventListener('click', onCancel);
                });

                if (!userAction) return;
                app.clearLabels();
            }

            // Update all UI elements (both menu buttons and dropdown items)
            [...app.menuBtns, ...app.controllerDropdownItems].forEach(el => {
                el.classList.toggle('active', el.dataset.type === newType);
            });

            // Update dropdown trigger text
            if (app.currentControllerName) {
                app.currentControllerName.textContent = element.textContent;
            }

            await app.loadController(newType);
        };

        app.menuBtns.forEach(btn => {
            btn.addEventListener('click', () => switchController(btn.dataset.type, btn));
        });

        app.controllerDropdownItems.forEach(item => {
            item.addEventListener('click', () => switchController(item.dataset.type, item));
        });

        // Toggle Controller Dropdown
        if (app.controllerDropdownTrigger) {
            app.controllerDropdownTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                app.controllerDropdownTrigger.parentElement.classList.toggle('open');
            });
        }

        // Color Pickers
        app.colorPicker.addEventListener('input', (e) => {
            app.mainColor = e.target.value;
            app.updateControllerColor();
        });

        app.secondaryColorPicker.addEventListener('input', (e) => {
            app.secondaryColor = e.target.value;
            app.updateControllerColor();
        });

        app.accentColorPicker.addEventListener('input', (e) => {
            app.accentColor = e.target.value;
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
