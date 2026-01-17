export class Storage {
    static exportJson(app) {
        const data = {
            title: app.mappingTitle.value || 'Untitled',
            type: app.currentType,
            color: app.backgroundColor,
            labels: app.labels.map(l => ({
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

    static async exportSvg(app) {
        // Clone workspace for export
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const workspaceRect = app.workspace.getBoundingClientRect();
        svg.setAttribute('width', workspaceRect.width);
        svg.setAttribute('height', workspaceRect.height);
        svg.setAttribute('viewBox', `0 0 ${workspaceRect.width} ${workspaceRect.height}`);
        svg.style.backgroundColor = app.backgroundColor;

        // Add controller SVG content
        const controllerSvg = app.svgWrapper.querySelector('svg').cloneNode(true);
        const controllerRect = app.svgWrapper.querySelector('svg').getBoundingClientRect();
        controllerSvg.setAttribute('x', controllerRect.left - workspaceRect.left);
        controllerSvg.setAttribute('y', controllerRect.top - workspaceRect.top);
        svg.appendChild(controllerSvg);

        // Add Lines
        const lines = app.linesContainer.cloneNode(true);
        svg.appendChild(lines);

        // Add Labels
        app.labels.forEach(l => {
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
        a.download = `${app.mappingTitle.value || 'mapping'}.svg`;
        a.click();
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
