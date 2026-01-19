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

        // Force zoom 1 and disable transition for export calculations
        zoomStage.style.transition = 'none';
        app.setZoom(1);

        // Wait a frame for layout to settle
        await new Promise(r => requestAnimationFrame(r));

        const workspaceRect = workspace.getBoundingClientRect();
        const controllerSvg = svgWrapper.querySelector('svg');
        const controllerRect = controllerSvg.getBoundingClientRect();

        // Create main SVG with all namespaces
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', workspaceRect.width);
        svg.setAttribute('height', workspaceRect.height);
        svg.setAttribute('viewBox', `0 0 ${workspaceRect.width} ${workspaceRect.height}`);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        if (includeBackground) {
            svg.style.backgroundColor = app.backgroundColor;
        }

        // 1. Defs consolidation
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.appendChild(defs);

        // Add markers
        const color = app.lineConfig ? app.lineConfig.color : '#3b82f6';
        defs.innerHTML = `
            <marker id="marker-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" />
            </marker>
            <marker id="marker-ball" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <circle cx="5" cy="5" r="5" fill="${color}" />
            </marker>
            <marker id="marker-square" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <rect x="0" y="0" width="10" height="10" fill="${color}" />
            </marker>
        `;

        // Include defs from controller SVG (important for clip-paths, gradients, etc)
        const controllerDefs = controllerSvg.querySelector('defs');
        if (controllerDefs) {
            Array.from(controllerDefs.childNodes).forEach(node => {
                defs.appendChild(node.cloneNode(true));
            });
        }

        // 2. Controller Rendering
        const controllerClone = controllerSvg.cloneNode(true);
        const gController = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const cx = controllerRect.left - workspaceRect.left;
        const cy = controllerRect.top - workspaceRect.top;
        gController.setAttribute('transform', `translate(${cx}, ${cy})`);

        // Flatten controller content into group (skipping its original defs as we merged them)
        Array.from(controllerClone.childNodes).forEach(node => {
            if (node.nodeName !== 'defs') {
                gController.appendChild(node.cloneNode(true));
            }
        });
        svg.appendChild(gController);

        // 3. Lines Rendering
        const gLines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        Array.from(app.linesContainer.childNodes).forEach(node => {
            if (node.nodeName === 'path') {
                const pathClone = node.cloneNode(true);
                // Fix: Ensure marker-end uses a local reference (some browsers add the full URL)
                const markerEnd = pathClone.getAttribute('marker-end');
                if (markerEnd && markerEnd.includes('#')) {
                    const markerId = markerEnd.split('#').pop().replace(/["')]/g, '');
                    pathClone.setAttribute('marker-end', `url(#${markerId})`);
                }
                gLines.appendChild(pathClone);
            }
        });
        svg.appendChild(gLines);

        // 4. Labels Rendering
        for (const l of app.labels) {
            const lRect = l.element.getBoundingClientRect();
            const lx = lRect.left - workspaceRect.left;
            const ly = lRect.top - workspaceRect.top;

            const gLabel = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gLabel.setAttribute('transform', `translate(${lx}, ${ly})`);

            // Background rect
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', lRect.width);
            rect.setAttribute('height', lRect.height);
            rect.setAttribute('rx', 12);
            rect.setAttribute('fill', '#1e293b');
            rect.setAttribute('stroke', 'rgba(255,255,255,0.2)');
            gLabel.appendChild(rect);

            // Icon (Vector SVG embedding)
            const iconImg = l.element.querySelector('.key-icon');
            if (iconImg) {
                const iconSvgContent = await this.getSvgContent(iconImg.src);
                if (iconSvgContent) {
                    // Use nested SVG for better scaling and automatic clipping
                    const nestedIconSvg = iconSvgContent.cloneNode(true);
                    const iconSize = 24;
                    const iconY = (lRect.height - iconSize) / 2;

                    nestedIconSvg.setAttribute('x', 12);
                    nestedIconSvg.setAttribute('y', iconY);
                    nestedIconSvg.setAttribute('width', iconSize);
                    nestedIconSvg.setAttribute('height', iconSize);

                    // Remove fixed dimensions if they exist to let viewBox take over
                    nestedIconSvg.removeAttribute('width');
                    nestedIconSvg.removeAttribute('height');
                    nestedIconSvg.setAttribute('width', iconSize);
                    nestedIconSvg.setAttribute('height', iconSize);

                    gLabel.appendChild(nestedIconSvg);
                }
            }

            // Text
            const input = l.element.querySelector('input');
            if (input) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = input.value;
                text.setAttribute('x', iconImg ? 44 : 16);
                text.setAttribute('y', lRect.height / 2 + 5);
                text.setAttribute('fill', 'white');
                text.setAttribute('font-family', 'Inter, sans-serif');
                text.setAttribute('font-size', '14px');
                text.setAttribute('font-weight', '500');
                gLabel.appendChild(text);
            }

            svg.appendChild(gLabel);
        }

        // Restore state
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
            return doc.querySelector('svg');
        } catch (e) {
            console.warn("Failed to fetch SVG content for embedding", e);
            return null;
        }
    }


    // Improved Base64 converter with Canvas fallback
    static async imgToBase64(imgElementOrUrl) {
        let url = typeof imgElementOrUrl === 'string' ? imgElementOrUrl : imgElementOrUrl.src;

        // Strategy 1: Fetch (works for http/https)
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            // Strategy 2: Canvas draw (works for loaded local images where fetch fails)
            if (typeof imgElementOrUrl !== 'string' && imgElementOrUrl.complete) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElementOrUrl.naturalWidth || 24;
                    canvas.height = imgElementOrUrl.naturalHeight || 24;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgElementOrUrl, 0, 0);
                    return canvas.toDataURL('image/png');
                } catch (err) {
                    console.warn("Canvas conversion failed", err);
                }
            }
            return url; // Fallback to original URL
        }
    }

    static async exportSvg(app) {
        const svg = await this.generateFullSvg(app, false);
        const svgData = new XMLSerializer().serializeToString(svg);
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
        const title = app.mappingTitle.value || 'mapping';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);

            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${title}.png`;
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
                    const data = JSON.parse(re.target.result);
                    app.importMapping(data);
                } catch (err) {
                    console.error("Import failed:", err);
                    alert("Failed to parse the file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
