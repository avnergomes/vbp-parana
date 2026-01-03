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

// Definição de todas as colunas (DEVE COINCIDIR COM visitData em index.html)
const COLUMNS = [
  // Linha 1: Dados básicos (ordem exata do visitData)
  'page',
  'referrer',
  'userAgent',
  'language',
  'screenWidth',
  'screenHeight',
  'platform',
  'timezone',
  'sessionId',
  'timestamp',
  'returningVisitor',

  // Dispositivo
  'colorDepth',
  'pixelRatio',
  'viewportWidth',
  'viewportHeight',
  'touchSupport',
  'cpuCores',
  'deviceMemory',

  // Navegador
  'vendor',
  'cookiesEnabled',
  'doNotTrack',
  'onlineStatus',

  // Conexão
  'connectionType',
  'connectionSpeed',
  'saveDataMode',

  // URL/Página
  'protocol',
  'hostname',
  'pathname',
  'queryString',
  'pageTitle',

  // Performance
  'loadTime',

  // Orientação
  'screenOrientation',

  // Timezone offset
  'timezoneOffset',

  // Performance detalhada
  'dnsLookupTime',
  'tcpConnectionTime',
  'serverResponseTime',
  'domContentLoadedTime',
  'domInteractiveTime',
  'firstPaint',
  'firstContentfulPaint',
  'transferSize',
  'encodedBodySize',
  'decodedBodySize',

  // Conexão detalhada
  'connectionRTT',
  'connectionDownlinkMax',

  // Capacidades do navegador
  'languages',
  'localStorageEnabled',
  'sessionStorageEnabled',
  'indexedDBEnabled',
  'serviceWorkerEnabled',
  'webGLSupported',
  'webRTCSupported',
  'notificationPermission',

  // Plugins e MIME types
  'pluginsCount',
  'mimeTypesCount',
  'pdfViewerEnabled',

  // Hardware adicional
  'maxTouchPoints',
  'batteryLevel',
  'batteryCharging',

  // Contexto de navegação
  'historyLength',
  'isIframe',

  // Marketing e UTM
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',

  // Informações de sessão
  'sessionStartTime',
  'pageViewsInSession',

  // Dispositivo móvel e tipo
  'isMobile',
  'isTablet',
  'isDesktop',

  // Aspectos de segurança e privacidade
  'secureContext',
  'crossOriginIsolated',

  // Renderização
  'canvasSupported',
  'svgSupported',

  // Armazenamento
  'storageQuota',
  'storageUsage',
  'storageUsagePercent',

  // Tamanho disponível da tela
  'availScreenWidth',
  'availScreenHeight',

  // Modo de exibição
  'displayMode',

  // Preferências do usuário
  'prefersColorScheme',
  'prefersReducedMotion',
  'prefersReducedTransparency',
  'prefersContrast'
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
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA(UNIQUE(${dataSheet}!I:I))-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Total de Page Views');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA(${dataSheet}!A:A)-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Novos Visitantes vs Returning Visitors');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Novos Visitantes');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!K:K,FALSE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Returning Visitors');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF(${dataSheet}!K:K,TRUE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Taxa de Retorno (%)');
  dashboardSheet.getRange(row, 2).setFormula(`=IF(COUNTA(${dataSheet}!K:K)-1>0,COUNTIF(${dataSheet}!K:K,TRUE)/(COUNTA(${dataSheet}!K:K)-1)*100,0)`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Desktop vs Mobile vs Tablet');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Desktop');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${dataSheet}'!BS:BS,TRUE)`); // isDesktop coluna 71
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Mobile');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${dataSheet}'!BQ:BQ,TRUE)`); // isMobile coluna 69
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Tablet');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${dataSheet}'!BR:BR,TRUE)`); // isTablet coluna 70
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Preferência de Tema');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Dark Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${dataSheet}'!CD:CD,"dark")`); // prefersColorScheme coluna 82
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Light Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${dataSheet}'!CD:CD,"light")`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Tempo Médio de Carregamento (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE('${dataSheet}'!AE:AE)`); // loadTime coluna 31
  row++;

  dashboardSheet.getRange(row, 1).setValue('Tempo Médio First Contentful Paint (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE('${dataSheet}'!AN:AN)`); // firstContentfulPaint coluna 40

  // Formatar
  dashboardSheet.autoResizeColumns(1, 2);

  Logger.log('Dashboard criado com sucesso');
}

/**
 * MAPA DE COLUNAS (para referência)
 * Use este mapa para criar fórmulas no dashboard
 */
function getColumnMap() {
  const map = {};
  COLUMNS.forEach((col, index) => {
    const columnLetter = getColumnLetter(index + 1);
    map[col] = columnLetter;
  });

  Logger.log('=== MAPA DE COLUNAS ===');
  for (const [key, value] of Object.entries(map)) {
    Logger.log(`${key}: ${value}`);
  }

  return map;
}

/**
 * Converte número de coluna para letra (1=A, 27=AA, etc)
 */
function getColumnLetter(columnNumber) {
  let temp;
  let letter = '';
  while (columnNumber > 0) {
    temp = (columnNumber - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnNumber = (columnNumber - temp - 1) / 26;
  }
  return letter;
}
