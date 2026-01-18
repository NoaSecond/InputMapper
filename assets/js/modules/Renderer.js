export class Renderer {
    static updateLines(app) {
        app.linesContainer.innerHTML = '';
        const zoomStage = document.getElementById('zoomStage');
        if (!zoomStage) return;

        const stageRect = zoomStage.getBoundingClientRect();
        const zoom = app.zoom;

        this.setupMarkers(app);

        app.labels.forEach(label => {
            const labelRect = label.element.getBoundingClientRect();
            const svg = app.svgWrapper.querySelector('svg');
            if (!svg) return;
            const svgRect = svg.getBoundingClientRect();

            // Calculate positions relative to stage, adjusting for visual scale
            const startX = (labelRect.left - stageRect.left) / zoom + (labelRect.width / zoom) / 2;
            const startY = (labelRect.top - stageRect.top) / zoom + (labelRect.height / zoom) / 2;

            const endX = (svgRect.left - stageRect.left) / zoom + (svgRect.width / zoom * label.targetX);
            const endY = (svgRect.top - stageRect.top) / zoom + (svgRect.height / zoom * label.targetY);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            let d = '';
            if (app.lineConfig.type === 'straight') {
                d = `M ${startX} ${startY} L ${endX} ${endY}`;
            } else if (app.lineConfig.type === 'curved') {
                const cp1x = startX;
                const cp1y = endY;
                d = `M ${startX} ${startY} Q ${cp1x} ${cp1y} ${endX} ${endY}`;
            } else if (app.lineConfig.type === 'angle') {
                d = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
            }

            path.setAttribute('d', d);
            path.setAttribute('stroke', app.lineConfig.color);
            path.setAttribute('stroke-width', app.lineConfig.width);
            path.setAttribute('fill', 'none');

            if (app.lineConfig.style === 'dashed') {
                path.setAttribute('stroke-dasharray', '8 4');
            } else if (app.lineConfig.style === 'dotted') {
                path.setAttribute('stroke-dasharray', '2 4');
            }

            if (app.lineConfig.end !== 'none') {
                path.setAttribute('marker-end', `url(#marker-${app.lineConfig.end})`);
            }

            app.linesContainer.appendChild(path);
        });
    }

    static setupMarkers(app) {
        let defs = app.linesContainer.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            app.linesContainer.appendChild(defs);
        }
        defs.innerHTML = `
            <marker id="marker-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="${app.lineConfig.color}" />
            </marker>
            <marker id="marker-ball" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <circle cx="5" cy="5" r="5" fill="${app.lineConfig.color}" />
            </marker>
            <marker id="marker-square" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <rect x="0" y="0" width="10" height="10" fill="${app.lineConfig.color}" />
            </marker>
        `;
    }
}
