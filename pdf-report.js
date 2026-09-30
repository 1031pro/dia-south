// 画面用CSSから分離したA4固定レイアウトで、各ページを個別にPDF化する。
(() => {
    const copyright = '©Yukari Ikemotoのデザイン帝王学';
    const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function copyTable(selector, kind) {
        const source = document.querySelector(selector);
        if (!source) throw new Error('先に命式を計算してください。');
        const table = source.cloneNode(true);
        table.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
        table.removeAttribute('id');
        table.className = kind;
        table.querySelectorAll('[style]').forEach(e=>e.removeAttribute('style'));
        return table.outerHTML;
    }
    const styles = `
        *{box-sizing:border-box} html,body{margin:0;padding:0;background:#e8edf1;font-family:Meiryo,'Hiragino Sans',sans-serif;color:#243673}
        .paper{position:relative;width:794px;height:1123px;padding:44px 48px 62px;background:white;overflow:hidden;margin:0 0 20px}
        header{border-bottom:2px solid #243673;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:end;gap:20px}
        h1{font-size:23px;margin:0 0 8px} .birth{font-size:12px;margin:0}.tag{font-size:12px;color:#637183;white-space:nowrap}
        section{margin:0 0 22px} h2{font-size:19px;color:#009fa5;margin:0 0 13px} .note{font-size:11px;color:#566681;margin:0 0 12px;line-height:1.6}
        table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:13px;line-height:1.45} th,td{border:1px solid #dccda5;padding:8px 6px;text-align:center;vertical-align:middle;overflow-wrap:anywhere}
        th{background:#6475b7;color:white;font-weight:normal} td{background:#fff} tbody tr:nth-child(even) td{background:#fafbfe}
        .meishiki td{height:34px}.meishiki th{width:25%}.meishiki .wood-cell{background:#44b547;color:white}.meishiki .fire-cell{background:#f0423a;color:white}.meishiki .earth-cell{background:#edb200;color:white}.meishiki .metal-cell{background:#b54cc4;color:white}.meishiki .water-cell{background:#00a0e8;color:white}
        .daiun th:first-child{width:24%}.daiun th:last-child{width:25%}.daiun td{padding:6px 5px}
        .annual th:first-child{width:16%}.annual th:last-child{width:23%}.annual th:nth-child(3),.annual th:nth-child(4){width:9%}.annual td{padding:6px 4px}.current-year td{background:#fff0bc!important;font-weight:bold}
        .social{display:block;width:310px;height:310px;object-fit:contain;margin:0 auto}
        .map{display:block;width:698px;height:698px;margin:36px auto 0}
        .keywords{font-size:17px}.keywords th{width:16.666%}.keywords td{height:122px;line-height:1.8}.keywords thead th{height:65px;color:#243673;font-weight:bold}.keywords tbody th{color:#243673;font-weight:bold}
        .keywords .wood-header{background:#e6f5e8}.keywords .fire-header{background:#ffe4df}.keywords .earth-header{background:#fff4cf}.keywords .metal-header{background:#f3eef8}.keywords .water-header{background:#e7f4ff}.keywords .corner-cell{background:#fff}.corner-content{font-size:12px;display:flex;flex-direction:column;gap:8px}
        footer{position:absolute;bottom:28px;left:48px;right:48px;border-top:1px solid #c5cbd7;padding-top:10px;font-size:10px;color:#647084;display:flex;justify-content:space-between}
    `;
    async function reportHTML() {
        await document.fonts.ready;
        const svg = document.querySelector('svg[data-life-map]');
        const chart = window.Chart && Chart.getChart('tsuhenChart');
        if (!svg || !chart) throw new Error('図の表示が完了してから、もう一度お試しください。');
        // 画面のCSSや縦横比に影響されない独立キャンバスに描画する。
        const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:600px;height:600px;';
        const shadow=host.attachShadow({mode:'open'}),canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;shadow.appendChild(canvas);document.body.appendChild(host);
        let social,printChart;
        try {
            printChart=new Chart(canvas,{type:'doughnut',plugins:chart.config.plugins,data:{labels:[...chart.data.labels],datasets:chart.data.datasets.map(d=>({...d,data:[...d.data]}))},options:{...chart.config.options,plugins:{...chart.config.options.plugins,datalabels:{...chart.config.options.plugins.datalabels,font:{weight:'bold',size:26}}},responsive:false,maintainAspectRatio:false,animation:false,devicePixelRatio:2}});
            printChart.update('none');social=canvas.toDataURL('image/png');
        } finally {if(printChart)printChart.destroy();host.remove();}
        const map='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
        const birth=`${document.getElementById('birth_year').value}年${document.getElementById('birth_month').value}月${document.getElementById('birth_day').value}日　${document.querySelector('input[name="sex"]:checked').value==='1'?'男性':'女性'}`;
        const filename='南半球版鑑定書_'+['birth_year','birth_month','birth_day'].map(id=>document.getElementById(id).value.padStart(2,'0')).join('')+'.pdf';
        const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
        const direction=document.querySelector('#daiunTable h3').textContent;
        const pages=[
            section('①命式',copyTable('#meishikiTable','meishiki'))+section('②大運',`<p class="note">${escape(direction)}</p>`+copyTable('#daiunTable table','daiun')),
            section('③さい運（1年ごとの運勢）',`<p class="note">${escape(document.querySelector('.annual-note').textContent)}</p>`+copyTable('#annualFortune table','annual'))+section('④ソシアルメーター',`<img class="social" src="${social}" alt="ソシアルメーター">`),
            section('⑤ライフエリアマップ',`<img class="map" src="${escape(map)}" alt="ライフエリアマップ">`),
            section('⑥行動キーワード',copyTable('#actionKeywordsTable','keywords'))
        ];
        return {filename,html:`<!doctype html><html lang="ja"><meta charset="utf-8"><style>${styles}</style><body>${pages.map((body,i)=>`<article class="paper"><header><div><h1>${i===0?'南半球版プロファイル鑑定書':'南半球版プロファイル鑑定'}</h1><p class="birth">生年月日：${escape(birth)}</p></div><span class="tag">${i+1} / ${pages.length}</span></header>${body}<footer><span>${copyright}</span><span>${i+1} / ${pages.length}</span></footer></article>`).join('')}</body></html>`};
    }
    window.generatePDF = async function () {
        if(document.getElementById('previewModal'))return;
        try {
            const report=await reportHTML();
            const modal=document.createElement('div');modal.id='previewModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-label','鑑定書プレビュー');
            modal.style.cssText='position:fixed;inset:0;background:#e8edf1;z-index:10000;overflow:auto;padding:80px 12px 24px;';
            const bar=document.createElement('div');bar.style.cssText='position:fixed;top:0;left:0;right:0;z-index:10001;background:white;padding:12px;display:flex;align-items:center;justify-content:center;gap:16px;box-shadow:0 1px 5px #aab;';
            const save=document.createElement('button');save.textContent='PDFを生成する';
            const close=document.createElement('button');close.id='closePreview';close.textContent='閉じる';
            bar.append(save,close);modal.appendChild(bar);
            const holder=document.createElement('div');holder.style.cssText='position:relative;margin:0 auto;';
            const frame=document.createElement('iframe');frame.title='鑑定書プレビュー';frame.style.cssText='width:794px;border:0;transform-origin:top left;display:block;';
            holder.appendChild(frame);modal.appendChild(holder);
            const loaded=new Promise(resolve=>frame.onload=resolve);frame.srcdoc=report.html;document.body.appendChild(modal);await loaded;
            const doc=frame.contentDocument;await doc.fonts.ready;await Promise.all(Array.from(doc.images).map(img=>img.decode()));
            const height=doc.body.scrollHeight;frame.style.height=height+'px';
            const fit=()=>{const scale=Math.min(1,(window.innerWidth-24)/794);frame.style.transform=`scale(${scale})`;holder.style.width=794*scale+'px';holder.style.height=height*scale+'px';};
            fit();window.addEventListener('resize',fit);
            close.onclick=()=>{window.removeEventListener('resize',fit);modal.remove();};
            save.onclick=async()=>{
                save.disabled=true;close.disabled=true;save.textContent='PDFを作成中…';
                try {
                    const pdf=new window.jspdf.jsPDF('p','mm','a4');
                    const pages=Array.from(doc.querySelectorAll('.paper'));
                    for(let i=0;i<pages.length;i++){
                        const page=pages[i];
                        if(page.scrollHeight>page.clientHeight+1)throw new Error('ページ内に収まらない内容があります。');
                        const canvas=await html2canvas(page,{scale:2.5,backgroundColor:'#ffffff',logging:false,windowWidth:794,windowHeight:1123,scrollX:0,scrollY:0});
                        if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
                    }
                    pdf.save(report.filename);
                    close.onclick();
                } catch(error){console.error(error);alert('PDFを生成できませんでした。'+error.message);}
                finally{save.disabled=false;close.disabled=false;save.textContent='PDFを生成する';}
            };
        } catch(error){document.getElementById('previewModal')?.remove();console.error(error);alert(error.message);}
    };
})();
