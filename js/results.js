// Results view — renders ranked match results

function scoreBar(score) {
  const pct = Math.min(Math.round(score), 100);
  const color = pct >= 75 ? '#27ae60' : pct >= 45 ? '#f39c12' : '#e74c3c';
  return `<div class="score-bar-wrap"><div class="score-bar" style="width:${pct}%;background:${color}"></div></div>`;
}

function renderResults(results, productTypeName) {
  const titleEl = document.getElementById('results-product-type-name');
  const countEl = document.getElementById('results-count');
  const tableBody = document.getElementById('results-tbody');
  const emptyEl = document.getElementById('results-empty');
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
    const score = parseFloat(row.out_match_score || 0);
    const misses = row.out_miss_notes || '\u2014';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-cell">${i + 1}</td>
      <td>${row.out_brand_name || '\u2014'}</td>
      <td class="mono">${row.out_part_number || '\u2014'}</td>
      <td>
        <span class="score-label">${score.toFixed(1)}</span>
        ${scoreBar(score)}
      </td>
      <td class="priority-cell">${row.out_vendor_priority_rank ?? '\u2014'}</td>
      <td class="miss-cell">${misses}</td>
    `;
    tableBody.appendChild(tr);
  });
}
