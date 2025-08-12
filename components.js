// Estate Manager - UI Components

import { formatEGP, debounce, showToast, exportToCSV, printHTML } from './utils.js';

/**
 * Create a sortable table component
 * @param {Array} headers - Table headers
 * @param {Array} rows - Table rows
 * @param {Object} options - Table options
 * @returns {HTMLElement} - Table element
 */
export function createTable(headers, rows, options = {}) {
  const {
    sortable = true,
    searchable = false,
    exportable = false,
    className = 'table',
    onSort = null,
    onRowClick = null,
    emptyMessage = 'لا توجد بيانات'
  } = options;

  const container = document.createElement('div');
  container.className = 'table-container';

  // Add search and export controls if needed
  if (searchable || exportable) {
    const controls = document.createElement('div');
    controls.className = 'table-controls';
    controls.style.cssText = 'display: flex; gap: 12px; margin-bottom: 16px; align-items: center;';

    if (searchable) {
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'بحث...';
      searchInput.className = 'input';
      searchInput.style.cssText = 'flex: 1; margin-bottom: 0;';
      
      const debouncedSearch = debounce((query) => {
        const filteredRows = rows.filter(row => 
          row.some(cell => String(cell).toLowerCase().includes(query.toLowerCase()))
        );
        updateTableBody(filteredRows);
      }, 300);

      searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
      controls.appendChild(searchInput);
    }

    if (exportable) {
      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'تصدير CSV';
      exportBtn.className = 'btn secondary';
      exportBtn.onclick = () => {
        const filename = `export_${Date.now()}.csv`;
        exportToCSV(headers, rows, filename);
      };
      controls.appendChild(exportBtn);
    }

    container.appendChild(controls);
  }

  // Create table
  const table = document.createElement('table');
  table.className = className;

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  headers.forEach((header, index) => {
    const th = document.createElement('th');
    th.textContent = header;
    th.dataset.index = index;

    if (sortable && onSort) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => onSort(index, header));
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // Function to update table body
  const updateTableBody = (dataRows) => {
    tbody.innerHTML = '';

    if (dataRows.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = headers.length;
      emptyCell.textContent = emptyMessage;
      emptyCell.style.textAlign = 'center';
      emptyCell.style.color = 'var(--muted)';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    dataRows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      
      if (onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => onRowClick(row, rowIndex));
      }

      row.forEach(cell => {
        const td = document.createElement('td');
        if (typeof cell === 'string' && cell.includes('<')) {
          td.innerHTML = cell;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  };

  // Initial render
  updateTableBody(rows);

  container.appendChild(table);
  return container;
}

/**
 * Create a form component
 * @param {Array} fields - Form field definitions
 * @param {Object} options - Form options
 * @returns {HTMLElement} - Form element
 */
export function createForm(fields, options = {}) {
  const {
    onSubmit = null,
    submitText = 'حفظ',
    resetText = 'إعادة تعيين',
    showReset = true,
    className = 'form'
  } = options;

  const form = document.createElement('form');
  form.className = className;

  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'form-fields';

  fields.forEach(field => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'form-group';

    // Create label if provided
    if (field.label) {
      const label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = field.id;
      label.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 500; color: var(--ink);';
      fieldGroup.appendChild(label);
    }

    // Create input element
    let input;
    switch (field.type) {
      case 'select':
        input = document.createElement('select');
        input.className = 'select';
        
        if (field.options) {
          field.options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value || option;
            optionEl.textContent = option.label || option;
            input.appendChild(optionEl);
          });
        }
        break;

      case 'textarea':
        input = document.createElement('textarea');
        input.className = 'input';
        input.rows = field.rows || 3;
        break;

      default:
        input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = 'input';
    }

    // Set common attributes
    input.id = field.id;
    input.name = field.name || field.id;
    
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    if (field.value !== undefined) input.value = field.value;
    if (field.disabled) input.disabled = true;

    // Add validation
    if (field.pattern) input.pattern = field.pattern;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;

    fieldGroup.appendChild(input);

    // Add help text if provided
    if (field.help) {
      const helpText = document.createElement('small');
      helpText.textContent = field.help;
      helpText.style.cssText = 'color: var(--muted); font-size: 12px; margin-top: 4px; display: block;';
      fieldGroup.appendChild(helpText);
    }

    fieldContainer.appendChild(fieldGroup);
  });

  form.appendChild(fieldContainer);

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'form-buttons';
  buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 20px;';

  if (showReset) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'reset';
    resetBtn.textContent = resetText;
    resetBtn.className = 'btn secondary';
    buttonContainer.appendChild(resetBtn);
  }

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = submitText;
  submitBtn.className = 'btn';
  buttonContainer.appendChild(submitBtn);

  form.appendChild(buttonContainer);

  // Handle form submission
  if (onSubmit) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      onSubmit(data, form);
    });
  }

  return form;
}

/**
 * Create a card component
 * @param {Object} options - Card options
 * @returns {HTMLElement} - Card element
 */
export function createCard(options = {}) {
  const {
    title = '',
    content = '',
    actions = [],
    className = 'card'
  } = options;

  const card = document.createElement('div');
  card.className = className;

  if (title) {
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    cardHeader.style.cssText = 'margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line);';

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardTitle.style.cssText = 'margin: 0; color: var(--ink); font-size: 16px; font-weight: 600;';
    
    cardHeader.appendChild(cardTitle);
    card.appendChild(cardHeader);
  }

  if (content) {
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    if (typeof content === 'string') {
      cardBody.innerHTML = content;
    } else {
      cardBody.appendChild(content);
    }
    
    card.appendChild(cardBody);
  }

  if (actions.length > 0) {
    const cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer';
    cardFooter.style.cssText = 'margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--line); display: flex; gap: 8px; justify-content: flex-end;';

    actions.forEach(action => {
      const button = document.createElement('button');
      button.textContent = action.text;
      button.className = `btn ${action.variant || ''}`;
      
      if (action.onClick) {
        button.addEventListener('click', action.onClick);
      }
      
      cardFooter.appendChild(button);
    });

    card.appendChild(cardFooter);
  }

  return card;
}

/**
 * Create a KPI (Key Performance Indicator) component
 * @param {Object} options - KPI options
 * @returns {HTMLElement} - KPI element
 */
export function createKPI(options = {}) {
  const {
    title = '',
    value = 0,
    format = 'number',
    trend = null,
    color = 'var(--ink)',
    icon = null
  } = options;

  const kpi = document.createElement('div');
  kpi.className = 'card kpi';

  const kpiHeader = document.createElement('div');
  kpiHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';

  const kpiTitle = document.createElement('h3');
  kpiTitle.textContent = title;
  kpiTitle.style.cssText = 'margin: 0; color: var(--muted); font-size: 13px; font-weight: 600;';

  kpiHeader.appendChild(kpiTitle);

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.cssText = 'font-size: 20px; opacity: 0.7;';
    kpiHeader.appendChild(iconEl);
  }

  kpi.appendChild(kpiHeader);

  const kpiValue = document.createElement('div');
  kpiValue.className = 'big';
  kpiValue.style.color = color;

  // Format value based on type
  switch (format) {
    case 'currency':
      kpiValue.textContent = formatEGP(value);
      break;
    case 'percentage':
      kpiValue.textContent = `${value}%`;
      break;
    default:
      kpiValue.textContent = value;
  }

  kpi.appendChild(kpiValue);

  // Add trend indicator if provided
  if (trend !== null) {
    const trendEl = document.createElement('div');
    trendEl.style.cssText = 'margin-top: 4px; font-size: 12px; display: flex; align-items: center; gap: 4px;';

    const trendIcon = trend > 0 ? '↗️' : trend < 0 ? '↘️' : '➡️';
    const trendColor = trend > 0 ? 'var(--ok)' : trend < 0 ? 'var(--warn)' : 'var(--muted)';

    trendEl.innerHTML = `
      <span style="color: ${trendColor};">${trendIcon}</span>
      <span style="color: ${trendColor};">${Math.abs(trend)}%</span>
    `;

    kpi.appendChild(trendEl);
  }

  return kpi;
}

/**
 * Create a progress bar component
 * @param {Object} options - Progress bar options
 * @returns {HTMLElement} - Progress bar element
 */
export function createProgressBar(options = {}) {
  const {
    value = 0,
    max = 100,
    label = '',
    showPercentage = true,
    color = 'var(--brand)'
  } = options;

  const container = document.createElement('div');
  container.className = 'progress-container';

  if (label || showPercentage) {
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;';

    if (label) {
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      labelEl.style.color = 'var(--ink)';
      labelContainer.appendChild(labelEl);
    }

    if (showPercentage) {
      const percentageEl = document.createElement('span');
      percentageEl.textContent = `${Math.round((value / max) * 100)}%`;
      percentageEl.style.color = 'var(--muted)';
      labelContainer.appendChild(percentageEl);
    }

    container.appendChild(labelContainer);
  }

  const progressBar = document.createElement('div');
  progressBar.className = 'progress';

  const progressFill = document.createElement('div');
  progressFill.style.cssText = `width: ${(value / max) * 100}%; background: ${color}; transition: width 0.3s ease;`;

  progressBar.appendChild(progressFill);
  container.appendChild(progressBar);

  return container;
}

/**
 * Create a badge component
 * @param {Object} options - Badge options
 * @returns {HTMLElement} - Badge element
 */
export function createBadge(options = {}) {
  const {
    text = '',
    variant = 'info',
    size = 'normal'
  } = options;

  const badge = document.createElement('span');
  badge.className = `badge badge-${variant}`;
  badge.textContent = text;

  if (size === 'small') {
    badge.style.fontSize = '10px';
    badge.style.padding = '4px 8px';
  } else if (size === 'large') {
    badge.style.fontSize = '14px';
    badge.style.padding = '8px 16px';
  }

  return badge;
}

/**
 * Create a loading spinner component
 * @param {Object} options - Spinner options
 * @returns {HTMLElement} - Spinner element
 */
export function createSpinner(options = {}) {
  const {
    size = 'normal',
    text = 'جاري التحميل...'
  } = options;

  const container = document.createElement('div');
  container.className = 'spinner-container';
  container.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px;';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  
  if (size === 'small') {
    spinner.style.width = '16px';
    spinner.style.height = '16px';
  } else if (size === 'large') {
    spinner.style.width = '32px';
    spinner.style.height = '32px';
  }

  container.appendChild(spinner);

  if (text) {
    const textEl = document.createElement('span');
    textEl.textContent = text;
    textEl.style.color = 'var(--muted)';
    container.appendChild(textEl);
  }

  return container;
}

/**
 * Create a tabs component
 * @param {Array} tabs - Tab definitions
 * @param {Object} options - Tabs options
 * @returns {HTMLElement} - Tabs element
 */
export function createTabs(tabs, options = {}) {
  const {
    activeTab = 0,
    onTabChange = null
  } = options;

  const container = document.createElement('div');
  container.className = 'tabs-container';

  const tabsNav = document.createElement('div');
  tabsNav.className = 'tabs';

  const tabsContent = document.createElement('div');
  tabsContent.className = 'tabs-content';

  tabs.forEach((tab, index) => {
    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.className = `tab ${index === activeTab ? 'active' : ''}`;
    tabButton.textContent = tab.title;
    tabButton.onclick = () => {
      // Update active tab
      tabsNav.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tabButton.classList.add('active');

      // Update content
      tabsContent.innerHTML = '';
      if (typeof tab.content === 'string') {
        tabsContent.innerHTML = tab.content;
      } else {
        tabsContent.appendChild(tab.content);
      }

      // Call callback
      if (onTabChange) {
        onTabChange(index, tab);
      }
    };

    tabsNav.appendChild(tabButton);
  });

  container.appendChild(tabsNav);
  container.appendChild(tabsContent);

  // Set initial content
  if (tabs[activeTab]) {
    const initialTab = tabs[activeTab];
    if (typeof initialTab.content === 'string') {
      tabsContent.innerHTML = initialTab.content;
    } else {
      tabsContent.appendChild(initialTab.content);
    }
  }

  return container;
}

