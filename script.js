const PERIODOS = [
    {id: 1, label: "07:00 / 07:50", mIni: 420, mFin: 470}, {id: 2, label: "07:50 / 08:40", mIni: 470, mFin: 520},
    {id: 3, label: "08:50 / 09:40", mIni: 530, mFin: 580}, {id: 4, label: "09:40 / 10:30", mIni: 580, mFin: 630},
    {id: 5, label: "10:40 / 11:30", mIni: 640, mFin: 690}, {id: 6, label: "11:30 / 12:20", mIni: 690, mFin: 740},
    {id: 7, label: "12:20 / 13:10", mIni: 740, mFin: 790}, {id: 8, label: "13:10 / 14:00", mIni: 790, mFin: 840},
    {id: 9, label: "14:00 / 14:50", mIni: 840, mFin: 890}, {id: 10, label: "14:50 / 15:40", mIni: 890, mFin: 940},
    {id: 11, label: "15:50 / 16:40", mIni: 950, mFin: 1000}, {id: 12, label: "16:40 / 17:30", mIni: 1000, mFin: 1050},
    {id: 13, label: "17:40 / 18:30", mIni: 1060, mFin: 1110}, {id: 14, label: "18:30 / 19:20", mIni: 1110, mFin: 1160},
    {id: 15, label: "25min", mIni: 1160, mFin: 1185, receso: true}, {id: 16, label: "19:45 / 21:15", mIni: 1185, mFin: 1275}
];

let database = JSON.parse(localStorage.getItem('horario_jc_v10')) || [];

const sM = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };

function formatScheduleSummaryHTML(horarios) {
    if (!horarios || horarios.length === 0) return `<span class="time-badge">Sin horario</span>`;
    const diasNombres = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const gruposPorHora = {};
    horarios.forEach(h => {
        const key = `${h.hIni} - ${h.hFin}`;
        if (!gruposPorHora[key]) gruposPorHora[key] = [];
        gruposPorHora[key].push(h.dia);
    });
    return Object.keys(gruposPorHora).map(hora => {
        const dias = gruposPorHora[hora].sort((a,b) => a-b);
        const esConsecutivo = dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i-1] + 1);
        let diasStr = esConsecutivo ? `${diasNombres[dias[0]]} a ${diasNombres[dias[dias.length-1]]}` : 
                      dias.length === 2 ? `${diasNombres[dias[0]]}-${diasNombres[dias[1]]}` : dias.map(d => diasNombres[d]).join(', ');
        return `<span class="time-badge">${diasStr} ${hora}</span>`;
    }).join('');
}

function renderList() {
    const list = document.getElementById('listaCursos');
    list.innerHTML = database.map((c, i) => {
        const g = c.grupoSeleccionado || Object.keys(c.grupos)[0];
        const resumenHTML = formatScheduleSummaryHTML(c.grupos[g] || []);
        return `<div class="card-curso" style="border-left-color: ${c.color}">
            <button onclick="openModal(${i})" class="btn-editar-card">Editar</button>
            <div class="curso-info-content"><strong>${c.nombre}</strong><div class="time-badges-list">${resumenHTML}</div></div>
            <select onchange="database[${i}].grupoSeleccionado=this.value; localStorage.setItem('horario_jc_v10', JSON.stringify(database)); renderList();" style="width:100%; padding:8px; background:#333; color:white; border:none; margin-top:10px;">
                ${Object.keys(c.grupos).map(gn => `<option value="${gn}" ${g == gn ? 'selected' : ''}>Grupo ${gn}</option>`).join('')}</select></div>`;
    }).join('');
}

function showSchedule() {
    document.getElementById('view-setup').style.display='none'; document.getElementById('view-schedule').style.display='block';
    const tbody = document.getElementById('tableBody'); tbody.innerHTML = "";
    let ocupacion = {}; 

    database.forEach(c => {
        const g = c.grupoSeleccionado || Object.keys(c.grupos)[0];
        if (c.grupos[g]) {
            c.grupos[g].forEach(b => {
                const startM = sM(b.hIni); const endM = sM(b.hFin);
                PERIODOS.forEach(p => {
                    if (startM < p.mFin && endM > p.mIni && !p.receso) {
                        const key = `${p.id}-${b.dia}`; if (!ocupacion[key]) ocupacion[key] = [];
                        ocupacion[key].push({n: c.nombre, g, col: c.color, startM, endM, pIni: p.mIni, pFin: p.mFin});
                    }
                });
            });
        }
    });

    let rendered = new Set();
    PERIODOS.forEach((p, i) => {
        if (p.receso) { tbody.innerHTML += `<tr style="background:#fffde7"><td class="hora-col">P15</td><td colspan="6">RECESO 25min</td></tr>`; return; }
        let fila = `<tr><td class="hora-col">${p.label}</td>`;
        for (let d = 1; d <= 6; d++) {
            const key = `${p.id}-${d}`; if (rendered.has(key)) continue;
            const cls = ocupacion[key] || [];
            if (cls.length === 0) fila += `<td></td>`;
            else {
                let curr = cls[0]; let rowspan = 1; let next = i + 1;
                while (next < PERIODOS.length) {
                    const nK = `${PERIODOS[next].id}-${d}`; const nC = ocupacion[nK] || [];
                    if (nC.length === 1 && nC[0].n === curr.n) { rowspan++; rendered.add(nK); next++; } else break;
                }
                const ultP = PERIODOS[i + rowspan - 1];
                let pt = curr.startM > curr.pIni ? (curr.startM - curr.pIni)*0.75 : 0;
                let pb = curr.endM < ultP.mFin ? (ultP.mFin - curr.endM)*0.75 : 0;
                fila += `<td rowspan="${rowspan}" style="vertical-align:top;padding-top:${pt}px!important;padding-bottom:${pb}px!important;">
                <div class="bloque-clase" style="background:${curr.col}15;color:${curr.col};border-color:${curr.col}">${curr.n}<br>(${curr.g})</div></td>`;
            }
        }
        tbody.innerHTML += fila + "</tr>";
    });
}

function openModal(idx = -1) { 
    document.getElementById('modalCurso').style.display='block'; document.getElementById('editIndex').value=idx;
    const cont = document.getElementById('groups-container'); cont.innerHTML = "";
    if (idx > -1) {
        const c = database[idx]; document.getElementById('courseName').value=c.nombre; document.getElementById('courseColor').value=c.color;
        Object.keys(c.grupos).forEach(g => renderGroupUI(g, c.grupos[g]));
    } else { document.getElementById('courseName').value=""; renderGroupUI("A"); }
}

function renderGroupUI(gName, horarios = []) {
    const div = document.createElement('div'); div.className = 'group-section'; div.dataset.group = gName;
    div.innerHTML = `<h5>Grupo ${gName}</h5><button class="btn-del-group" onclick="this.parentElement.remove()">X</button><div class="h-list"></div><button onclick="addTimeRow(this)">+ Hora</button>`;
    document.getElementById('groups-container').appendChild(div);
    if (horarios.length > 0) {
        const agrupa = {}; horarios.forEach(h => { const k = `${h.hIni}-${h.hFin}`; if(!agrupa[k]) agrupa[k] = []; agrupa[k].push(h.dia); });
        Object.keys(agrupa).forEach(k => { const [i, f] = k.split('-'); addTimeRow(div.querySelector('button'), agrupa[k], i, f); });
    } else addTimeRow(div.querySelector('button'));
}

function addTimeRow(btn, diasSel = [1], hIni="07:00", hFin="08:40") {
    const row = document.createElement('div'); row.className = "horario-row-item";
    let checklist = `<div style="display:flex; flex-wrap:wrap; gap:4px; background:#333; padding:5px; border-radius:4px; margin-bottom:5px;">`;
    ["Lun","Mar","Mie","Jue","Vie","Sab"].forEach((d, i) => { checklist += `<label style="font-size:10px;"><input type="checkbox" value="${i+1}" ${diasSel.includes(i+1)?'checked':''}> ${d}</label>`; });
    row.innerHTML = checklist + `</div><div style="display:flex; gap:5px;"><input type="time" class="i" value="${hIni}"><input type="time" class="f" value="${hFin}"><button onclick="this.parentElement.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer">×</button></div>`;
    btn.previousElementSibling.appendChild(row);
}

function saveCourse() {
    const idx = parseInt(document.getElementById('editIndex').value);
    const name = document.getElementById('courseName').value; const color = document.getElementById('courseColor').value;
    let grupos = {}; document.querySelectorAll('.group-section').forEach(s => {
        let lista = []; s.querySelectorAll('.horario-row-item').forEach(row => {
            const ini = row.querySelector('.i').value; const fin = row.querySelector('.f').value;
            row.querySelectorAll('input:checked').forEach(cb => { lista.push({ dia: parseInt(cb.value), hIni: ini, hFin: fin }); });
        });
        grupos[s.dataset.group] = lista;
    });
    if (idx > -1) database[idx] = { ...database[idx], nombre: name, color, grupos };
    else database.push({ nombre: name, color, grupos, grupoSeleccionado: Object.keys(grupos)[0] || "A" });
    localStorage.setItem('horario_jc_v10', JSON.stringify(database)); renderList(); closeModal();
}

function downloadImage() { html2canvas(document.getElementById('capture-area'), { scale: 3 }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL(); a.download = 'Horario.png'; a.click(); }); }
function exportData() { const b = new Blob([JSON.stringify(database)], {type:'text/plain'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download='Backup_JC.txt'; a.click(); }
function importData(e) { const r = new FileReader(); r.onload = (ev) => { database = JSON.parse(ev.target.result); localStorage.setItem('horario_jc_v10', JSON.stringify(database)); renderList(); }; r.readAsText(e.target.files[0]); }
function eliminarTodo() { if(confirm("¿Borrar todo?")) { database = []; localStorage.setItem('horario_jc_v10', "[]"); renderList(); } }
function confirmarEliminarCurso() { if(confirm("¿Eliminar curso?")) { database.splice(document.getElementById('editIndex').value, 1); localStorage.setItem('horario_jc_v10', JSON.stringify(database)); renderList(); closeModal(); } }
function showSetup() { document.getElementById('view-schedule').style.display='none'; document.getElementById('view-setup').style.display='block'; }
function closeModal() { document.getElementById('modalCurso').style.display = 'none'; }
function addNewGroupSection() { renderGroupUI(String.fromCharCode(65 + document.querySelectorAll('.group-section').length)); }
document.addEventListener('DOMContentLoaded', renderList);