// Estate Manager - Main Application

import { showToast, getTodayDate, formatEGP, showConfirmDialog } from './utils.js';
import storage from './storage.js';
import security from './security.js';
import { createTable, createForm, createCard, createKPI, createTabs } from './components.js';

/**
 * Main Application Class
 */
class EstateManagerApp {
  constructor() {
    this.currentView = 'dashboard';
    this.viewContainer = null;
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Setup the application
   */
  setup() {
    this.createLayout();
    this.setupEventListeners();
    this.applySettings();
    this.renderCurrentView();

    // Show welcome message
    showToast('مرحباً بك في نظام إدارة العقارات المحسن', 'success');
  }

  /**
   * Create the main application layout
   */
  createLayout() {
    document.body.innerHTML = `
      <div class="container">
        <header class="header">
          <div class="brand">
            <div class="logo">🏛️</div>
            <h1>مدير الاستثمار العقاري المحسن</h1>
          </div>
          <div class="tools">
            <select class="select" id="theme-selector">
              <option value="dark">الوضع الداكن</option>
              <option value="light">الوضع الفاتح</option>
            </select>
            <select class="select" id="font-selector">
              <option value="14">خط صغير</option>
              <option value="16">خط متوسط</option>
              <option value="18">خط كبير</option>
            </select>
            <button class="btn secondary" id="security-btn">🔒 الأمان</button>
            <button class="btn secondary" id="backup-btn">💾 النسخ الاحتياطي</button>
          </div>
        </header>

        <nav class="tabs" id="main-navigation">
          <button class="tab active" data-view="dashboard">لوحة التحكم</button>
          <button class="tab" data-view="customers">العملاء</button>
          <button class="tab" data-view="units">الوحدات</button>
          <button class="tab" data-view="contracts">العقود</button>
          <button class="tab" data-view="installments">الأقساط</button>
          <button class="tab" data-view="payments">المدفوعات</button>
          <button class="tab" data-view="partners">الشركاء</button>
          <button class="tab" data-view="reports">التقارير</button>
        </nav>

        <main class="panel" id="main-content">
          <!-- Dynamic content will be rendered here -->
        </main>

        <footer style="text-align: center; color: var(--muted); font-size: 12px; margin-top: 20px; padding: 16px 0; border-top: 1px solid var(--line);">
          💾 تخزين محلي محسن • 🔒 حماية متقدمة • 📊 تقارير شاملة • 🎨 تصميم عصري
        </footer>
      </div>
    `;

    this.viewContainer = document.getElementById('main-content');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Navigation
    const navigation = document.getElementById('main-navigation');
    navigation.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab')) {
        const view = e.target.dataset.view;
        this.navigateToView(view);
      }
    });

    // Theme selector
    const themeSelector = document.getElementById('theme-selector');
    themeSelector.addEventListener('change', (e) => {
      this.changeTheme(e.target.value);
    });

    // Font selector
    const fontSelector = document.getElementById('font-selector');
    fontSelector.addEventListener('change', (e) => {
      this.changeFontSize(parseInt(e.target.value));
    });

    // Security button
    const securityBtn = document.getElementById('security-btn');
    securityBtn.addEventListener('click', () => {
      security.showPasswordDialog();
    });

    // Backup button
    const backupBtn = document.getElementById('backup-btn');
    backupBtn.addEventListener('click', () => {
      this.showBackupDialog();
    });

    // Listen for storage changes
    storage.addListener((state) => {
      // Refresh current view if needed
      if (this.currentView !== 'dashboard') {
        this.renderCurrentView();
      }
    });
  }

  /**
   * Navigate to a specific view
   * @param {string} viewName - Name of the view to navigate to
   */
  navigateToView(viewName) {
    // Check authentication
    if (!security.isUserAuthenticated()) {
      showToast('يرجى تسجيل الدخول أولاً', 'error');
      return;
    }

    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update current view and render
    this.currentView = viewName;
    this.renderCurrentView();
  }

  /**
   * Render the current view
   */
  renderCurrentView() {
    if (!this.viewContainer) return;

    // Show loading
    this.viewContainer.innerHTML = '<div class="spinner-container"><div class="spinner"></div><span>جاري التحميل...</span></div>';

    // Render view based on current view
    setTimeout(() => {
      switch (this.currentView) {
        case 'dashboard':
          this.renderDashboard();
          break;
        case 'customers':
          this.renderCustomers();
          break;
        case 'units':
          this.renderUnits();
          break;
        case 'contracts':
          this.renderContracts();
          break;
        case 'installments':
          this.renderInstallments();
          break;
        case 'payments':
          this.renderPayments();
          break;
        case 'partners':
          this.renderPartners();
          break;
        case 'reports':
          this.renderReports();
          break;
        default:
          this.renderDashboard();
      }
    }, 100);
  }

  /**
   * Render dashboard view
   */
  renderDashboard() {
    const state = storage.getState();
    const { units, payments, installments } = state;

    // Calculate KPIs
    const totalUnits = units.length;
    const availableUnits = units.filter(u => u.status === 'متاحة').length;
    const soldUnits = units.filter(u => u.status === 'مباعة').length;
    const returnedUnits = units.filter(u => u.status === 'مرتجعة').length;
    const totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Calculate upcoming installments
    const now = new Date();
    const upcomingInstallments = installments.filter(i => 
      i.status !== 'مدفوع' && i.dueDate && new Date(i.dueDate) >= now
    );
    const upcomingAmount = upcomingInstallments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    // Create KPI cards
    const kpiContainer = document.createElement('div');
    kpiContainer.className = 'kpis';

    const kpis = [
      { title: 'إجمالي الوحدات', value: totalUnits, icon: '🏢' },
      { title: 'الوحدات المتاحة', value: availableUnits, icon: '✅', color: 'var(--ok)' },
      { title: 'الوحدات المباعة', value: soldUnits, icon: '💰', color: 'var(--gold)' },
      { title: 'إجمالي الإيرادات', value: totalRevenue, format: 'currency', icon: '💵', color: 'var(--brand)' }
    ];

    kpis.forEach(kpi => {
      kpiContainer.appendChild(createKPI(kpi));
    });

    // Create upcoming installments chart
    const upcomingCard = createCard({
      title: 'الأقساط القادمة (12 شهر)',
      content: this.createUpcomingInstallmentsChart(upcomingInstallments)
    });

    // Create recent activities
    const activitiesCard = createCard({
      title: 'الأنشطة الأخيرة',
      content: this.createRecentActivities()
    });

    // Assemble dashboard
    this.viewContainer.innerHTML = '';
    this.viewContainer.appendChild(kpiContainer);
    
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'grid grid-2';
    chartsContainer.style.marginTop = '24px';
    chartsContainer.appendChild(upcomingCard);
    chartsContainer.appendChild(activitiesCard);
    
    this.viewContainer.appendChild(chartsContainer);
  }

  /**
   * Create upcoming installments chart
   * @param {Array} installments - Upcoming installments
   * @returns {HTMLElement} - Chart element
   */
  createUpcomingInstallmentsChart(installments) {
    const monthlyData = {};
    
    installments.forEach(installment => {
      const month = installment.dueDate.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + (parseFloat(installment.amount) || 0);
    });

    const sortedMonths = Object.keys(monthlyData).sort().slice(0, 12);
    
    if (sortedMonths.length === 0) {
      return '<p style="text-align: center; color: var(--muted); padding: 20px;">لا توجد أقساط قادمة</p>';
    }

    const tableData = sortedMonths.map(month => [
      month,
      formatEGP(monthlyData[month])
    ]);

    return createTable(['الشهر', 'المبلغ'], tableData, {
      searchable: false,
      exportable: true
    });
  }

  /**
   * Create recent activities list
   * @returns {HTMLElement} - Activities element
   */
  createRecentActivities() {
    const state = storage.getState();
    const activities = [];

    // Get recent payments
    const recentPayments = state.payments
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);

    recentPayments.forEach(payment => {
      const unit = state.units.find(u => u.id === payment.unitId);
      activities.push({
        type: 'payment',
        description: `دفعة جديدة: ${formatEGP(payment.amount)} للوحدة ${unit?.code || 'غير محدد'}`,
        date: payment.date,
        icon: '💰'
      });
    });

    // Get recent contracts
    const recentContracts = state.contracts
      .sort((a, b) => new Date(b.start || 0) - new Date(a.start || 0))
      .slice(0, 3);

    recentContracts.forEach(contract => {
      const unit = state.units.find(u => u.id === contract.unitId);
      const customer = state.customers.find(c => c.id === contract.customerId);
      activities.push({
        type: 'contract',
        description: `عقد جديد: ${unit?.code || 'غير محدد'} - ${customer?.name || 'غير محدد'}`,
        date: contract.start,
        icon: '📋'
      });
    });

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (activities.length === 0) {
      return '<p style="text-align: center; color: var(--muted); padding: 20px;">لا توجد أنشطة حديثة</p>';
    }

    const activitiesList = document.createElement('div');
    activitiesList.style.cssText = 'max-height: 300px; overflow-y: auto;';

    activities.slice(0, 10).forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line);';

      activityItem.innerHTML = `
        <span style="font-size: 20px;">${activity.icon}</span>
        <div style="flex: 1;">
          <div style="color: var(--ink); font-size: 14px;">${activity.description}</div>
          <div style="color: var(--muted); font-size: 12px;">${activity.date || 'غير محدد'}</div>
        </div>
      `;

      activitiesList.appendChild(activityItem);
    });

    return activitiesList;
  }

  /**
   * Render customers view
   */
  renderCustomers() {
    const state = storage.getState();
    const customers = state.customers || [];

    // Create add customer form
    const addForm = createForm([
      { id: 'name', label: 'اسم العميل', placeholder: 'أدخل اسم العميل', required: true },
      { id: 'phone', label: 'رقم الهاتف', placeholder: 'أدخل رقم الهاتف', type: 'tel' },
      { id: 'email', label: 'البريد الإلكتروني', placeholder: 'أدخل البريد الإلكتروني', type: 'email' },
      { id: 'address', label: 'العنوان', placeholder: 'أدخل العنوان', type: 'textarea', rows: 2 }
    ], {
      submitText: 'إضافة عميل',
      onSubmit: (data) => this.addCustomer(data)
    });

    const addCard = createCard({
      title: 'إضافة عميل جديد',
      content: addForm
    });

    // Create customers table
    const tableData = customers.map(customer => [
      customer.name || '',
      customer.phone || '',
      customer.email || '',
      customer.address || '',
      `<button class="btn secondary" onclick="app.editCustomer('${customer.id}')">تعديل</button>
       <button class="btn warn" onclick="app.deleteCustomer('${customer.id}')">حذف</button>`
    ]);

    const customersTable = createTable(
      ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا يوجد عملاء مسجلين'
      }
    );

    const tableCard = createCard({
      title: `العملاء (${customers.length})`,
      content: customersTable
    });

    // Assemble view
    this.viewContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'grid grid-2';
    container.appendChild(addCard);
    container.appendChild(tableCard);
    this.viewContainer.appendChild(container);
  }

  /**
   * Add new customer
   * @param {Object} data - Customer data
   */
  addCustomer(data) {
    const validation = security.validateFormData(data, ['name']);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }

    const customer = {
      id: `C-${Date.now()}`,
      ...validation.data,
      createdAt: getTodayDate()
    };

    storage.addItem('customers', customer);
    showToast('تم إضافة العميل بنجاح', 'success');
    this.renderCustomers();
  }

  /**
   * Edit customer
   * @param {string} customerId - Customer ID
   */
  editCustomer(customerId) {
    const customer = storage.findItem('customers', customerId);
    if (!customer) {
      showToast('العميل غير موجود', 'error');
      return;
    }

    // Implementation for edit customer dialog
    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete customer
   * @param {string} customerId - Customer ID
   */
  async deleteCustomer(customerId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذا العميل؟');
    if (!confirmed) return;

    const success = storage.removeItem('customers', customerId);
    if (success) {
      showToast('تم حذف العميل بنجاح', 'success');
      this.renderCustomers();
    } else {
      showToast('خطأ في حذف العميل', 'error');
    }
  }

  /**
   * Render units view
   */
  renderUnits() {
    const state = storage.getState();
    const units = state.units || [];

    // Create add unit form
    const addForm = createForm([
      { id: 'code', label: 'كود الوحدة', placeholder: 'أدخل كود الوحدة', required: true },
      { id: 'type', label: 'نوع الوحدة', type: 'select', required: true, options: [
        { value: '', label: 'اختر نوع الوحدة' },
        { value: 'شقة', label: 'شقة' },
        { value: 'فيلا', label: 'فيلا' },
        { value: 'دوبلكس', label: 'دوبلكس' },
        { value: 'بنتهاوس', label: 'بنتهاوس' },
        { value: 'استوديو', label: 'استوديو' },
        { value: 'محل تجاري', label: 'محل تجاري' },
        { value: 'مكتب', label: 'مكتب' }
      ]},
      { id: 'area', label: 'المساحة (متر مربع)', placeholder: 'أدخل المساحة', type: 'number', required: true },
      { id: 'rooms', label: 'عدد الغرف', placeholder: 'أدخل عدد الغرف', type: 'number' },
      { id: 'bathrooms', label: 'عدد الحمامات', placeholder: 'أدخل عدد الحمامات', type: 'number' },
      { id: 'floor', label: 'الطابق', placeholder: 'أدخل رقم الطابق', type: 'number' },
      { id: 'price', label: 'السعر (جنيه)', placeholder: 'أدخل السعر', type: 'number', required: true },
      { id: 'status', label: 'الحالة', type: 'select', required: true, options: [
        { value: 'متاحة', label: 'متاحة' },
        { value: 'محجوزة', label: 'محجوزة' },
        { value: 'مباعة', label: 'مباعة' },
        { value: 'مرتجعة', label: 'مرتجعة' },
        { value: 'قيد الصيانة', label: 'قيد الصيانة' }
      ]},
      { id: 'location', label: 'الموقع', placeholder: 'أدخل الموقع', required: true },
      { id: 'description', label: 'الوصف', placeholder: 'أدخل وصف الوحدة', type: 'textarea', rows: 3 },
      { id: 'features', label: 'المميزات', placeholder: 'أدخل المميزات (مفصولة بفاصلة)', help: 'مثال: مصعد، موقف سيارات، حديقة' }
    ], {
      submitText: 'إضافة وحدة',
      onSubmit: (data) => this.addUnit(data)
    });

    const addCard = createCard({
      title: 'إضافة وحدة جديدة',
      content: addForm
    });

    // Create units table
    const tableData = units.map(unit => [
      unit.code || '',
      unit.type || '',
      `${unit.area || 0} م²`,
      unit.rooms || '-',
      unit.bathrooms || '-',
      unit.floor || '-',
      formatEGP(unit.price || 0),
      `<span class="badge badge-${this.getStatusVariant(unit.status)}">${unit.status || 'غير محدد'}</span>`,
      unit.location || '',
      `<button class="btn secondary" onclick="app.editUnit('${unit.id}')">تعديل</button>
       <button class="btn warn" onclick="app.deleteUnit('${unit.id}')">حذف</button>
       <button class="btn" onclick="app.viewUnitDetails('${unit.id}')">تفاصيل</button>`
    ]);

    const unitsTable = createTable(
      ['الكود', 'النوع', 'المساحة', 'الغرف', 'الحمامات', 'الطابق', 'السعر', 'الحالة', 'الموقع', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا توجد وحدات مسجلة'
      }
    );

    const tableCard = createCard({
      title: `الوحدات (${units.length})`,
      content: unitsTable
    });

    // Create units statistics
    const statsCard = this.createUnitsStatistics(units);

    // Assemble view
    this.viewContainer.innerHTML = '';
    const topContainer = document.createElement('div');
    topContainer.className = 'grid grid-2';
    topContainer.appendChild(addCard);
    topContainer.appendChild(statsCard);
    
    this.viewContainer.appendChild(topContainer);
    this.viewContainer.appendChild(tableCard);
  }

  /**
   * Render contracts view
   */
  renderContracts() {
    const state = storage.getState();
    const contracts = state.contracts || [];
    const customers = state.customers || [];
    const units = state.units || [];

    // Create add contract form
    const addForm = createForm([
      { id: 'customerId', label: 'العميل', type: 'select', required: true, options: [
        { value: '', label: 'اختر العميل' },
        ...customers.map(customer => ({ value: customer.id, label: customer.name }))
      ]},
      { id: 'unitId', label: 'الوحدة', type: 'select', required: true, options: [
        { value: '', label: 'اختر الوحدة' },
        ...units.filter(unit => unit.status === 'متاحة').map(unit => ({ 
          value: unit.id, 
          label: `${unit.code} - ${unit.type} (${formatEGP(unit.price)})` 
        }))
      ]},
      { id: 'contractNumber', label: 'رقم العقد', placeholder: 'أدخل رقم العقد', required: true },
      { id: 'totalAmount', label: 'إجمالي المبلغ (جنيه)', placeholder: 'أدخل إجمالي المبلغ', type: 'number', required: true },
      { id: 'downPayment', label: 'المقدم (جنيه)', placeholder: 'أدخل قيمة المقدم', type: 'number', required: true },
      { id: 'installmentAmount', label: 'قيمة القسط (جنيه)', placeholder: 'أدخل قيمة القسط الشهري', type: 'number', required: true },
      { id: 'installmentCount', label: 'عدد الأقساط', placeholder: 'أدخل عدد الأقساط', type: 'number', required: true },
      { id: 'startDate', label: 'تاريخ بداية العقد', type: 'date', required: true, value: getTodayDate() },
      { id: 'endDate', label: 'تاريخ انتهاء العقد', type: 'date', required: true },
      { id: 'status', label: 'حالة العقد', type: 'select', required: true, options: [
        { value: 'نشط', label: 'نشط' },
        { value: 'مكتمل', label: 'مكتمل' },
        { value: 'ملغي', label: 'ملغي' },
        { value: 'متأخر', label: 'متأخر' }
      ]},
      { id: 'notes', label: 'ملاحظات', placeholder: 'أدخل أي ملاحظات إضافية', type: 'textarea', rows: 3 }
    ], {
      submitText: 'إضافة عقد',
      onSubmit: (data) => this.addContract(data)
    });

    const addCard = createCard({
      title: 'إضافة عقد جديد',
      content: addForm
    });

    // Create contracts table
    const tableData = contracts.map(contract => {
      const customer = customers.find(c => c.id === contract.customerId);
      const unit = units.find(u => u.id === contract.unitId);
      
      return [
        contract.contractNumber || '',
        customer?.name || 'غير محدد',
        unit?.code || 'غير محدد',
        formatEGP(contract.totalAmount || 0),
        formatEGP(contract.downPayment || 0),
        formatEGP(contract.installmentAmount || 0),
        contract.installmentCount || 0,
        contract.startDate || '',
        contract.endDate || '',
        `<span class="badge badge-${this.getContractStatusVariant(contract.status)}">${contract.status || 'غير محدد'}</span>`,
        `<button class="btn secondary" onclick="app.editContract('${contract.id}')">تعديل</button>
         <button class="btn warn" onclick="app.deleteContract('${contract.id}')">حذف</button>
         <button class="btn" onclick="app.viewContractDetails('${contract.id}')">تفاصيل</button>
         <button class="btn info" onclick="app.generateInstallments('${contract.id}')">توليد أقساط</button>`
      ];
    });

    const contractsTable = createTable(
      ['رقم العقد', 'العميل', 'الوحدة', 'إجمالي المبلغ', 'المقدم', 'قيمة القسط', 'عدد الأقساط', 'تاريخ البداية', 'تاريخ النهاية', 'الحالة', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا توجد عقود مسجلة'
      }
    );

    const tableCard = createCard({
      title: `العقود (${contracts.length})`,
      content: contractsTable
    });

    // Create contracts statistics
    const statsCard = this.createContractsStatistics(contracts);

    // Assemble view
    this.viewContainer.innerHTML = '';
    const topContainer = document.createElement('div');
    topContainer.className = 'grid grid-2';
    topContainer.appendChild(addCard);
    topContainer.appendChild(statsCard);
    
    this.viewContainer.appendChild(topContainer);
    this.viewContainer.appendChild(tableCard);
  }

  /**
   * Render installments view
   */
  renderInstallments() {
    const state = storage.getState();
    const installments = state.installments || [];
    const contracts = state.contracts || [];
    const customers = state.customers || [];
    const units = state.units || [];

    // Create installments table with enhanced data
    const tableData = installments.map(installment => {
      const contract = contracts.find(c => c.id === installment.contractId);
      const customer = customers.find(c => c.id === contract?.customerId);
      const unit = units.find(u => u.id === contract?.unitId);
      
      const dueDate = new Date(installment.dueDate);
      const today = new Date();
      const isOverdue = dueDate < today && installment.status !== 'مدفوع';
      
      return [
        installment.installmentNumber || '',
        contract?.contractNumber || 'غير محدد',
        customer?.name || 'غير محدد',
        unit?.code || 'غير محدد',
        formatEGP(installment.amount || 0),
        installment.dueDate || '',
        isOverdue ? `<span style="color: var(--error);">${installment.dueDate}</span>` : installment.dueDate,
        `<span class="badge badge-${this.getInstallmentStatusVariant(installment.status)}">${installment.status || 'غير محدد'}</span>`,
        installment.paidDate || '-',
        formatEGP(installment.paidAmount || 0),
        `<button class="btn ${installment.status === 'مدفوع' ? 'secondary' : 'ok'}" onclick="app.${installment.status === 'مدفوع' ? 'viewInstallmentDetails' : 'payInstallment'}('${installment.id}')">${installment.status === 'مدفوع' ? 'تفاصيل' : 'دفع'}</button>
         <button class="btn secondary" onclick="app.editInstallment('${installment.id}')">تعديل</button>
         <button class="btn warn" onclick="app.deleteInstallment('${installment.id}')">حذف</button>`
      ];
    });

    const installmentsTable = createTable(
      ['رقم القسط', 'رقم العقد', 'العميل', 'الوحدة', 'المبلغ المطلوب', 'تاريخ الاستحقاق', 'حالة التأخير', 'الحالة', 'تاريخ الدفع', 'المبلغ المدفوع', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا توجد أقساط مسجلة'
      }
    );

    const tableCard = createCard({
      title: `الأقساط (${installments.length})`,
      content: installmentsTable
    });

    // Create installments statistics
    const statsCard = this.createInstallmentsStatistics(installments);

    // Create overdue installments card
    const overdueCard = this.createOverdueInstallments(installments, contracts, customers, units);

    // Create upcoming installments card
    const upcomingCard = this.createUpcomingInstallments(installments, contracts, customers, units);

    // Assemble view
    this.viewContainer.innerHTML = '';
    
    const topContainer = document.createElement('div');
    topContainer.className = 'grid grid-2';
    topContainer.appendChild(statsCard);
    topContainer.appendChild(overdueCard);
    
    const middleContainer = document.createElement('div');
    middleContainer.appendChild(upcomingCard);
    
    this.viewContainer.appendChild(topContainer);
    this.viewContainer.appendChild(middleContainer);
    this.viewContainer.appendChild(tableCard);
  }

  /**
   * Render payments view
   */
  renderPayments() {
    const state = storage.getState();
    const payments = state.payments || [];
    const installments = state.installments || [];
    const contracts = state.contracts || [];
    const customers = state.customers || [];
    const units = state.units || [];

    // Create add payment form
    const addForm = createForm([
      { id: 'installmentId', label: 'القسط', type: 'select', required: true, options: [
        { value: '', label: 'اختر القسط' },
        ...installments.filter(i => i.status !== 'مدفوع').map(installment => {
          const contract = contracts.find(c => c.id === installment.contractId);
          const customer = customers.find(c => c.id === contract?.customerId);
          return {
            value: installment.id,
            label: `${customer?.name || 'غير محدد'} - قسط ${installment.installmentNumber} (${formatEGP(installment.amount)})`
          };
        })
      ]},
      { id: 'amount', label: 'المبلغ المدفوع (جنيه)', placeholder: 'أدخل المبلغ المدفوع', type: 'number', required: true, step: '0.01' },
      { id: 'paymentDate', label: 'تاريخ الدفع', type: 'date', required: true, value: getTodayDate() },
      { id: 'paymentMethod', label: 'طريقة الدفع', type: 'select', required: true, options: [
        { value: '', label: 'اختر طريقة الدفع' },
        { value: 'نقدي', label: 'نقدي' },
        { value: 'تحويل بنكي', label: 'تحويل بنكي' },
        { value: 'شيك', label: 'شيك' },
        { value: 'بطاقة ائتمان', label: 'بطاقة ائتمان' },
        { value: 'محفظة إلكترونية', label: 'محفظة إلكترونية' }
      ]},
      { id: 'referenceNumber', label: 'رقم المرجع', placeholder: 'رقم الشيك أو التحويل (اختياري)' },
      { id: 'notes', label: 'ملاحظات', placeholder: 'أدخل أي ملاحظات إضافية', type: 'textarea', rows: 3 }
    ], {
      submitText: 'تسجيل دفعة',
      onSubmit: (data) => this.addPayment(data)
    });

    const addCard = createCard({
      title: 'تسجيل دفعة جديدة',
      content: addForm
    });

    // Create payments table
    const tableData = payments.map(payment => {
      const installment = installments.find(i => i.id === payment.installmentId);
      const contract = contracts.find(c => c.id === payment.contractId || c.id === installment?.contractId);
      const customer = customers.find(c => c.id === contract?.customerId);
      const unit = units.find(u => u.id === contract?.unitId);
      
      return [
        payment.id.split('-')[1] || payment.id,
        customer?.name || 'غير محدد',
        contract?.contractNumber || 'غير محدد',
        unit?.code || 'غير محدد',
        installment?.installmentNumber || '-',
        formatEGP(payment.amount || 0),
        payment.paymentDate || '',
        payment.paymentMethod || '',
        payment.referenceNumber || '-',
        `<button class="btn secondary" onclick="app.editPayment('${payment.id}')">تعديل</button>
         <button class="btn warn" onclick="app.deletePayment('${payment.id}')">حذف</button>
         <button class="btn" onclick="app.viewPaymentDetails('${payment.id}')">تفاصيل</button>
         <button class="btn info" onclick="app.printPaymentReceipt('${payment.id}')">إيصال</button>`
      ];
    });

    const paymentsTable = createTable(
      ['رقم الدفعة', 'العميل', 'رقم العقد', 'الوحدة', 'رقم القسط', 'المبلغ', 'تاريخ الدفع', 'طريقة الدفع', 'رقم المرجع', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا توجد مدفوعات مسجلة'
      }
    );

    const tableCard = createCard({
      title: `المدفوعات (${payments.length})`,
      content: paymentsTable
    });

    // Create payments statistics
    const statsCard = this.createPaymentsStatistics(payments);

    // Create recent payments card
    const recentCard = this.createRecentPayments(payments, contracts, customers);

    // Assemble view
    this.viewContainer.innerHTML = '';
    const topContainer = document.createElement('div');
    topContainer.className = 'grid grid-2';
    topContainer.appendChild(addCard);
    topContainer.appendChild(statsCard);
    
    const middleContainer = document.createElement('div');
    middleContainer.appendChild(recentCard);
    
    this.viewContainer.appendChild(topContainer);
    this.viewContainer.appendChild(middleContainer);
    this.viewContainer.appendChild(tableCard);
  }

  /**
   * Render partners view
   */
  renderPartners() {
    const state = storage.getState();
    const partners = state.partners || [];

    // Create add partner form
    const addForm = createForm([
      { id: 'name', label: 'اسم الشريك', placeholder: 'أدخل اسم الشريك', required: true },
      { id: 'type', label: 'نوع الشراكة', type: 'select', required: true, options: [
        { value: '', label: 'اختر نوع الشراكة' },
        { value: 'مطور عقاري', label: 'مطور عقاري' },
        { value: 'وسيط عقاري', label: 'وسيط عقاري' },
        { value: 'مقاول', label: 'مقاول' },
        { value: 'مهندس معماري', label: 'مهندس معماري' },
        { value: 'محامي', label: 'محامي' },
        { value: 'مكتب تسويق', label: 'مكتب تسويق' },
        { value: 'بنك', label: 'بنك' },
        { value: 'شركة تأمين', label: 'شركة تأمين' },
        { value: 'أخرى', label: 'أخرى' }
      ]},
      { id: 'phone', label: 'رقم الهاتف', placeholder: 'أدخل رقم الهاتف', required: true },
      { id: 'email', label: 'البريد الإلكتروني', placeholder: 'أدخل البريد الإلكتروني', type: 'email' },
      { id: 'address', label: 'العنوان', placeholder: 'أدخل العنوان', required: true },
      { id: 'commissionRate', label: 'نسبة العمولة (%)', placeholder: 'أدخل نسبة العمولة', type: 'number', step: '0.01', min: '0', max: '100' },
      { id: 'contractStartDate', label: 'تاريخ بداية التعاقد', type: 'date', value: getTodayDate() },
      { id: 'contractEndDate', label: 'تاريخ انتهاء التعاقد', type: 'date' },
      { id: 'status', label: 'حالة الشراكة', type: 'select', required: true, options: [
        { value: 'نشط', label: 'نشط' },
        { value: 'معلق', label: 'معلق' },
        { value: 'منتهي', label: 'منتهي' }
      ]},
      { id: 'notes', label: 'ملاحظات', placeholder: 'أدخل أي ملاحظات إضافية', type: 'textarea', rows: 3 }
    ], {
      submitText: 'إضافة شريك',
      onSubmit: (data) => this.addPartner(data)
    });

    const addCard = createCard({
      title: 'إضافة شريك جديد',
      content: addForm
    });

    // Create partners table
    const tableData = partners.map(partner => [
      partner.name || '',
      partner.type || '',
      partner.phone || '',
      partner.email || '-',
      partner.address || '',
      partner.commissionRate ? `${partner.commissionRate}%` : '-',
      partner.contractStartDate || '-',
      partner.contractEndDate || '-',
      `<span class="badge badge-${this.getPartnerStatusVariant(partner.status)}">${partner.status || 'غير محدد'}</span>`,
      `<button class="btn secondary" onclick="app.editPartner('${partner.id}')">تعديل</button>
       <button class="btn warn" onclick="app.deletePartner('${partner.id}')">حذف</button>
       <button class="btn" onclick="app.viewPartnerDetails('${partner.id}')">تفاصيل</button>
       <button class="btn info" onclick="app.calculatePartnerCommissions('${partner.id}')">العمولات</button>`
    ]);

    const partnersTable = createTable(
      ['الاسم', 'نوع الشراكة', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'نسبة العمولة', 'بداية التعاقد', 'انتهاء التعاقد', 'الحالة', 'الإجراءات'],
      tableData,
      {
        searchable: true,
        exportable: true,
        emptyMessage: 'لا توجد شراكات مسجلة'
      }
    );

    const tableCard = createCard({
      title: `الشركاء (${partners.length})`,
      content: partnersTable
    });

    // Create partners statistics
    const statsCard = this.createPartnersStatistics(partners);

    // Create active partnerships card
    const activeCard = this.createActivePartnerships(partners);

    // Assemble view
    this.viewContainer.innerHTML = '';
    const topContainer = document.createElement('div');
    topContainer.className = 'grid grid-2';
    topContainer.appendChild(addCard);
    topContainer.appendChild(statsCard);
    
    const middleContainer = document.createElement('div');
    middleContainer.appendChild(activeCard);
    
    this.viewContainer.appendChild(topContainer);
    this.viewContainer.appendChild(middleContainer);
    this.viewContainer.appendChild(tableCard);
  }

  /**
   * Render reports view (placeholder)
   */
  renderReports() {
    this.viewContainer.innerHTML = '<div class="card"><h3>التقارير</h3><p>هذا القسم قيد التطوير...</p></div>';
  }

  /**
   * Change application theme
   * @param {string} theme - Theme name
   */
  changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    const state = storage.getState();
    storage.updateState({
      settings: {
        ...state.settings,
        theme
      }
    });

    showToast(`تم تغيير المظهر إلى ${theme === 'dark' ? 'الداكن' : 'الفاتح'}`, 'success');
  }

  /**
   * Change font size
   * @param {number} fontSize - Font size in pixels
   */
  changeFontSize(fontSize) {
    document.documentElement.style.fontSize = `${fontSize}px`;
    
    const state = storage.getState();
    storage.updateState({
      settings: {
        ...state.settings,
        fontSize
      }
    });

    showToast(`تم تغيير حجم الخط إلى ${fontSize}px`, 'success');
  }

  /**
   * Apply saved settings
   */
  applySettings() {
    const state = storage.getState();
    const { theme, fontSize } = state.settings;

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-selector').value = theme;

    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}px`;
    document.getElementById('font-selector').value = fontSize.toString();
  }

  /**
   * Show backup dialog
   */
  showBackupDialog() {
    // Implementation for backup/restore functionality
    showToast('ميزة النسخ الاحتياطي قيد التطوير', 'info');
  }
}

// Initialize and export app
const app = new EstateManagerApp();

// Make app globally available for button onclick handlers
window.app = app;

export default app;


  /**
   * Add new unit
   * @param {Object} data - Unit data
   */
  addUnit(data) {
    const validation = security.validateFormData(data, ['code', 'type', 'area', 'price', 'status', 'location']);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }

    // Check if unit code already exists
    const existingUnit = storage.findItem('units', data.code);
    if (existingUnit) {
      showToast('كود الوحدة موجود بالفعل، يرجى استخدام كود آخر', 'error');
      return;
    }

    const unit = {
      id: `U-${Date.now()}`,
      ...validation.data,
      area: parseFloat(validation.data.area) || 0,
      rooms: parseInt(validation.data.rooms) || 0,
      bathrooms: parseInt(validation.data.bathrooms) || 0,
      floor: parseInt(validation.data.floor) || 0,
      price: parseFloat(validation.data.price) || 0,
      features: validation.data.features ? validation.data.features.split(',').map(f => f.trim()).filter(f => f) : [],
      createdAt: getTodayDate()
    };

    storage.addItem('units', unit);
    showToast('تم إضافة الوحدة بنجاح', 'success');
    this.renderUnits();
  }

  /**
   * Edit unit
   * @param {string} unitId - Unit ID
   */
  editUnit(unitId) {
    const unit = storage.findItem('units', unitId);
    if (!unit) {
      showToast('الوحدة غير موجودة', 'error');
      return;
    }

    // Implementation for edit unit dialog
    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete unit
   * @param {string} unitId - Unit ID
   */
  async deleteUnit(unitId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذه الوحدة؟');
    if (!confirmed) return;

    const success = storage.removeItem('units', unitId);
    if (success) {
      showToast('تم حذف الوحدة بنجاح', 'success');
      this.renderUnits();
    } else {
      showToast('خطأ في حذف الوحدة', 'error');
    }
  }

  /**
   * View unit details
   * @param {string} unitId - Unit ID
   */
  viewUnitDetails(unitId) {
    const unit = storage.findItem('units', unitId);
    if (!unit) {
      showToast('الوحدة غير موجودة', 'error');
      return;
    }

    // Create unit details modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">تفاصيل الوحدة: ${unit.code}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div class="grid grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div><strong>النوع:</strong> ${unit.type}</div>
        <div><strong>المساحة:</strong> ${unit.area} م²</div>
        <div><strong>عدد الغرف:</strong> ${unit.rooms || 'غير محدد'}</div>
        <div><strong>عدد الحمامات:</strong> ${unit.bathrooms || 'غير محدد'}</div>
        <div><strong>الطابق:</strong> ${unit.floor || 'غير محدد'}</div>
        <div><strong>السعر:</strong> ${formatEGP(unit.price)}</div>
        <div><strong>الحالة:</strong> <span class="badge badge-${this.getStatusVariant(unit.status)}">${unit.status}</span></div>
        <div><strong>الموقع:</strong> ${unit.location}</div>
      </div>
      
      ${unit.description ? `<div style="margin-bottom: 16px;"><strong>الوصف:</strong><br>${unit.description}</div>` : ''}
      
      ${unit.features && unit.features.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <strong>المميزات:</strong><br>
          ${unit.features.map(feature => `<span class="badge badge-info" style="margin: 2px;">${feature}</span>`).join('')}
        </div>
      ` : ''}
      
      <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
        تم الإنشاء: ${unit.createdAt || 'غير محدد'}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn secondary" onclick="app.editUnit('${unit.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">تعديل</button>
        <button class="btn warn" onclick="app.deleteUnit('${unit.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حذف</button>
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close modal handlers
    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Create units statistics card
   * @param {Array} units - Units array
   * @returns {HTMLElement} - Statistics card
   */
  createUnitsStatistics(units) {
    const stats = {
      total: units.length,
      available: units.filter(u => u.status === 'متاحة').length,
      reserved: units.filter(u => u.status === 'محجوزة').length,
      sold: units.filter(u => u.status === 'مباعة').length,
      returned: units.filter(u => u.status === 'مرتجعة').length,
      maintenance: units.filter(u => u.status === 'قيد الصيانة').length,
      totalValue: units.reduce((sum, u) => sum + (parseFloat(u.price) || 0), 0),
      avgPrice: units.length > 0 ? units.reduce((sum, u) => sum + (parseFloat(u.price) || 0), 0) / units.length : 0,
      totalArea: units.reduce((sum, u) => sum + (parseFloat(u.area) || 0), 0)
    };

    const statsContent = document.createElement('div');
    statsContent.innerHTML = `
      <div class="grid grid-2" style="gap: 12px; margin-bottom: 16px;">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--brand); font-size: 24px; font-weight: bold;">${stats.total}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي الوحدات</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--ok); font-size: 24px; font-weight: bold;">${stats.available}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">متاحة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--warn); font-size: 24px; font-weight: bold;">${stats.reserved}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">محجوزة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--gold); font-size: 24px; font-weight: bold;">${stats.sold}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">مباعة</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--line); padding-top: 12px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>القيمة الإجمالية:</strong> ${formatEGP(stats.totalValue)}</div>
        <div style="margin-bottom: 8px;"><strong>متوسط السعر:</strong> ${formatEGP(stats.avgPrice)}</div>
        <div><strong>إجمالي المساحة:</strong> ${stats.totalArea.toLocaleString()} م²</div>
      </div>
    `;

    return createCard({
      title: 'إحصائيات الوحدات',
      content: statsContent
    });
  }

  /**
   * Get status variant for badge styling
   * @param {string} status - Status value
   * @returns {string} - Badge variant
   */
  getStatusVariant(status) {
    const variants = {
      'متاحة': 'ok',
      'محجوزة': 'warn',
      'مباعة': 'gold',
      'مرتجعة': 'error',
      'قيد الصيانة': 'info'
    };
    return variants[status] || 'secondary';
  }


  /**
   * Add new contract
   * @param {Object} data - Contract data
   */
  addContract(data) {
    const validation = security.validateFormData(data, ['customerId', 'unitId', 'contractNumber', 'totalAmount', 'downPayment', 'installmentAmount', 'installmentCount', 'startDate', 'endDate', 'status']);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }

    // Check if contract number already exists
    const existingContract = storage.getCollection('contracts').find(c => c.contractNumber === data.contractNumber);
    if (existingContract) {
      showToast('رقم العقد موجود بالفعل، يرجى استخدام رقم آخر', 'error');
      return;
    }

    // Validate amounts
    const totalAmount = parseFloat(validation.data.totalAmount);
    const downPayment = parseFloat(validation.data.downPayment);
    const installmentAmount = parseFloat(validation.data.installmentAmount);
    const installmentCount = parseInt(validation.data.installmentCount);

    if (downPayment >= totalAmount) {
      showToast('قيمة المقدم يجب أن تكون أقل من إجمالي المبلغ', 'error');
      return;
    }

    const remainingAmount = totalAmount - downPayment;
    const expectedTotal = installmentAmount * installmentCount;
    
    if (Math.abs(remainingAmount - expectedTotal) > 1) {
      showToast(`المبلغ المتبقي (${formatEGP(remainingAmount)}) لا يتطابق مع إجمالي الأقساط (${formatEGP(expectedTotal)})`, 'error');
      return;
    }

    const contract = {
      id: `C-${Date.now()}`,
      ...validation.data,
      totalAmount,
      downPayment,
      installmentAmount,
      installmentCount,
      remainingAmount,
      createdAt: getTodayDate()
    };

    storage.addItem('contracts', contract);

    // Update unit status to reserved
    storage.updateItem('units', contract.unitId, { status: 'محجوزة' });

    showToast('تم إضافة العقد بنجاح', 'success');
    this.renderContracts();
  }

  /**
   * Edit contract
   * @param {string} contractId - Contract ID
   */
  editContract(contractId) {
    const contract = storage.findItem('contracts', contractId);
    if (!contract) {
      showToast('العقد غير موجود', 'error');
      return;
    }

    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete contract
   * @param {string} contractId - Contract ID
   */
  async deleteContract(contractId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذا العقد؟ سيتم أيضاً حذف جميع الأقساط المرتبطة به.');
    if (!confirmed) return;

    const contract = storage.findItem('contracts', contractId);
    if (!contract) {
      showToast('العقد غير موجود', 'error');
      return;
    }

    // Delete related installments
    const installments = storage.getCollection('installments').filter(i => i.contractId === contractId);
    installments.forEach(installment => {
      storage.removeItem('installments', installment.id);
    });

    // Update unit status back to available
    if (contract.unitId) {
      storage.updateItem('units', contract.unitId, { status: 'متاحة' });
    }

    const success = storage.removeItem('contracts', contractId);
    if (success) {
      showToast('تم حذف العقد والأقساط المرتبطة به بنجاح', 'success');
      this.renderContracts();
    } else {
      showToast('خطأ في حذف العقد', 'error');
    }
  }

  /**
   * View contract details
   * @param {string} contractId - Contract ID
   */
  viewContractDetails(contractId) {
    const contract = storage.findItem('contracts', contractId);
    if (!contract) {
      showToast('العقد غير موجود', 'error');
      return;
    }

    const state = storage.getState();
    const customer = state.customers.find(c => c.id === contract.customerId);
    const unit = state.units.find(u => u.id === contract.unitId);
    const installments = state.installments.filter(i => i.contractId === contractId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '700px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">تفاصيل العقد: ${contract.contractNumber}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div class="grid grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div><strong>العميل:</strong> ${customer?.name || 'غير محدد'}</div>
        <div><strong>الوحدة:</strong> ${unit?.code || 'غير محدد'} - ${unit?.type || ''}</div>
        <div><strong>إجمالي المبلغ:</strong> ${formatEGP(contract.totalAmount)}</div>
        <div><strong>المقدم:</strong> ${formatEGP(contract.downPayment)}</div>
        <div><strong>المبلغ المتبقي:</strong> ${formatEGP(contract.remainingAmount)}</div>
        <div><strong>قيمة القسط:</strong> ${formatEGP(contract.installmentAmount)}</div>
        <div><strong>عدد الأقساط:</strong> ${contract.installmentCount}</div>
        <div><strong>تاريخ البداية:</strong> ${contract.startDate}</div>
        <div><strong>تاريخ النهاية:</strong> ${contract.endDate}</div>
        <div><strong>الحالة:</strong> <span class="badge badge-${this.getContractStatusVariant(contract.status)}">${contract.status}</span></div>
      </div>
      
      ${contract.notes ? `<div style="margin-bottom: 16px;"><strong>ملاحظات:</strong><br>${contract.notes}</div>` : ''}
      
      <div style="margin-bottom: 16px;">
        <strong>الأقساط (${installments.length}):</strong>
        ${installments.length > 0 ? `
          <div style="max-height: 200px; overflow-y: auto; margin-top: 8px; border: 1px solid var(--line); border-radius: 8px;">
            ${installments.map(inst => `
              <div style="padding: 8px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between;">
                <span>قسط ${inst.installmentNumber} - ${inst.dueDate}</span>
                <span>${formatEGP(inst.amount)} - <span class="badge badge-${this.getInstallmentStatusVariant(inst.status)}">${inst.status}</span></span>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: var(--muted); margin-top: 8px;">لم يتم توليد أقساط بعد</p>'}
      </div>
      
      <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
        تم الإنشاء: ${contract.createdAt || 'غير محدد'}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button class="btn secondary" onclick="app.editContract('${contract.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">تعديل</button>
        <button class="btn warn" onclick="app.deleteContract('${contract.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حذف</button>
        ${installments.length === 0 ? `<button class="btn info" onclick="app.generateInstallments('${contract.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">توليد أقساط</button>` : ''}
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Generate installments for a contract
   * @param {string} contractId - Contract ID
   */
  generateInstallments(contractId) {
    const contract = storage.findItem('contracts', contractId);
    if (!contract) {
      showToast('العقد غير موجود', 'error');
      return;
    }

    // Check if installments already exist
    const existingInstallments = storage.getCollection('installments').filter(i => i.contractId === contractId);
    if (existingInstallments.length > 0) {
      showToast('الأقساط موجودة بالفعل لهذا العقد', 'error');
      return;
    }

    const startDate = new Date(contract.startDate);
    const installments = [];

    for (let i = 1; i <= contract.installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const installment = {
        id: `I-${Date.now()}-${i}`,
        contractId: contract.id,
        installmentNumber: i,
        amount: contract.installmentAmount,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: 'غير مدفوع',
        createdAt: getTodayDate()
      };

      installments.push(installment);
    }

    // Add all installments to storage
    installments.forEach(installment => {
      storage.addItem('installments', installment);
    });

    showToast(`تم توليد ${installments.length} قسط بنجاح`, 'success');
    
    // Refresh the view if we're currently viewing contracts
    if (this.currentView === 'contracts') {
      this.renderContracts();
    }
  }

  /**
   * Create contracts statistics card
   * @param {Array} contracts - Contracts array
   * @returns {HTMLElement} - Statistics card
   */
  createContractsStatistics(contracts) {
    const stats = {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'نشط').length,
      completed: contracts.filter(c => c.status === 'مكتمل').length,
      cancelled: contracts.filter(c => c.status === 'ملغي').length,
      overdue: contracts.filter(c => c.status === 'متأخر').length,
      totalValue: contracts.reduce((sum, c) => sum + (parseFloat(c.totalAmount) || 0), 0),
      totalDownPayments: contracts.reduce((sum, c) => sum + (parseFloat(c.downPayment) || 0), 0),
      avgContractValue: contracts.length > 0 ? contracts.reduce((sum, c) => sum + (parseFloat(c.totalAmount) || 0), 0) / contracts.length : 0
    };

    const statsContent = document.createElement('div');
    statsContent.innerHTML = `
      <div class="grid grid-2" style="gap: 12px; margin-bottom: 16px;">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--brand); font-size: 24px; font-weight: bold;">${stats.total}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي العقود</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--ok); font-size: 24px; font-weight: bold;">${stats.active}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">نشطة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--gold); font-size: 24px; font-weight: bold;">${stats.completed}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">مكتملة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--warn); font-size: 24px; font-weight: bold;">${stats.overdue}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">متأخرة</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--line); padding-top: 12px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>إجمالي قيمة العقود:</strong> ${formatEGP(stats.totalValue)}</div>
        <div style="margin-bottom: 8px;"><strong>إجمالي المقدمات:</strong> ${formatEGP(stats.totalDownPayments)}</div>
        <div><strong>متوسط قيمة العقد:</strong> ${formatEGP(stats.avgContractValue)}</div>
      </div>
    `;

    return createCard({
      title: 'إحصائيات العقود',
      content: statsContent
    });
  }

  /**
   * Get contract status variant for badge styling
   * @param {string} status - Status value
   * @returns {string} - Badge variant
   */
  getContractStatusVariant(status) {
    const variants = {
      'نشط': 'ok',
      'مكتمل': 'gold',
      'ملغي': 'error',
      'متأخر': 'warn'
    };
    return variants[status] || 'secondary';
  }

  /**
   * Get installment status variant for badge styling
   * @param {string} status - Status value
   * @returns {string} - Badge variant
   */
  getInstallmentStatusVariant(status) {
    const variants = {
      'مدفوع': 'ok',
      'غير مدفوع': 'warn',
      'متأخر': 'error',
      'مدفوع جزئياً': 'info'
    };
    return variants[status] || 'secondary';
  }


  /**
   * Pay installment
   * @param {string} installmentId - Installment ID
   */
  payInstallment(installmentId) {
    const installment = storage.findItem('installments', installmentId);
    if (!installment) {
      showToast('القسط غير موجود', 'error');
      return;
    }

    if (installment.status === 'مدفوع') {
      showToast('هذا القسط مدفوع بالفعل', 'info');
      return;
    }

    // Create payment form modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">دفع القسط رقم ${installment.installmentNumber}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>المبلغ المطلوب:</strong> ${formatEGP(installment.amount)}
      </div>
      
      <form id="payment-form">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold;">المبلغ المدفوع (جنيه):</label>
          <input type="number" id="paid-amount" value="${installment.amount}" min="0" max="${installment.amount}" step="0.01" required style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg);">
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold;">تاريخ الدفع:</label>
          <input type="date" id="paid-date" value="${getTodayDate()}" required style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg);">
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold;">طريقة الدفع:</label>
          <select id="payment-method" required style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg);">
            <option value="">اختر طريقة الدفع</option>
            <option value="نقدي">نقدي</option>
            <option value="تحويل بنكي">تحويل بنكي</option>
            <option value="شيك">شيك</option>
            <option value="بطاقة ائتمان">بطاقة ائتمان</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold;">ملاحظات:</label>
          <textarea id="payment-notes" placeholder="أدخل أي ملاحظات إضافية" rows="3" style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); resize: vertical;"></textarea>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" id="cancel-payment" class="btn secondary">إلغاء</button>
          <button type="submit" class="btn ok">تأكيد الدفع</button>
        </div>
      </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#cancel-payment').onclick = closeModal;
    
    modal.querySelector('#payment-form').onsubmit = (e) => {
      e.preventDefault();
      
      const paidAmount = parseFloat(modal.querySelector('#paid-amount').value);
      const paidDate = modal.querySelector('#paid-date').value;
      const paymentMethod = modal.querySelector('#payment-method').value;
      const notes = modal.querySelector('#payment-notes').value;
      
      if (!paidAmount || !paidDate || !paymentMethod) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }
      
      // Determine payment status
      let status = 'مدفوع';
      if (paidAmount < installment.amount) {
        status = 'مدفوع جزئياً';
      }
      
      // Update installment
      const updatedInstallment = {
        ...installment,
        status,
        paidAmount,
        paidDate,
        paymentMethod,
        paymentNotes: notes
      };
      
      storage.updateItem('installments', installmentId, updatedInstallment);
      
      // Create payment record
      const payment = {
        id: `P-${Date.now()}`,
        installmentId,
        contractId: installment.contractId,
        amount: paidAmount,
        paymentDate: paidDate,
        paymentMethod,
        notes,
        createdAt: getTodayDate()
      };
      
      storage.addItem('payments', payment);
      
      closeModal();
      showToast('تم تسجيل الدفع بنجاح', 'success');
      this.renderInstallments();
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Edit installment
   * @param {string} installmentId - Installment ID
   */
  editInstallment(installmentId) {
    const installment = storage.findItem('installments', installmentId);
    if (!installment) {
      showToast('القسط غير موجود', 'error');
      return;
    }

    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete installment
   * @param {string} installmentId - Installment ID
   */
  async deleteInstallment(installmentId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذا القسط؟');
    if (!confirmed) return;

    const success = storage.removeItem('installments', installmentId);
    if (success) {
      showToast('تم حذف القسط بنجاح', 'success');
      this.renderInstallments();
    } else {
      showToast('خطأ في حذف القسط', 'error');
    }
  }

  /**
   * View installment details
   * @param {string} installmentId - Installment ID
   */
  viewInstallmentDetails(installmentId) {
    const installment = storage.findItem('installments', installmentId);
    if (!installment) {
      showToast('القسط غير موجود', 'error');
      return;
    }

    const state = storage.getState();
    const contract = state.contracts.find(c => c.id === installment.contractId);
    const customer = state.customers.find(c => c.id === contract?.customerId);
    const unit = state.units.find(u => u.id === contract?.unitId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">تفاصيل القسط رقم ${installment.installmentNumber}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div class="grid grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div><strong>رقم العقد:</strong> ${contract?.contractNumber || 'غير محدد'}</div>
        <div><strong>العميل:</strong> ${customer?.name || 'غير محدد'}</div>
        <div><strong>الوحدة:</strong> ${unit?.code || 'غير محدد'}</div>
        <div><strong>المبلغ المطلوب:</strong> ${formatEGP(installment.amount)}</div>
        <div><strong>تاريخ الاستحقاق:</strong> ${installment.dueDate}</div>
        <div><strong>الحالة:</strong> <span class="badge badge-${this.getInstallmentStatusVariant(installment.status)}">${installment.status}</span></div>
        ${installment.paidDate ? `<div><strong>تاريخ الدفع:</strong> ${installment.paidDate}</div>` : ''}
        ${installment.paidAmount ? `<div><strong>المبلغ المدفوع:</strong> ${formatEGP(installment.paidAmount)}</div>` : ''}
        ${installment.paymentMethod ? `<div><strong>طريقة الدفع:</strong> ${installment.paymentMethod}</div>` : ''}
      </div>
      
      ${installment.paymentNotes ? `<div style="margin-bottom: 16px;"><strong>ملاحظات الدفع:</strong><br>${installment.paymentNotes}</div>` : ''}
      
      <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
        تم الإنشاء: ${installment.createdAt || 'غير محدد'}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        ${installment.status !== 'مدفوع' ? `<button class="btn ok" onclick="app.payInstallment('${installment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">دفع</button>` : ''}
        <button class="btn secondary" onclick="app.editInstallment('${installment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">تعديل</button>
        <button class="btn warn" onclick="app.deleteInstallment('${installment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حذف</button>
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Create installments statistics card
   * @param {Array} installments - Installments array
   * @returns {HTMLElement} - Statistics card
   */
  createInstallmentsStatistics(installments) {
    const today = new Date();
    
    const stats = {
      total: installments.length,
      paid: installments.filter(i => i.status === 'مدفوع').length,
      unpaid: installments.filter(i => i.status === 'غير مدفوع').length,
      overdue: installments.filter(i => {
        const dueDate = new Date(i.dueDate);
        return dueDate < today && i.status !== 'مدفوع';
      }).length,
      totalAmount: installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0),
      paidAmount: installments.reduce((sum, i) => sum + (parseFloat(i.paidAmount) || 0), 0),
      remainingAmount: installments.reduce((sum, i) => {
        if (i.status !== 'مدفوع') {
          return sum + (parseFloat(i.amount) || 0) - (parseFloat(i.paidAmount) || 0);
        }
        return sum;
      }, 0)
    };

    const statsContent = document.createElement('div');
    statsContent.innerHTML = `
      <div class="grid grid-2" style="gap: 12px; margin-bottom: 16px;">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--brand); font-size: 24px; font-weight: bold;">${stats.total}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي الأقساط</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--ok); font-size: 24px; font-weight: bold;">${stats.paid}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">مدفوعة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--warn); font-size: 24px; font-weight: bold;">${stats.unpaid}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">غير مدفوعة</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--error); font-size: 24px; font-weight: bold;">${stats.overdue}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">متأخرة</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--line); padding-top: 12px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>إجمالي المبلغ:</strong> ${formatEGP(stats.totalAmount)}</div>
        <div style="margin-bottom: 8px;"><strong>المبلغ المدفوع:</strong> ${formatEGP(stats.paidAmount)}</div>
        <div><strong>المبلغ المتبقي:</strong> ${formatEGP(stats.remainingAmount)}</div>
      </div>
    `;

    return createCard({
      title: 'إحصائيات الأقساط',
      content: statsContent
    });
  }

  /**
   * Create overdue installments card
   * @param {Array} installments - Installments array
   * @param {Array} contracts - Contracts array
   * @param {Array} customers - Customers array
   * @param {Array} units - Units array
   * @returns {HTMLElement} - Overdue installments card
   */
  createOverdueInstallments(installments, contracts, customers, units) {
    const today = new Date();
    const overdueInstallments = installments.filter(i => {
      const dueDate = new Date(i.dueDate);
      return dueDate < today && i.status !== 'مدفوع';
    }).slice(0, 5); // Show only first 5

    const overdueContent = document.createElement('div');
    
    if (overdueInstallments.length === 0) {
      overdueContent.innerHTML = '<p style="color: var(--muted); text-align: center;">لا توجد أقساط متأخرة</p>';
    } else {
      overdueContent.innerHTML = overdueInstallments.map(installment => {
        const contract = contracts.find(c => c.id === installment.contractId);
        const customer = customers.find(c => c.id === contract?.customerId);
        const daysDiff = Math.floor((today - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24));
        
        return `
          <div style="padding: 12px; border: 1px solid var(--error); border-radius: 8px; margin-bottom: 8px; background: rgba(var(--error-rgb), 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${customer?.name || 'غير محدد'}</strong> - قسط ${installment.installmentNumber}
                <br><small style="color: var(--muted);">متأخر ${daysDiff} يوم - ${formatEGP(installment.amount)}</small>
              </div>
              <button class="btn error" onclick="app.payInstallment('${installment.id}')" style="font-size: 12px; padding: 6px 12px;">دفع</button>
            </div>
          </div>
        `;
      }).join('');
      
      if (installments.filter(i => {
        const dueDate = new Date(i.dueDate);
        return dueDate < today && i.status !== 'مدفوع';
      }).length > 5) {
        overdueContent.innerHTML += '<p style="text-align: center; color: var(--muted); font-size: 12px;">وأقساط أخرى متأخرة...</p>';
      }
    }

    return createCard({
      title: `الأقساط المتأخرة (${overdueInstallments.length})`,
      content: overdueContent
    });
  }

  /**
   * Create upcoming installments card
   * @param {Array} installments - Installments array
   * @param {Array} contracts - Contracts array
   * @param {Array} customers - Customers array
   * @param {Array} units - Units array
   * @returns {HTMLElement} - Upcoming installments card
   */
  createUpcomingInstallments(installments, contracts, customers, units) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const upcomingInstallments = installments.filter(i => {
      const dueDate = new Date(i.dueDate);
      return dueDate >= today && dueDate <= nextMonth && i.status !== 'مدفوع';
    }).slice(0, 5); // Show only first 5

    const upcomingContent = document.createElement('div');
    
    if (upcomingInstallments.length === 0) {
      upcomingContent.innerHTML = '<p style="color: var(--muted); text-align: center;">لا توجد أقساط مستحقة خلال الشهر القادم</p>';
    } else {
      upcomingContent.innerHTML = upcomingInstallments.map(installment => {
        const contract = contracts.find(c => c.id === installment.contractId);
        const customer = customers.find(c => c.id === contract?.customerId);
        const daysUntilDue = Math.floor((new Date(installment.dueDate) - today) / (1000 * 60 * 60 * 24));
        
        return `
          <div style="padding: 12px; border: 1px solid var(--warn); border-radius: 8px; margin-bottom: 8px; background: rgba(var(--warn-rgb), 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${customer?.name || 'غير محدد'}</strong> - قسط ${installment.installmentNumber}
                <br><small style="color: var(--muted);">خلال ${daysUntilDue} يوم - ${formatEGP(installment.amount)}</small>
              </div>
              <button class="btn warn" onclick="app.payInstallment('${installment.id}')" style="font-size: 12px; padding: 6px 12px;">دفع</button>
            </div>
          </div>
        `;
      }).join('');
    }

    return createCard({
      title: `الأقساط القادمة (${upcomingInstallments.length})`,
      content: upcomingContent
    });
  }


  /**
   * Add new payment
   * @param {Object} data - Payment data
   */
  addPayment(data) {
    const validation = security.validateFormData(data, ['installmentId', 'amount', 'paymentDate', 'paymentMethod']);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }

    const installment = storage.findItem('installments', data.installmentId);
    if (!installment) {
      showToast('القسط المحدد غير موجود', 'error');
      return;
    }

    const amount = parseFloat(validation.data.amount);
    const remainingAmount = installment.amount - (installment.paidAmount || 0);

    if (amount <= 0) {
      showToast('المبلغ يجب أن يكون أكبر من صفر', 'error');
      return;
    }

    if (amount > remainingAmount) {
      showToast(`المبلغ المدفوع (${formatEGP(amount)}) أكبر من المبلغ المتبقي (${formatEGP(remainingAmount)})`, 'error');
      return;
    }

    const payment = {
      id: `P-${Date.now()}`,
      installmentId: data.installmentId,
      contractId: installment.contractId,
      amount,
      paymentDate: validation.data.paymentDate,
      paymentMethod: validation.data.paymentMethod,
      referenceNumber: validation.data.referenceNumber || '',
      notes: validation.data.notes || '',
      createdAt: getTodayDate()
    };

    storage.addItem('payments', payment);

    // Update installment status
    const newPaidAmount = (installment.paidAmount || 0) + amount;
    let newStatus = 'غير مدفوع';
    
    if (newPaidAmount >= installment.amount) {
      newStatus = 'مدفوع';
    } else if (newPaidAmount > 0) {
      newStatus = 'مدفوع جزئياً';
    }

    storage.updateItem('installments', data.installmentId, {
      paidAmount: newPaidAmount,
      status: newStatus,
      paidDate: newStatus === 'مدفوع' ? validation.data.paymentDate : installment.paidDate,
      paymentMethod: validation.data.paymentMethod,
      paymentNotes: validation.data.notes
    });

    showToast('تم تسجيل الدفعة بنجاح', 'success');
    this.renderPayments();
  }

  /**
   * Edit payment
   * @param {string} paymentId - Payment ID
   */
  editPayment(paymentId) {
    const payment = storage.findItem('payments', paymentId);
    if (!payment) {
      showToast('الدفعة غير موجودة', 'error');
      return;
    }

    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete payment
   * @param {string} paymentId - Payment ID
   */
  async deletePayment(paymentId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذه الدفعة؟ سيتم تحديث حالة القسط المرتبط.');
    if (!confirmed) return;

    const payment = storage.findItem('payments', paymentId);
    if (!payment) {
      showToast('الدفعة غير موجودة', 'error');
      return;
    }

    // Update installment status
    const installment = storage.findItem('installments', payment.installmentId);
    if (installment) {
      const newPaidAmount = Math.max(0, (installment.paidAmount || 0) - payment.amount);
      let newStatus = 'غير مدفوع';
      
      if (newPaidAmount >= installment.amount) {
        newStatus = 'مدفوع';
      } else if (newPaidAmount > 0) {
        newStatus = 'مدفوع جزئياً';
      }

      storage.updateItem('installments', payment.installmentId, {
        paidAmount: newPaidAmount,
        status: newStatus
      });
    }

    const success = storage.removeItem('payments', paymentId);
    if (success) {
      showToast('تم حذف الدفعة بنجاح', 'success');
      this.renderPayments();
    } else {
      showToast('خطأ في حذف الدفعة', 'error');
    }
  }

  /**
   * View payment details
   * @param {string} paymentId - Payment ID
   */
  viewPaymentDetails(paymentId) {
    const payment = storage.findItem('payments', paymentId);
    if (!payment) {
      showToast('الدفعة غير موجودة', 'error');
      return;
    }

    const state = storage.getState();
    const installment = state.installments.find(i => i.id === payment.installmentId);
    const contract = state.contracts.find(c => c.id === payment.contractId || c.id === installment?.contractId);
    const customer = state.customers.find(c => c.id === contract?.customerId);
    const unit = state.units.find(u => u.id === contract?.unitId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">تفاصيل الدفعة: ${payment.id.split('-')[1] || payment.id}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div class="grid grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div><strong>العميل:</strong> ${customer?.name || 'غير محدد'}</div>
        <div><strong>رقم العقد:</strong> ${contract?.contractNumber || 'غير محدد'}</div>
        <div><strong>الوحدة:</strong> ${unit?.code || 'غير محدد'}</div>
        <div><strong>رقم القسط:</strong> ${installment?.installmentNumber || 'غير محدد'}</div>
        <div><strong>المبلغ المدفوع:</strong> ${formatEGP(payment.amount)}</div>
        <div><strong>تاريخ الدفع:</strong> ${payment.paymentDate}</div>
        <div><strong>طريقة الدفع:</strong> ${payment.paymentMethod}</div>
        <div><strong>رقم المرجع:</strong> ${payment.referenceNumber || 'غير محدد'}</div>
      </div>
      
      ${payment.notes ? `<div style="margin-bottom: 16px;"><strong>ملاحظات:</strong><br>${payment.notes}</div>` : ''}
      
      <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
        تم التسجيل: ${payment.createdAt || 'غير محدد'}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn secondary" onclick="app.editPayment('${payment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">تعديل</button>
        <button class="btn warn" onclick="app.deletePayment('${payment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حذف</button>
        <button class="btn info" onclick="app.printPaymentReceipt('${payment.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">طباعة إيصال</button>
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Print payment receipt
   * @param {string} paymentId - Payment ID
   */
  printPaymentReceipt(paymentId) {
    const payment = storage.findItem('payments', paymentId);
    if (!payment) {
      showToast('الدفعة غير موجودة', 'error');
      return;
    }

    const state = storage.getState();
    const installment = state.installments.find(i => i.id === payment.installmentId);
    const contract = state.contracts.find(c => c.id === payment.contractId || c.id === installment?.contractId);
    const customer = state.customers.find(c => c.id === contract?.customerId);
    const unit = state.units.find(u => u.id === contract?.unitId);

    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال دفع - ${payment.id.split('-')[1] || payment.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .details { margin-bottom: 20px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details td { padding: 8px; border-bottom: 1px solid #ddd; }
          .details td:first-child { font-weight: bold; width: 30%; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>إيصال دفع</h1>
          <h2>مدير الاستثمار العقاري</h2>
          <p>رقم الإيصال: ${payment.id.split('-')[1] || payment.id}</p>
        </div>
        
        <div class="details">
          <table>
            <tr><td>العميل:</td><td>${customer?.name || 'غير محدد'}</td></tr>
            <tr><td>رقم العقد:</td><td>${contract?.contractNumber || 'غير محدد'}</td></tr>
            <tr><td>الوحدة:</td><td>${unit?.code || 'غير محدد'}</td></tr>
            <tr><td>رقم القسط:</td><td>${installment?.installmentNumber || 'غير محدد'}</td></tr>
            <tr><td>المبلغ المدفوع:</td><td>${formatEGP(payment.amount)}</td></tr>
            <tr><td>تاريخ الدفع:</td><td>${payment.paymentDate}</td></tr>
            <tr><td>طريقة الدفع:</td><td>${payment.paymentMethod}</td></tr>
            ${payment.referenceNumber ? `<tr><td>رقم المرجع:</td><td>${payment.referenceNumber}</td></tr>` : ''}
            ${payment.notes ? `<tr><td>ملاحظات:</td><td>${payment.notes}</td></tr>` : ''}
          </table>
        </div>
        
        <div class="footer">
          <p>تم الطباعة في: ${new Date().toLocaleDateString('ar-EG')}</p>
          <p>هذا إيصال رسمي صادر من نظام إدارة العقارات</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    receiptWindow.document.close();
  }

  /**
   * Create payments statistics card
   * @param {Array} payments - Payments array
   * @returns {HTMLElement} - Statistics card
   */
  createPaymentsStatistics(payments) {
    const today = new Date();
    const thisMonth = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
    });

    const stats = {
      total: payments.length,
      thisMonth: thisMonth.length,
      totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      thisMonthAmount: thisMonth.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      avgPayment: payments.length > 0 ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / payments.length : 0,
      cashPayments: payments.filter(p => p.paymentMethod === 'نقدي').length,
      bankTransfers: payments.filter(p => p.paymentMethod === 'تحويل بنكي').length,
      checks: payments.filter(p => p.paymentMethod === 'شيك').length
    };

    const statsContent = document.createElement('div');
    statsContent.innerHTML = `
      <div class="grid grid-2" style="gap: 12px; margin-bottom: 16px;">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--brand); font-size: 24px; font-weight: bold;">${stats.total}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي المدفوعات</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--ok); font-size: 24px; font-weight: bold;">${stats.thisMonth}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">هذا الشهر</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--gold); font-size: 18px; font-weight: bold;">${formatEGP(stats.totalAmount)}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي المبلغ</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--info); font-size: 18px; font-weight: bold;">${formatEGP(stats.thisMonthAmount)}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">مبلغ هذا الشهر</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--line); padding-top: 12px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>متوسط الدفعة:</strong> ${formatEGP(stats.avgPayment)}</div>
        <div style="margin-bottom: 8px;"><strong>نقدي:</strong> ${stats.cashPayments} | <strong>تحويل:</strong> ${stats.bankTransfers} | <strong>شيك:</strong> ${stats.checks}</div>
      </div>
    `;

    return createCard({
      title: 'إحصائيات المدفوعات',
      content: statsContent
    });
  }

  /**
   * Create recent payments card
   * @param {Array} payments - Payments array
   * @param {Array} contracts - Contracts array
   * @param {Array} customers - Customers array
   * @returns {HTMLElement} - Recent payments card
   */
  createRecentPayments(payments, contracts, customers) {
    const recentPayments = payments
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 5);

    const recentContent = document.createElement('div');
    
    if (recentPayments.length === 0) {
      recentContent.innerHTML = '<p style="color: var(--muted); text-align: center;">لا توجد مدفوعات مسجلة</p>';
    } else {
      recentContent.innerHTML = recentPayments.map(payment => {
        const contract = contracts.find(c => c.id === payment.contractId);
        const customer = customers.find(c => c.id === contract?.customerId);
        
        return `
          <div style="padding: 12px; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px; background: var(--bg);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${customer?.name || 'غير محدد'}</strong> - ${formatEGP(payment.amount)}
                <br><small style="color: var(--muted);">${payment.paymentDate} - ${payment.paymentMethod}</small>
              </div>
              <button class="btn info" onclick="app.viewPaymentDetails('${payment.id}')" style="font-size: 12px; padding: 6px 12px;">تفاصيل</button>
            </div>
          </div>
        `;
      }).join('');
    }

    return createCard({
      title: `المدفوعات الأخيرة (${recentPayments.length})`,
      content: recentContent
    });
  }


  /**
   * Add new partner
   * @param {Object} data - Partner data
   */
  addPartner(data) {
    const validation = security.validateFormData(data, ['name', 'type', 'phone', 'address', 'status']);
    
    if (!validation.isValid) {
      showToast(validation.errors.join(', '), 'error');
      return;
    }

    // Check if partner name already exists
    const existingPartner = storage.getCollection('partners').find(p => p.name.toLowerCase() === data.name.toLowerCase());
    if (existingPartner) {
      showToast('اسم الشريك موجود بالفعل، يرجى استخدام اسم آخر', 'error');
      return;
    }

    const partner = {
      id: `PT-${Date.now()}`,
      ...validation.data,
      commissionRate: parseFloat(validation.data.commissionRate) || 0,
      createdAt: getTodayDate()
    };

    storage.addItem('partners', partner);
    showToast('تم إضافة الشريك بنجاح', 'success');
    this.renderPartners();
  }

  /**
   * Edit partner
   * @param {string} partnerId - Partner ID
   */
  editPartner(partnerId) {
    const partner = storage.findItem('partners', partnerId);
    if (!partner) {
      showToast('الشريك غير موجود', 'error');
      return;
    }

    showToast('ميزة التعديل قيد التطوير', 'info');
  }

  /**
   * Delete partner
   * @param {string} partnerId - Partner ID
   */
  async deletePartner(partnerId) {
    const confirmed = await showConfirmDialog('هل أنت متأكد من حذف هذا الشريك؟');
    if (!confirmed) return;

    const success = storage.removeItem('partners', partnerId);
    if (success) {
      showToast('تم حذف الشريك بنجاح', 'success');
      this.renderPartners();
    } else {
      showToast('خطأ في حذف الشريك', 'error');
    }
  }

  /**
   * View partner details
   * @param {string} partnerId - Partner ID
   */
  viewPartnerDetails(partnerId) {
    const partner = storage.findItem('partners', partnerId);
    if (!partner) {
      showToast('الشريك غير موجود', 'error');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">تفاصيل الشريك: ${partner.name}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div class="grid grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div><strong>نوع الشراكة:</strong> ${partner.type}</div>
        <div><strong>رقم الهاتف:</strong> ${partner.phone}</div>
        <div><strong>البريد الإلكتروني:</strong> ${partner.email || 'غير محدد'}</div>
        <div><strong>العنوان:</strong> ${partner.address}</div>
        <div><strong>نسبة العمولة:</strong> ${partner.commissionRate ? `${partner.commissionRate}%` : 'غير محدد'}</div>
        <div><strong>بداية التعاقد:</strong> ${partner.contractStartDate || 'غير محدد'}</div>
        <div><strong>انتهاء التعاقد:</strong> ${partner.contractEndDate || 'غير محدد'}</div>
        <div><strong>الحالة:</strong> <span class="badge badge-${this.getPartnerStatusVariant(partner.status)}">${partner.status}</span></div>
      </div>
      
      ${partner.notes ? `<div style="margin-bottom: 16px;"><strong>ملاحظات:</strong><br>${partner.notes}</div>` : ''}
      
      <div style="margin-bottom: 16px; font-size: 12px; color: var(--muted);">
        تم الإنشاء: ${partner.createdAt || 'غير محدد'}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn secondary" onclick="app.editPartner('${partner.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">تعديل</button>
        <button class="btn warn" onclick="app.deletePartner('${partner.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حذف</button>
        <button class="btn info" onclick="app.calculatePartnerCommissions('${partner.id}'); document.body.removeChild(document.querySelector('.modal-overlay'));">حساب العمولات</button>
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Calculate partner commissions
   * @param {string} partnerId - Partner ID
   */
  calculatePartnerCommissions(partnerId) {
    const partner = storage.findItem('partners', partnerId);
    if (!partner) {
      showToast('الشريك غير موجود', 'error');
      return;
    }

    if (!partner.commissionRate || partner.commissionRate <= 0) {
      showToast('لم يتم تحديد نسبة عمولة لهذا الشريك', 'error');
      return;
    }

    // For now, show a placeholder message
    // In a real implementation, you would calculate commissions based on sales/contracts
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--ink);">عمولات الشريك: ${partner.name}</h3>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">×</button>
      </div>
      
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
        <h4 style="margin-bottom: 16px; color: var(--ink);">حساب العمولات</h4>
        <p style="color: var(--muted); margin-bottom: 20px;">
          نسبة العمولة المحددة: <strong>${partner.commissionRate}%</strong>
        </p>
        <p style="color: var(--muted); margin-bottom: 20px;">
          هذه الميزة قيد التطوير وستكون متاحة قريباً لحساب العمولات بناءً على المبيعات والعقود المرتبطة بالشريك.
        </p>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn" id="close-modal-btn">إغلاق</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => document.body.removeChild(overlay);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  /**
   * Create partners statistics card
   * @param {Array} partners - Partners array
   * @returns {HTMLElement} - Statistics card
   */
  createPartnersStatistics(partners) {
    const stats = {
      total: partners.length,
      active: partners.filter(p => p.status === 'نشط').length,
      suspended: partners.filter(p => p.status === 'معلق').length,
      expired: partners.filter(p => p.status === 'منتهي').length,
      avgCommission: partners.length > 0 ? partners.reduce((sum, p) => sum + (parseFloat(p.commissionRate) || 0), 0) / partners.length : 0,
      developers: partners.filter(p => p.type === 'مطور عقاري').length,
      brokers: partners.filter(p => p.type === 'وسيط عقاري').length,
      contractors: partners.filter(p => p.type === 'مقاول').length
    };

    const statsContent = document.createElement('div');
    statsContent.innerHTML = `
      <div class="grid grid-2" style="gap: 12px; margin-bottom: 16px;">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--brand); font-size: 24px; font-weight: bold;">${stats.total}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">إجمالي الشركاء</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--ok); font-size: 24px; font-weight: bold;">${stats.active}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">نشط</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--warn); font-size: 24px; font-weight: bold;">${stats.suspended}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">معلق</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--error); font-size: 24px; font-weight: bold;">${stats.expired}</div>
          <div class="stat-label" style="color: var(--muted); font-size: 12px;">منتهي</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--line); padding-top: 12px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>متوسط العمولة:</strong> ${stats.avgCommission.toFixed(2)}%</div>
        <div style="margin-bottom: 8px;"><strong>مطورين:</strong> ${stats.developers} | <strong>وسطاء:</strong> ${stats.brokers} | <strong>مقاولين:</strong> ${stats.contractors}</div>
      </div>
    `;

    return createCard({
      title: 'إحصائيات الشركاء',
      content: statsContent
    });
  }

  /**
   * Create active partnerships card
   * @param {Array} partners - Partners array
   * @returns {HTMLElement} - Active partnerships card
   */
  createActivePartnerships(partners) {
    const activePartners = partners.filter(p => p.status === 'نشط').slice(0, 5);

    const activeContent = document.createElement('div');
    
    if (activePartners.length === 0) {
      activeContent.innerHTML = '<p style="color: var(--muted); text-align: center;">لا توجد شراكات نشطة</p>';
    } else {
      activeContent.innerHTML = activePartners.map(partner => {
        return `
          <div style="padding: 12px; border: 1px solid var(--ok); border-radius: 8px; margin-bottom: 8px; background: rgba(var(--ok-rgb), 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${partner.name}</strong> - ${partner.type}
                <br><small style="color: var(--muted);">${partner.phone} ${partner.commissionRate ? `| عمولة: ${partner.commissionRate}%` : ''}</small>
              </div>
              <button class="btn ok" onclick="app.viewPartnerDetails('${partner.id}')" style="font-size: 12px; padding: 6px 12px;">تفاصيل</button>
            </div>
          </div>
        `;
      }).join('');
      
      if (partners.filter(p => p.status === 'نشط').length > 5) {
        activeContent.innerHTML += '<p style="text-align: center; color: var(--muted); font-size: 12px;">وشركاء آخرون نشطون...</p>';
      }
    }

    return createCard({
      title: `الشراكات النشطة (${activePartners.length})`,
      content: activeContent
    });
  }

  /**
   * Get partner status variant for badge styling
   * @param {string} status - Status value
   * @returns {string} - Badge variant
   */
  getPartnerStatusVariant(status) {
    const variants = {
      'نشط': 'ok',
      'معلق': 'warn',
      'منتهي': 'error'
    };
    return variants[status] || 'secondary';
  }


}

// Export the class as default
export default EstateManagerApp;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EstateManagerApp();
});

