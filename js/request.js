// Request form view
let currentTemplate = null;
let currentFields = [];

async function loadTemplate(productTypeId) {
  const { data, error } = await sbClient
    .from('pm_quote_templates')
    .select('id, product_type_id')
    .eq('product_type_id', productTypeId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function loadTemplateFields(templateId) {
  const { data, error } = await sbClient
    .from('pm_spec_intake_fields')
    .select(`
      id,
      sort_order,
      is_required,
      display_hint,
      spec_definition_id,
      pm_spec_definitions (
        id,
        name,
        display_label,
        match_type,
        pm_spec_units ( abbreviation )
      )
    `)
    .eq('template_id', templateId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

function isNumericMatchType(matchType) {
  return matchType === 'nearest' || matchType === 'range';
}

function renderRequestForm(productTypeName, fields) {
  const formBody = document.getElementById('request-fields');
  formBody.innerHTML = '';

  fields.forEach(field => {
    const sd = field.pm_spec_definitions;
    const unit = sd.pm_spec_units ? sd.pm_spec_units.abbreviation : null;
    const label = sd.display_label || sd.name;
    const isNumeric = isNumericMatchType(sd.match_type);
    const required = field.is_required;
    const hint = field.display_hint || sd.match_type;

    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', `field-${sd.id}`);
    labelEl.innerHTML = label + (required ? ' <span class="required-star">*</span>' : '');
    if (unit) labelEl.innerHTML += ` <span class="unit-hint">(${unit})</span>`;

    const input = document.createElement('input');
    input.type = isNumeric ? 'number' : 'text';
    input.id = `field-${sd.id}`;
    input.name = sd.name;
    if (isNumeric) input.step = 'any';
    input.placeholder = hint || '';
    input.dataset.specDefinitionId = sd.id;
    input.dataset.matchType = sd.match_type;
    if (required) input.required = true;

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    formBody.appendChild(wrapper);
  });
}

async function initRequestForm(productTypeId, productTypeName) {
  const titleEl = document.getElementById('request-product-type-name');
  const errorEl = document.getElementById('request-error');
  const loadingEl = document.getElementById('request-loading');

  titleEl.textContent = productTypeName;
  errorEl.classList.add('hidden');
  loadingEl.classList.remove('hidden');
  document.getElementById('request-fields').innerHTML = '';

  try {
    currentTemplate = await loadTemplate(productTypeId);
    currentFields = await loadTemplateFields(currentTemplate.id);
    renderRequestForm(productTypeName, currentFields);
  } catch (err) {
    errorEl.textContent = 'Failed to load form: ' + err.message;
    errorEl.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }

  const form = document.getElementById('request-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('request-submit-btn');
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Running match\u2026';

    try {
      const session = await getSession();
      const userEmail = session.user.email;
      const customerName = document.getElementById('customer-name').value.trim() || null;
      const customerRef = document.getElementById('customer-ref').value.trim() || null;

      const { data: reqData, error: reqError } = await sbClient
        .from('pm_part_requests')
        .insert({
          product_type_id: productTypeId,
          template_id: currentTemplate.id,
          customer_name: customerName,
          customer_ref: customerRef,
          sales_rep: userEmail,
          initiated_by: 'sales_rep',
          status: 'open'
        })
        .select('id')
        .single();
      if (reqError) throw reqError;
      const requestId = reqData.id;

      const specValues = [];
      currentFields.forEach(field => {
        const sd = field.pm_spec_definitions;
        const input = document.getElementById(`field-${sd.id}`);
        if (!input || input.value === '') return;
        const isNumeric = isNumericMatchType(sd.match_type);
        specValues.push({
          request_id: requestId,
          spec_definition_id: sd.id,
          value_text: isNumeric ? null : input.value.trim(),
          value_numeric: isNumeric ? parseFloat(input.value) : null
        });
      });

      if (specValues.length > 0) {
        const { error: valError } = await sbClient
          .from('pm_request_spec_values')
          .insert(specValues);
        if (valError) throw valError;
      }

      const { data: matchData, error: matchError } = await sbClient
        .rpc('run_match', { p_request_id: requestId });
      if (matchError) throw matchError;

      window.currentRequestId = requestId;
      window.currentMatchResults = matchData;
      window.currentProductTypeName = productTypeName;
      showView('view-results');
      renderResults(matchData, productTypeName);

    } catch (err) {
      errorEl.textContent = 'Error: ' + err.message;
      errorEl.classList.remove('hidden');
    } finally {
      const submitBtn = document.getElementById('request-submit-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Run Match \u2192';
    }
  };
}
