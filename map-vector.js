// Keep the background, glyphs and calculated triangle as vectors in the browser.
(() => {
    const asset = new URL(document.currentScript.dataset.background, location.href);
    let template;
    let generation = 0;
    window.drawKanshiTriangle = async function (chart) {
        const version = ++generation;
        const container = document.getElementById('triangleContainer');
        try {
            template ||= fetch(asset).then(response => {
                if (!response.ok) throw new Error('Map SVG: ' + response.status);
                return response.text();
            }).catch(error => { template = null; throw error; });
            const source = await template;
            if (version !== generation) return;
            const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
            svg.setAttribute('data-life-map', '');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', 'ライフエリアマップ');
            svg.setAttribute('style', 'display:block;width:100%;max-width:600px;height:auto;margin:0 auto;');
            const ns = 'http://www.w3.org/2000/svg';
            const add = (parent, name, attrs, text) => {
                const node = document.createElementNS(ns, name);
                Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key,value));
                if (text !== undefined) node.textContent = text;
                parent.appendChild(node);
                return node;
            };
            const group = add(svg, 'g', {transform: 'scale(' + 1331 / 600 + ')', 'data-triangle': ''});
            const points = chart.meishiki.tenkan.slice(0,3).map((kan,i) => getKanshiNumber(kan,chart.meishiki.chishi[i])).filter(n => n >= 1 && n <= 60);
            const position = (n,r) => {
                const angle = (n * 6 - 93) * Math.PI / 180;
                return [300 + r * Math.cos(angle), 300 + r * Math.sin(angle)];
            };
            add(group, 'polygon', {points:points.map(n => position(n,145).join(',')).join(' '), fill:'none',stroke:'#243673','stroke-width':2});
            points.forEach(n => {
                const [cx,cy] = position(n,145);
                add(group,'circle',{cx,cy,r:5,fill:'none',stroke:'#243673','stroke-width':2});
                const [x,y] = position(n,129);
                add(group,'text',{x,y,fill:'#243673','font-size':16,'font-family':'Meiryo,sans-serif','text-anchor':'middle','dominant-baseline':'central'},String(n));
            });
            const old = container.querySelector('[data-life-map], #triangleCanvas');
            old.replaceWith(document.importNode(svg,true));
            container.style.display = 'block';
            const keywords = document.getElementById('actionKeywordsContainer');
            if (keywords) keywords.style.display = 'block';
        } catch (error) {
            console.error(error);
        }
    };
})();
