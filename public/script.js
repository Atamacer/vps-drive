class FileManagerApp {
  constructor() {
    this.baseUrl = 'http://localhost:443/api';
    this.token = localStorage.getItem('token');
    this.selectedFiles = [];
    this.filesToUpload = [];

    this.init();
  }

  init() {
    if (this.token) {
      this.showMainScreen();
      this.loadFileList();
    } else {
      this.showAuthScreen();
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Авторизация
    document.querySelector('.tab-btn:first-child')?.addEventListener('click', () => this.showTab('login'));
    document.querySelector('.tab-btn:last-child')?.addEventListener('click', () => this.showTab('register'));
    document.querySelector('#login-form .btn-primary')?.addEventListener('click', () => this.login());
    document.querySelector('#register-form .btn-primary')?.addEventListener('click', () => this.register());

    // Загрузка файлов
    document.getElementById('upload-btn')?.addEventListener('click', () => this.uploadFiles());
    document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());

    // Управление файлами
    document.getElementById('download-btn')?.addEventListener('click', () => this.downloadSelected());
    document.getElementById('delete-btn')?.addEventListener('click', () => this.deleteSelected());
    document.getElementById('select-all')?.addEventListener('change', (e) => this.toggleSelectAll(e.target));

    // Выход
    document.querySelector('.btn-logout')?.addEventListener('click', () => this.logout());

    // Модальное окно
    document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.modal-footer .btn-primary')?.addEventListener('click', () => this.closeModal());

    // Drag and drop для загрузки файлов
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');

    // Выбор файлов по клику на кнопку
    document.getElementById('file-select-btn')?.addEventListener('click', () => {
      fileInput?.click();
    });

    dropArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });

    dropArea?.addEventListener('dragleave', () => {
      dropArea.classList.remove('drag-over');
    });

    dropArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      this.handleFileSelect(e.dataTransfer.files);
    });

    // Выбор файлов через input
    fileInput?.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // Выбор файлов по клику на область drop
    dropArea?.addEventListener('click', (e) => {
      // Проверяем, что клик не на кнопке выбора файлов
      if (!e.target.closest('#file-select-btn')) {
        fileInput?.click();
      }
    });
  }

  handleFileSelect(files) {
    this.filesToUpload = Array.from(files);
    this.updateSelectedFilesDisplay();

    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      uploadBtn.disabled = this.filesToUpload.length === 0;
    }
  }

  updateSelectedFilesDisplay() {
    const container = document.getElementById('selected-files');
    if (!container) return;

    container.innerHTML = '';

    this.filesToUpload.forEach(file => {
      const div = document.createElement('div');
      div.className = 'selected-file';
      div.innerHTML = `
                <span>${this.escapeHtml(file.name)}</span>
                <span class="file-size">${this.formatBytes(file.size)}</span>
            `;
      container.appendChild(div);
    });
  }

  async login() {
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;
    const errorDiv = document.getElementById('login-error');

    if (!username || !password) {
      if (errorDiv) errorDiv.textContent = 'Заполните все поля';
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: username, password })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.access_token;
        localStorage.setItem('token', this.token);
        this.showMainScreen();
        this.loadFileList();
        if (errorDiv) errorDiv.textContent = '';
      } else {
        const error = await response.json();
        if (errorDiv) errorDiv.textContent = error.message || 'Ошибка входа';
      }
    } catch (error) {
      if (errorDiv) errorDiv.textContent = 'Ошибка подключения к серверу';
    }
  }

  async register() {
    const username = document.getElementById('register-username')?.value;
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm')?.value;
    const errorDiv = document.getElementById('register-error');

    if (!username || !password || !confirmPassword) {
      if (errorDiv) errorDiv.textContent = 'Заполните все поля';
      return;
    }

    if (password !== confirmPassword) {
      if (errorDiv) errorDiv.textContent = 'Пароли не совпадают';
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: username, password })
      });

      if (response.ok) {
        this.showModal('Успех', 'Регистрация выполнена успешно! Теперь вы можете войти в систему.');
        this.showTab('login');
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        if (errorDiv) errorDiv.textContent = '';
      } else {
        const error = await response.json();
        if (errorDiv) errorDiv.textContent = error.message || 'Ошибка регистрации';
      }
    } catch (error) {
      if (errorDiv) errorDiv.textContent = 'Ошибка подключения к серверу';
    }
  }

  async uploadFiles() {
    if (this.filesToUpload.length === 0) return;

    const uploadBtn = document.getElementById('upload-btn');
    if (!uploadBtn) return;

    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    uploadBtn.disabled = true;

    const formData = new FormData();
    this.filesToUpload.forEach(file => {
      formData.append('fileOrFiles', file);
    });

    try {
      const response = await fetch(`${this.baseUrl}/upload/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        this.showModal('Успех', data.message);
        this.filesToUpload = [];
        this.updateSelectedFilesDisplay();
        this.loadFileList();
      } else {
        const error = await response.json();
        this.showModal('Ошибка', error.message || 'Ошибка загрузки файлов');
      }
    } catch (error) {
      this.showModal('Ошибка', 'Ошибка подключения к серверу');
    } finally {
      uploadBtn.innerHTML = originalText;
      uploadBtn.disabled = false;
    }
  }

  async loadFileList() {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    filesList.innerHTML = '<tr><td colspan="6" class="loading">Загрузка файлов...</td></tr>';

    try {
      const response = await fetch(`${this.baseUrl}/download/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.displayFiles(data.files);
      } else {
        throw new Error('Ошибка загрузки списка файлов');
      }
    } catch (error) {
      filesList.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
    }
  }

  displayFiles(files) {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    filesList.innerHTML = '';

    if (files.length === 0) {
      filesList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Нет загруженных файлов</td></tr>';
      return;
    }

    files.forEach(file => {
      const row = document.createElement('tr');
      row.dataset.filename = file.name;

      const icon = this.getFileIcon(file.extension);

      row.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox" class="file-checkbox">
                </td>
                <td>
                    <div class="file-name">
                        <i class="${icon} file-icon"></i>
                        ${this.escapeHtml(file.name)}
                    </div>
                </td>
                <td><span class="file-size">${this.escapeHtml(file.size)}</span></td>
                <td><span class="file-extension">${this.escapeHtml(file.extension || '—')}</span></td>
                <td><span class="file-modified">${this.escapeHtml(new Date(file.modified).toLocaleDateString())}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" title="Скачать">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="action-btn" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

      // Добавляем обработчики для чекбокса
      const checkbox = row.querySelector('.file-checkbox');
      checkbox.addEventListener('change', (e) => {
        this.toggleFileSelection(file.name, e.target.checked);
      });

      // Добавляем обработчики для кнопок действий
      const downloadBtn = row.querySelector('.action-btn:first-child');
      downloadBtn.addEventListener('click', () => {
        this.downloadSingleFile(file.name);
      });

      const deleteBtn = row.querySelector('.action-btn:last-child');
      deleteBtn.addEventListener('click', () => {
        this.deleteSingleFile(file.name);
      });

      filesList.appendChild(row);
    });
  }

  getFileIcon(extension) {
    const icons = {
      '.jpg': 'fas fa-file-image',
      '.jpeg': 'fas fa-file-image',
      '.png': 'fas fa-file-image',
      '.gif': 'fas fa-file-image',
      '.pdf': 'fas fa-file-pdf',
      '.doc': 'fas fa-file-word',
      '.docx': 'fas fa-file-word',
      '.xls': 'fas fa-file-excel',
      '.xlsx': 'fas fa-file-excel',
      '.zip': 'fas fa-file-archive',
      '.rar': 'fas fa-file-archive',
      '.txt': 'fas fa-file-alt',
      '.js': 'fas fa-file-code',
      '.html': 'fas fa-file-code',
      '.css': 'fas fa-file-code'
    };

    return icons[extension.toLowerCase()] || 'fas fa-file';
  }

  toggleFileSelection(filename, checked) {
    if (checked) {
      if (!this.selectedFiles.includes(filename)) {
        this.selectedFiles.push(filename);
      }
    } else {
      this.selectedFiles = this.selectedFiles.filter(f => f !== filename);
    }

    this.updateSelectionControls();
  }

  updateSelectionControls() {
    const selectAll = document.getElementById('select-all');
    const selectedCount = document.getElementById('selected-count');
    const downloadBtn = document.getElementById('download-btn');
    const deleteBtn = document.getElementById('delete-btn');

    if (selectedCount) selectedCount.textContent = this.selectedFiles.length;
    if (downloadBtn) downloadBtn.disabled = this.selectedFiles.length === 0;
    if (deleteBtn) deleteBtn.disabled = this.selectedFiles.length === 0;

    const checkboxes = document.querySelectorAll('.file-checkbox');
    if (checkboxes.length > 0 && selectAll) {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      selectAll.checked = allChecked;
    }
  }

  toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checkbox.checked;
      const row = cb.closest('tr');
      if (row) {
        const filename = row.dataset.filename;
        if (checkbox.checked) {
          if (!this.selectedFiles.includes(filename)) {
            this.selectedFiles.push(filename);
          }
        } else {
          this.selectedFiles = this.selectedFiles.filter(f => f !== filename);
        }
      }
    });

    this.updateSelectionControls();
  }

  async downloadSelected() {
    if (this.selectedFiles.length === 0) return;

    try {
      const encodedFilenames = this.selectedFiles.map(f => encodeURIComponent(f));
      const query = encodedFilenames.join('&filenames=');

      const response = await fetch(`${this.baseUrl}/download?filenames=${query}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        if (this.selectedFiles.length === 1) {
          a.download = this.selectedFiles[0];
        } else {
          a.download = `files_${Date.now()}.zip`;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.selectedFiles = [];
        this.updateSelectionControls();
        const selectAll = document.getElementById('select-all');
        if (selectAll) selectAll.checked = false;
        document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
      } else {
        throw new Error('Ошибка скачивания файлов');
      }
    } catch (error) {
      this.showModal('Ошибка', error.message);
    }
  }

  async deleteSelected() {
    if (this.selectedFiles.length === 0) return;

    const confirmDelete = confirm(`Вы уверены, что хотите удалить ${this.selectedFiles.length} файл(ов)?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filepaths: this.selectedFiles })
      });

      if (response.ok) {
        const result = await response.json();
        this.showModal('Успех', result.message);
        this.selectedFiles = [];
        this.updateSelectionControls();
        this.loadFileList();
      } else {
        throw new Error('Ошибка удаления файлов');
      }
    } catch (error) {
      this.showModal('Ошибка', error.message);
    }
  }

  async downloadSingleFile(filename) {
    try {
      const encodedFilename = encodeURIComponent(filename);
      const response = await fetch(`${this.baseUrl}/download?filenames=${encodedFilename}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Ошибка скачивания файла');
      }
    } catch (error) {
      this.showModal('Ошибка', error.message);
    }
  }

  async deleteSingleFile(filename) {
    const confirmDelete = confirm(`Вы уверены, что хотите удалить файл "${filename}"?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filepaths: [filename] })
      });

      if (response.ok) {
        const result = await response.json();
        this.showModal('Успех', result.message);
        this.loadFileList();
      } else {
        throw new Error('Ошибка удаления файла');
      }
    } catch (error) {
      this.showModal('Ошибка', error.message);
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.token = null;
    this.selectedFiles = [];
    this.filesToUpload = [];
    this.showAuthScreen();
  }

  clearSelection() {
    this.filesToUpload = [];
    this.updateSelectedFilesDisplay();
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) uploadBtn.disabled = true;
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  }

  showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');

    if (authScreen) authScreen.classList.remove('hidden');
    if (mainScreen) mainScreen.classList.add('hidden');

    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const registerUsername = document.getElementById('register-username');
    const registerPassword = document.getElementById('register-password');
    const registerConfirm = document.getElementById('register-confirm');

    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerUsername) registerUsername.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerConfirm) registerConfirm.value = '';

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
  }

  showMainScreen() {
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');

    if (authScreen) authScreen.classList.add('hidden');
    if (mainScreen) mainScreen.classList.remove('hidden');
  }

  showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(btn => btn.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));

    if (tabName === 'login') {
      const firstTab = document.querySelector('.tab-btn:first-child');
      const loginForm = document.getElementById('login-form');
      if (firstTab) firstTab.classList.add('active');
      if (loginForm) loginForm.classList.add('active');
    } else {
      const lastTab = document.querySelector('.tab-btn:last-child');
      const registerForm = document.getElementById('register-form');
      if (lastTab) lastTab.classList.add('active');
      if (registerForm) registerForm.classList.add('active');
    }
  }

  showModal(title, message) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;
    if (modal) modal.classList.remove('hidden');
  }

  closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Метод для экранирования HTML-символов
  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  }

// Инициализация приложения при загрузке страницы
let app;

window.addEventListener('DOMContentLoaded', () => {
  app = new FileManagerApp();
  window.app = app;
});