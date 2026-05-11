// Category → product type cascade loader
async function initSelector() {
  const categorySelect = document.getElementById('category-select');
  const productTypeField = document.getElementById('product-type-field');
  const productTypeSelect = document.getElementById('product-type-select');
  const startBtn = document.getElementById('start-request-btn');
  const errorEl = document.getElementById('selector-error');

  const { data: categories, error: catError } = await sbClient
    .from('pm_product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (catError) {
    errorEl.textContent = 'Failed to load categories: ' + catError.message;
    errorEl.classList.remove('hidden');
    return;
  }

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });

  categorySelect.addEventListener('change', async () => {
    const categoryId = parseInt(categorySelect.value);
    productTypeSelect.innerHTML = '<option value="">— Select a product type —</option>';
    startBtn.disabled = true;
    productTypeField.style.display = 'none';
    if (!categoryId) return;

    const { data: types, error: typeError } = await sbClient
      .from('pm_product_types')
      .select('id, name')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name');

    if (typeError) {
      errorEl.textContent = 'Failed to load product types: ' + typeError.message;
      errorEl.classList.remove('hidden');
      return;
    }

    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      productTypeSelect.appendChild(opt);
    });

    productTypeField.style.display = '';
  });

  productTypeSelect.addEventListener('change', () => {
    startBtn.disabled = !productTypeSelect.value;
  });
}
