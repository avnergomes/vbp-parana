/**
 * Google Apps Script para receber e armazenar dados de tracking do VBP Paraná
 *
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Abra https://script.google.com
 * 2. Crie um novo projeto
 * 3. Cole este código no editor
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "Aplicativo da Web"
 * 6. Executar como: "Eu"
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL do aplicativo da Web e atualize TRACKING_URL no index.html
 *
 * CONFIGURAÇÃO:
 * - Crie uma planilha do Google Sheets
 * - Copie o ID da planilha da URL (entre /d/ e /edit)
 * - Cole o ID na variável SPREADSHEET_ID abaixo
 */

// CONFIGURAÇÃO - COLE O ID DA SUA PLANILHA AQUI
const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI';
const SHEET_NAME = 'Tracking Data';

// Definição de todas as colunas (na ordem correta)
const COLUMNS = [
  // Dados básicos
  'timestamp',
  'sessionId',
  'page',
  'pageTitle',
  'referrer',

  // URL/Página
  'protocol',
  'hostname',
  'pathname',
  'queryString',

  // Navegador básico
  'userAgent',
  'language',
  'languages',
  'vendor',
  'platform',
  'cookiesEnabled',
  'doNotTrack',
  'onlineStatus',

  // Dispositivo - Tela
  'screenWidth',
  'screenHeight',
  'availScreenWidth',
  'availScreenHeight',
  'viewportWidth',
  'viewportHeight',
  'colorDepth',
  'pixelRatio',
  'screenOrientation',

  // Dispositivo - Tipo
  'isMobile',
  'isTablet',
  'isDesktop',
  'touchSupport',
  'maxTouchPoints',

  // Dispositivo - Hardware
  'cpuCores',
  'deviceMemory',
  'batteryLevel',
  'batteryCharging',

  // Conexão
  'connectionType',
  'connectionSpeed',
  'connectionRTT',
  'connectionDownlinkMax',
  'saveDataMode',

  // Performance - Básica
  'loadTime',

  // Performance - Detalhada
  'dnsLookupTime',
  'tcpConnectionTime',
  'serverResponseTime',
  'domInteractiveTime',
  'domContentLoadedTime',
  'firstPaint',
  'firstContentfulPaint',

  // Performance - Tamanhos
  'transferSize',
  'encodedBodySize',
  'decodedBodySize',

  // Capacidades do navegador
  'localStorageEnabled',
  'sessionStorageEnabled',
  'indexedDBEnabled',
  'serviceWorkerEnabled',
  'webGLSupported',
  'webRTCSupported',
  'canvasSupported',
  'svgSupported',
  'notificationPermission',
  'pdfViewerEnabled',
  'pluginsCount',
  'mimeTypesCount',

  // Armazenamento
  'storageQuota',
  'storageUsage',
  'storageUsagePercent',

  // Contexto
  'secureContext',
  'crossOriginIsolated',
  'historyLength',
  'isIframe',
  'displayMode',

  // Sessão
  'sessionStartTime',
  'pageViewsInSession',

  // Marketing (UTM)
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',

  // Preferências do usuário
  'prefersColorScheme',
  'prefersReducedMotion',
  'prefersReducedTransparency',
  'prefersContrast',

  // Timezone
  'timezone',
  'timezoneOffset'
];

/**
 * Função principal que recebe as requisições POST
 */
function doPost(e) {
  try {
    // Log para debug
    Logger.log('Requisição recebida');

    // Parse do JSON recebido
    const data = JSON.parse(e.postData.contents);
    Logger.log('Dados recebidos: ' + JSON.stringify(data));

    // Salvar dados na planilha
    saveToSheet(data);

    // Retornar sucesso
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Dados salvos com sucesso'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Erro: ' + error.toString());

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função para testar o doGet (não é necessária para o tracking, mas útil para debug)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'VBP Paraná Tracking API está funcionando',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Salva os dados na planilha
 */
function saveToSheet(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // Se a planilha não existe, criar e adicionar cabeçalhos
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);

    // Formatar cabeçalho
    const headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');

    // Congelar primeira linha
    sheet.setFrozenRows(1);
  }

  // Preparar array de valores na ordem das colunas
  const rowData = COLUMNS.map(column => {
    const value = data[column];

    // Converter valores para formato apropriado
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  });

  // Adicionar linha com os dados
  sheet.appendRow(rowData);

  Logger.log('Dados salvos com sucesso na linha ' + sheet.getLastRow());
}

/**
 * Função para criar índices e melhorar performance (execute manualmente uma vez)
 */
function setupSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);

    // Formatar cabeçalho
    const headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setWrap(true);

    // Congelar primeira linha
    sheet.setFrozenRows(1);

    // Ajustar largura das colunas
    sheet.autoResizeColumns(1, COLUMNS.length);
  }

  Logger.log('Planilha configurada com sucesso');
  Logger.log('Total de colunas: ' + COLUMNS.length);
}

/**
 * Função para obter estatísticas da planilha
 */
function getStats() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log('Planilha não encontrada. Execute setupSheet() primeiro.');
    return;
  }

  const totalRows = sheet.getLastRow() - 1; // Excluir cabeçalho
  const totalColumns = sheet.getLastColumn();

  Logger.log('=== Estatísticas da Planilha ===');
  Logger.log('Total de registros: ' + totalRows);
  Logger.log('Total de colunas: ' + totalColumns);
  Logger.log('Colunas esperadas: ' + COLUMNS.length);

  if (totalRows > 0) {
    // Pegar primeira e última entrada
    const firstRow = sheet.getRange(2, 1, 1, totalColumns).getValues()[0];
    const lastRow = sheet.getRange(sheet.getLastRow(), 1, 1, totalColumns).getValues()[0];

    Logger.log('Primeira entrada: ' + firstRow[0]); // timestamp
    Logger.log('Última entrada: ' + lastRow[0]); // timestamp
  }
}

/**
 * Função para criar uma visualização resumida (Dashboard)
 */
function createDashboardSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dashboardSheet = spreadsheet.getSheetByName('Dashboard');

  if (!dashboardSheet) {
    dashboardSheet = spreadsheet.insertSheet('Dashboard');
  } else {
    dashboardSheet.clear();
  }

  // Título
  dashboardSheet.getRange('A1').setValue('VBP Paraná - Dashboard de Analytics');
  dashboardSheet.getRange('A1').setFontSize(16).setFontWeight('bold');

  // Métricas básicas
  const dataSheet = SHEET_NAME;
  let row = 3;

  dashboardSheet.getRange(row, 1).setValue('Total de Visitantes Únicos (Sessões)');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA(UNIQUE(${dataSheet}!B:B))-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Total de Page Views');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA(${dataSheet}!A:A)-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Desktop vs Mobile vs Tablet');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Desktop');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!AC:AC,"TRUE")`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Mobile');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!AA:AA,"TRUE")`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Tablet');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!AB:AB,"TRUE")`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Preferência de Tema');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Dark Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!BT:BT,"dark")`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Light Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!BT:BT,"light")`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Tempo Médio de Carregamento (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE(${dataSheet}!AW:AW)`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Tempo Médio First Contentful Paint (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE(${dataSheet}!BC:BC)`);

  // Formatar
  dashboardSheet.autoResizeColumns(1, 2);

  Logger.log('Dashboard criado com sucesso');
}
