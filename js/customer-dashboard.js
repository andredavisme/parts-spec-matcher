// Customer Portal — Dashboard: list past requests with top match

async function initDashboard(session) {
  const loadingEl  = document.getElementById('dashboard-loading');
  const emptyEl    = document.getElementById('dashboard-empty');
  const tableWrap  = document.getElementById('dashboard-table-wrap');
  const tbody      = document.getElementById('dashboard-tbody');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  tableWrap.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    // Load this customer's requests
    const { data: requests, error: reqErr } = await sbClient
      .from('pm_part_requests')
      .select(`
        id,
        created_at,
        status,
        customer_ref,
        pm_product_types ( display_name )
      `)
      .eq('initiated_by', 'customer')
      .eq('customer_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (reqErr) throw reqErr;

    if (!requests || requests.length === 0) {
      emptyEl.classList.remove('hidden');
      loadingEl.classList.add('hidden');
      return;
    }

    // Load top match (rank 1) for each request from spec_match_results
    const requestIds = requests.map(r => r.id);
    const { data: topMatches, error: matchErr } = await sbClient
      .schema('parts_matcher')
      .from('spec_match_results')
      .select(`
        request_id,
        match_score,
        catalog_item_id,
        parts_matcher.catalog_items ( part_number, parts_matcher.brands ( name ) )
      `)
      .in('request_id', requestIds)
      .order('match_score', { ascending: false });
    if (matchErr) throw matchErr;

    // Build map: request_id -> top match row
    const topMap = {};
    (topMatches || []).forEach(m => {
      if (!topMap[m.request_id]) topMap[m.request_id] = m;
    });

    tableWrap.classList.remove('hidden');
    requests.forEach(req => {
      const top      = topMap[req.id];
      const ptName   = req.pm_product_types?.display_name || '—';
      const refText  = req.customer_ref || '—';
      const dateText = new Date(req.created_at).toLocaleDateString();
      const status   = req.status || 'open';
      const statusCls = status === 'open' ? 'badge-on' : 'badge-off';

      const brandName  = top?.catalog_items?.brands?.name || '';
      const partNum    = top?.catalog_items?.part_number  || '';
      const topLabel   = top ? `${brandName} ${partNum}`.trim() : '—';
      const scoreLabel = top ? parseFloat(top.match_score).toFixed(1) : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rank-cell">${req.id}</td>
        <td>${ptName}</td>
        <td class="mono">${refText}</td>
        <td>${dateText}</td>
        <td><span class="badge-active ${statusCls}">${status}</span></td>
        <td class="mono">${topLabel}</td>
        <td><strong>${scoreLabel}</strong></td>
        <td>
          <button class="btn-edit view-results-btn" data-id="${req.id}" data-ptname="${ptName}">
            View &rarr;
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Wire up "View →" buttons to reload results
    tbody.querySelectorAll('.view-results-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const requestId = parseInt(btn.dataset.id);
        const ptName    = btn.dataset.ptname;
        btn.textContent = 'Loading\u2026';
        btn.disabled    = true;
        try {
          const { data: matchData, error } = await sbClient
            .rpc('run_match', { p_request_id: requestId });
          if (error) throw error;
          window.currentRequestId      = requestId;
          window.currentMatchResults   = matchData;
          window.currentProductTypeName = ptName;
          showView('view-results');
          renderResults(matchData, ptName);
        } catch (err) {
          alert('Failed to load results: ' + err.message);
          btn.textContent = 'View \u2192';
          btn.disabled    = false;
        }
      });
    });

  } catch (err) {
    emptyEl.textContent = 'Error loading requests: ' + err.message;
    emptyEl.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }
}
