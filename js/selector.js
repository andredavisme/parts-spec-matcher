// Product category + type selector logic
async function loadCategories() {
  const { data, error } = await supabase
    .schema('parts_matcher')
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

async function loadProductTypes(categoryId) {
  const { data, error } = await supabase
    .schema('parts_matcher')
    .from('product_types')
    .select('id, name')
    .eq('product_category_id', categoryId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

function populateSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    selectEl.appendChild(opt);
  });
}

async function initSelector() {
  const categorySelect = document.getElementById('category-select');
  const productTypeField = document.getElementById('product-type-field');
  const productTypeSelect = document.getElementById('product-type-select');
  const startBtn = document.getElementById('start-request-btn');
  const errorEl = document.getElementById('selector-error');

  // Load categories
  try {
    const categories = await loadCategories();
    populateSelect(categorySelect, categories, '\u2014 Select a category \u2014');
  } catch (err) {
    errorEl.textContent = 'Failed to load categories: ' + err.message;
    errorEl.classList.remove('hidden');
  }

  // On category change: load product types
  categorySelect.addEventListener('change', async () => {
    const catId = categorySelect.value;
    productTypeField.style.display = 'none';
    startBtn.disabled = true;
    productTypeSelect.innerHTML = '<option value="">\u2014 Select a product type \u2014</option>';

    if (!catId) return;

    try {
      const types = await loadProductTypes(catId);
      populateSelect(productTypeSelect, types, '\u2014 Select a product type \u2014');
      productTypeField.style.display = 'block';
    } catch (err) {
      errorEl.textContent = 'Failed to load product types: ' + err.message;
      errorEl.classList.remove('hidden');
    }
  });

  // On product type change: enable start button
  productTypeSelect.addEventListener('change', () => {
    startBtn.disabled = !productTypeSelect.value;
  });

  // Start request button - wired to request form in next step
  startBtn.addEventListener('click', () => {
    const productTypeId = productTypeSelect.value;
    const productTypeName = productTypeSelect.options[productTypeSelect.selectedIndex].text;
    if (productTypeId) {
      // Will navigate to request form view in next milestone step
      window.selectedProductTypeId = productTypeId;
      window.selectedProductTypeName = productTypeName;
      alert('Next: Load spec form for "' + productTypeName + '" (Request Form \u2014 coming next)');
    }
  });
}
