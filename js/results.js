// Results view — renders ranked match results

function scoreBar(score) {
  const pct = Math.min(Math.round(score), 100);
  const color = pct >= 75 ? '#27ae60' : pct >= 45 ? '#f39c12' : '#e74c3c';
  return `<div class="score-bar-wrap"><div class="score-bar" style="width:${pct}%;background:${color}"></div></div>`;
}

function missBadge(count) {
  if (count === 0) return '<span class="miss-badge miss-none">&#10003; Perfect</span>';
  const cls = count <= 3 ? 'miss-warn' : 'miss-bad';
  return `<span class="miss-badge ${cls}">${count} miss${count !== 1 ? 'es' : ''}</span>`;
}

function deltaTable(deltaArr) {
  if (!deltaArr || deltaArr.length === 0) return '';
  const rows = deltaArr.map(d => {
    const scoreVal = parseFloat(d.score || 0);
    const scorePct = Math.round(scoreVal * 100);
    const barColor = scorePct >= 75 ? '#27ae60' : scorePct >= 40 ? '#f39c12' : '#e74c3c';
    return `<tr>
      <td class="delta-spec">${d.spec || '—'}</td>
      <td class="delta-type">${d.match_type || ''}</td>
      <td class="delta-val">${d.customer ?? '—'}</td>
      <td class="delta-val">${d.catalog ?? '—'}</td>
      <td><div class="delta-bar-wrap"><div class="delta-bar" style="width:${scorePct}%;background:${barColor}"></div></div></td>
    </tr>`;
  }).join('');
  return `<table class="delta-table">
    <thead><tr>
      <th>Spec</th><th>Type</th><th>You asked</th><th>Catalog has</th><th>Match</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderResults(results, productTypeName) {
  const titleEl   = document.getElementById('results-product-type-name');
  const countEl   = document.getElementById('results-count');
  const tableBody = document.getElementById('results-tbody');
  const emptyEl   = document.getElementById('results-empty');
  const tableWrap = document.getElementById('results-table-wrap');

  titleEl.textContent = productTypeName;

  if (!results || results.length === 0) {
    emptyEl.classList.remove('hidden');
    tableWrap.classList.add('hidden');
    countEl.textContent = '';
    return;
  }

  emptyEl.classList.add('hidden');
  tableWrap.classList.remove('hidden');
  countEl.textContent = `${results.length} match${results.length !== 1 ? 'es' : ''} found`;

  tableBody.innerHTML = '';
  results.forEach((row, i) => {
    const score      = parseFloat(row.out_score || 0);
    const deltaArr   = Array.isArray(row.out_delta_notes) ? row.out_delta_notes : [];
    const missCount  = deltaArr.length;
    const detailId   = `delta-${i}`;
    const hasDetail  = missCount > 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-cell">${row.out_rank ?? i + 1}</td>
      <td>${row.out_brand || '\u2014'}</td>
      <td class="mono">${row.out_part_number || '\u2014'}</td>
      <td>
        <span class="score-label">${score.toFixed(1)}</span>
        ${scoreBar(score)}
      </td>
      <td class="priority-cell">${row.out_vendor_priority === 9999 ? '\u2014' : (row.out_vendor_priority ?? '\u2014')}</td>
      <td class="miss-cell">
        ${hasDetail
          ? `<button class="miss-toggle" aria-expanded="false" data-target="${detailId}">${missBadge(missCount)}</button>`
          : missBadge(missCount)
        }
      </td>
    `;
    tableBody.appendChild(tr);

    if (hasDetail) {
      const detailTr = document.createElement('tr');
      detailTr.id = detailId;
      detailTr.className = 'delta-row hidden';
      detailTr.innerHTML = `<td colspan="6">${deltaTable(deltaArr)}</td>`;
      tableBody.appendChild(detailTr);
    }
  });

  // Toggle delta rows
  tableBody.querySelectorAll('.miss-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      target.classList.toggle('hidden', expanded);
    });
  });
}
