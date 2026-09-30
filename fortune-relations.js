// 歳運と日柱の関係。暦計算用配列とは独立した通常の干支番号を使用する。
(function (root) {
    const mod = (n, m) => ((n % m) + m) % m;
    const pairs = {
        '支合': [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]],
        '害': [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]],
        // 依頼者の図（S__15360014.jpg）の6組。ほかの関係と重なっても併記する。
        '破': [[0,9],[1,4],[2,11],[3,6],[5,8],[7,10]]
    };
    function relations(dayStem, dayBranch, stem, branch) {
        const result = [];
        const number = Array.from({length:60},(_,i)=>i).find(i=>i%10===dayStem && i%12===dayBranch);
        if (number === undefined) throw new Error('日柱の干支が不正です');
        const voidStart = mod(Math.floor(number / 10) * 10 + 10, 12);
        if (branch === voidStart || branch === mod(voidStart+1,12)) result.push('空亡');
        if (mod(stem-dayStem,10) === 5) result.push('干合');
        if (pairs['支合'].some(([a,b])=>(dayBranch===a&&branch===b)||(dayBranch===b&&branch===a))) result.push('支合');
        if (mod(branch-dayBranch,12) === 6) result.push('七冲');
        if (pairs['害'].some(([a,b])=>(dayBranch===a&&branch===b)||(dayBranch===b&&branch===a))) result.push('害');
        if (pairs['破'].some(([a,b])=>(dayBranch===a&&branch===b)||(dayBranch===b&&branch===a))) result.push('破');
        return result;
    }
    function years(chart, birthYear, currentYear, south) {
        const dayStem=chart.meishiki.tenkan[0], dayBranch=chart.meishiki.chishi[0];
        return Array.from({length:12},(_,i)=>{
            const year=currentYear-2+i, stem=mod(year-4,10), branch=mod(year-4+(south?6:0),12);
            return {year,age:year-birthYear,stem,branch,
                star:chart.findTsuhen(dayStem,stem), fortune:chart.findTwelveFortune(dayStem,branch),
                relations:relations(dayStem,dayBranch,stem,branch)};
        });
    }
    root.FortuneRelations = {relations,years};
    if (typeof document === 'undefined') return;
    const south = document.currentScript.dataset.hemisphere === 'south';
    const previous = root.displayDaiunTable;
    const addCell=(row,tag,text)=>{const cell=document.createElement(tag);cell.textContent=text;row.appendChild(cell);return cell;};
    root.displayDaiunTable = function(chart,birthdate,sex) {
        previous(chart,birthdate,sex);
        const subtitle=document.querySelector('#daiunTable h3');
        if(subtitle) subtitle.textContent=subtitle.textContent.replace(/^②\s*/, '');
        const [dayStem,dayBranch]=[chart.meishiki.tenkan[0],chart.meishiki.chishi[0]];
        const table=document.querySelector('#daiunTable table');
        addCell(table.querySelector('thead tr'),'th','関係').scope='col';
        table.querySelectorAll('tbody tr').forEach(row=>{
            const pair=row.cells[1].textContent;
            const values=relations(dayStem,dayBranch,kanshiData.kan.indexOf(pair[0]),kanshiData.shi.indexOf(pair[1]));
            addCell(row,'td',values.join('・')||'—');
        });
        const container=document.getElementById('annualFortune');
        if (!container) return;
        const currentYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Tokyo'}).format(new Date()));
        const rows=years(chart,birthdate.getUTCFullYear(),currentYear,south);
        container.replaceChildren();
        const heading=document.createElement('h2');heading.textContent='③さい運（1年ごとの運勢）';container.appendChild(heading);
        const note=document.createElement('p');note.className='annual-note';note.textContent='年齢はその年の誕生日に迎える年齢。関係は日柱との比較です。年の干支は立春で切り替わります。';container.appendChild(note);
        const scroll=document.createElement('div');scroll.className='annual-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','12年分のさい運');
        const annual=document.createElement('table');annual.className='annual-table';
        const head=annual.createTHead().insertRow();
        ['年','年齢','天干','地支','通変星','十二運','関係'].forEach(text=>{addCell(head,'th',text).scope='col';});
        const body=annual.createTBody();
        rows.forEach(item=>{
            const row=body.insertRow();row.dataset.year=item.year;
            if(item.year===currentYear){row.className='current-year';row.setAttribute('aria-current','date');}
            [item.year+'年',item.age<0?'出生前':item.age+'歳',kanshiData.kan[item.stem],kanshiData.shi[item.branch],kanshiData.tsuhen[item.star],kanshiData.twelve_fortune[item.fortune],item.relations.join('・')||'—'].forEach(text=>addCell(row,'td',text));
        });
        scroll.appendChild(annual);container.appendChild(scroll);
        const copyright=document.createElement('div');
        copyright.className='copyright';
        copyright.textContent='©Yukari Ikemotoのデザイン帝王学';
        container.appendChild(copyright);
    };
})(globalThis);
