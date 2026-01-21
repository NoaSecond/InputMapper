export class Storage {
    static exportJson(app) {
        const data = {
            title: app.mappingTitle.value || 'Untitled',
            type: app.currentType,
            color: app.backgroundColor,
            labels: app.labels.map(l => ({
                id: l.id,
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

    static async generateFullSvg(app, includeBackground = true) {

        const workspace = document.getElementById('workspace');
        const svgWrapper = document.getElementById('controllerSvgWrapper');
        const zoomStage = document.getElementById('zoomStage');

        const originalZoom = app.zoom;
        const originalTransition = zoomStage.style.transition;

        zoomStage.style.transition = 'none';
        app.setZoom(1);

        await new Promise(r => setTimeout(r, 200));
        await new Promise(r => requestAnimationFrame(r));

        const workspaceRect = workspace.getBoundingClientRect();
        const stageRect = zoomStage.getBoundingClientRect();
        const controllerSvg = svgWrapper.querySelector('svg');
        const controllerRect = controllerSvg.getBoundingClientRect();

        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', workspaceRect.width.toString());
        svg.setAttribute('height', workspaceRect.height.toString());
        svg.setAttribute('viewBox', `0 0 ${workspaceRect.width} ${workspaceRect.height}`);
        svg.setAttribute('xmlns', NS);
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // 0. Background Rect (more compatible than CSS style)
        if (includeBackground) {
            const bg = document.createElementNS(NS, 'rect');
            bg.setAttribute('width', '100%');
            bg.setAttribute('height', '100%');
            bg.setAttribute('fill', app.backgroundColor || '#0f172a');
            svg.appendChild(bg);
        }

        // 1. Defs
        const defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);

        // Include controller defs
        const controllerDefs = controllerSvg.querySelector('defs');
        if (controllerDefs) {
            Array.from(controllerDefs.childNodes).forEach(node => {
                if (node.nodeType === 1) defs.appendChild(node.cloneNode(true));
            });
        }

        // Main Content Group (Stage)
        const dx = stageRect.left - workspaceRect.left;
        const dy = stageRect.top - workspaceRect.top;
        const mainGroup = document.createElementNS(NS, 'g');
        mainGroup.setAttribute('transform', `translate(${dx}, ${dy})`);
        svg.appendChild(mainGroup);

        // 2. Controller
        const gController = document.createElementNS(NS, 'g');
        const cx = controllerRect.left - stageRect.left;
        const cy = controllerRect.top - stageRect.top;

        // Calculate scale from viewBox
        let scaleX = 1, scaleY = 1, vbX = 0, vbY = 0;
        if (controllerSvg.viewBox && controllerSvg.viewBox.baseVal) {
            const vb = controllerSvg.viewBox.baseVal;
            vbX = vb.x;
            vbY = vb.y;
            if (vb.width > 0 && vb.height > 0) {
                scaleX = controllerRect.width / vb.width;
                scaleY = controllerRect.height / vb.height;
            }
        } else {
            // Fallback if no viewBox (unlikely for SVG) or if using width/height attributes
            // Ideally we assume viewBox exists as it's standard for this app's controllers
        }

        gController.setAttribute('transform', `translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-vbX}, ${-vbY})`);
        Array.from(controllerSvg.childNodes).forEach(node => {
            if (node.nodeName.toLowerCase() !== 'defs') gController.appendChild(node.cloneNode(true));
        });
        mainGroup.appendChild(gController);

        // 3. Lines
        const gLines = document.createElementNS(NS, 'g');
        const gMarkers = document.createElementNS(NS, 'g'); // New group for baked markers
        const strokeColor = (app.lineConfig && app.lineConfig.color) || '#cebbbb';
        const strokeWidth = (app.lineConfig && app.lineConfig.width) || 2;

        Array.from(app.linesContainer.childNodes).forEach(node => {
            if (node.nodeName.toLowerCase() === 'path') {
                // 1. Clone the line
                const pathClone = document.createElementNS(NS, 'path');
                pathClone.setAttribute('d', node.getAttribute('d'));
                pathClone.setAttribute('fill', 'none');
                pathClone.setAttribute('stroke', strokeColor);
                pathClone.setAttribute('stroke-width', strokeWidth.toString());
                pathClone.setAttribute('stroke-linecap', 'round');

                const dash = node.getAttribute('stroke-dasharray');
                if (dash) pathClone.setAttribute('stroke-dasharray', dash);

                gLines.appendChild(pathClone);

                // 2. Bake the marker (if any)
                if (app.lineConfig && app.lineConfig.end && app.lineConfig.end !== 'none') {
                    try {
                        const len = node.getTotalLength();
                        if (len > 0) {
                            const p = node.getPointAtLength(len);
                            const pPrev = node.getPointAtLength(Math.max(0, len - 2)); // Go back 2px to get tangent
                            const angle = Math.atan2(p.y - pPrev.y, p.x - pPrev.x) * 180 / Math.PI;

                            const markerGroup = document.createElementNS(NS, 'g');
                            markerGroup.setAttribute('transform', `translate(${p.x}, ${p.y}) rotate(${angle})`);

                            let shape;
                            const size = Math.max(10, strokeWidth * 3); // Ensure minimum visible size

                            if (app.lineConfig.end === 'ball') {
                                shape = document.createElementNS(NS, 'circle');
                                shape.setAttribute('r', (size / 2).toString());
                                shape.setAttribute('fill', strokeColor);
                            } else if (app.lineConfig.end === 'square') {
                                shape = document.createElementNS(NS, 'rect');
                                shape.setAttribute('x', (-size / 2).toString());
                                shape.setAttribute('y', (-size / 2).toString());
                                shape.setAttribute('width', size.toString());
                                shape.setAttribute('height', size.toString());
                                shape.setAttribute('fill', strokeColor);
                            } else if (app.lineConfig.end === 'arrow') {
                                shape = document.createElementNS(NS, 'path');
                                // Arrow pointing along the line (which is angle 0 in the rotated group)
                                // Tip at (0,0), wings back
                                shape.setAttribute('d', `M 0 0 L ${-size} ${-size / 2} L ${-size} ${size / 2} Z`);
                                shape.setAttribute('fill', strokeColor);
                            }

                            if (shape) {
                                markerGroup.appendChild(shape);
                                gMarkers.appendChild(markerGroup);
                            }
                        }
                    } catch (err) {
                        // Silent fail
                    }
                }
            }
        });
        mainGroup.appendChild(gLines);
        mainGroup.appendChild(gMarkers); // Append markers after lines

        // 4. Labels
        const gLabels = document.createElementNS(NS, 'g');
        for (const l of app.labels) {
            const lRect = l.element.getBoundingClientRect();
            const lx = lRect.left - stageRect.left;
            const ly = lRect.top - stageRect.top;

            const gLabel = document.createElementNS(NS, 'g');
            gLabel.setAttribute('transform', `translate(${lx}, ${ly})`);

            const rect = document.createElementNS(NS, 'rect');
            rect.setAttribute('width', lRect.width.toString());
            rect.setAttribute('height', lRect.height.toString());
            rect.setAttribute('rx', '12');
            rect.setAttribute('fill', '#1e293b');
            rect.setAttribute('stroke', 'rgba(255,255,255,0.2)');
            gLabel.appendChild(rect);

            const iconImg = l.element.querySelector('.key-icon');
            if (iconImg) {
                const iconSvgContent = await this.getSvgContent(iconImg.src);
                if (iconSvgContent) {
                    const nestedIconSvg = iconSvgContent.cloneNode(true);
                    const iconSize = 24;
                    const iconY = (lRect.height - iconSize) / 2;
                    nestedIconSvg.setAttribute('x', "12");
                    nestedIconSvg.setAttribute('y', iconY.toString());
                    nestedIconSvg.setAttribute('width', iconSize.toString());
                    nestedIconSvg.setAttribute('height', iconSize.toString());
                    nestedIconSvg.removeAttribute('style');
                    nestedIconSvg.removeAttribute('class');
                    gLabel.appendChild(nestedIconSvg);
                }
            }

            const input = l.element.querySelector('textarea, input');
            if (input) {
                const text = document.createElementNS(NS, 'text');
                text.setAttribute('x', iconImg ? "44" : "16");
                text.setAttribute('fill', 'white');
                text.setAttribute('font-family', 'Inter, sans-serif');
                text.setAttribute('font-size', '14px');
                text.setAttribute('font-weight', '500');

                const val = input.value || '';
                const lines = val.split('\n');
                const lineHeight = 18; // Approx 1.4 * 14px

                // Vertical centering adjustment for multiline
                const totalTextHeight = (lines.length - 1) * lineHeight;
                const startY = (lRect.height / 2) - (totalTextHeight / 2) + 4; // +4 for visual baseline tweak

                lines.forEach((line, index) => {
                    const tspan = document.createElementNS(NS, 'tspan');
                    tspan.textContent = line || ' ';
                    tspan.setAttribute('x', iconImg ? "44" : "16");
                    tspan.setAttribute('y', (startY + (index * lineHeight)).toString());
                    text.appendChild(tspan);
                });

                gLabel.appendChild(text);
            }
            gLabels.appendChild(gLabel);
        }
        mainGroup.appendChild(gLabels);

        app.setZoom(originalZoom);
        zoomStage.style.transition = originalTransition;


        return svg;
    }

    static async getSvgContent(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'image/svg+xml');
            const svgEl = doc.querySelector('svg');
            if (svgEl && !svgEl.getAttribute('xmlns')) {
                svgEl.setAttribute('xmlns', "http://www.w3.org/2000/svg");
            }
            return svgEl;
        } catch (e) { return null; }
    }

    static async exportSvg(app) {
        const svg = await this.generateFullSvg(app, false);
        const svgData = new XMLSerializer().serializeToString(svg);

        // 1. Download SVG
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.mappingTitle.value || 'Untitled Mapping'}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }



    static async exportPng(app) {
        const svg = await this.generateFullSvg(app, false);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `${app.mappingTitle.value || 'Untitled Mapping'}.png`;
            a.click();
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    static triggerImport(app) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    app.importMapping(JSON.parse(re.target.result));
                } catch (err) { alert("Failed to parse the file."); }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
