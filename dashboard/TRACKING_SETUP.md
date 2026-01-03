# VBP Paraná - Setup do Sistema de Tracking

Este guia explica como configurar o sistema de tracking completo para coletar dados de uso do dashboard.

## 📊 Dados Coletados

O sistema coleta **85 campos diferentes** de dados, incluindo:

### Categorias de Dados

1. **Dados Básicos** (11 campos)
   - Página, título, referrer, timestamp, session ID, returning visitor, etc.

2. **Informações do Navegador** (8 campos)
   - User agent, idioma(s), vendor, plataforma, cookies, Do Not Track, etc.

3. **Dispositivo - Tela** (9 campos)
   - Dimensões da tela, viewport, profundidade de cor, pixel ratio, orientação

4. **Dispositivo - Tipo** (5 campos)
   - Detecção de mobile, tablet, desktop, suporte a touch

5. **Dispositivo - Hardware** (4 campos)
   - CPU cores, memória, nível de bateria, status de carregamento

6. **Conexão** (5 campos)
   - Tipo de conexão, velocidade, RTT, modo de economia de dados

7. **Performance - Básica** (1 campo)
   - Tempo total de carregamento

8. **Performance - Detalhada** (7 campos)
   - DNS lookup, TCP connection, server response, DOM interactive/loaded, First Paint/FCP

9. **Performance - Tamanhos** (3 campos)
   - Transfer size, encoded/decoded body size

10. **Capacidades do Navegador** (12 campos)
    - localStorage, sessionStorage, IndexedDB, Service Worker, WebGL, WebRTC, Canvas, SVG, notificações, PDF viewer, plugins, MIME types

11. **Armazenamento** (3 campos)
    - Quota, uso, percentual usado

12. **Contexto** (5 campos)
    - Secure context, cross-origin isolated, history length, iframe, display mode

13. **Sessão** (2 campos)
    - Início da sessão, page views na sessão

14. **Marketing (UTM)** (5 campos)
    - utm_source, utm_medium, utm_campaign, utm_term, utm_content

15. **Preferências do Usuário** (4 campos)
    - Color scheme (dark/light), reduced motion, reduced transparency, contrast

16. **Timezone** (2 campos)
    - Timezone, timezone offset

---

## 🚀 Passo 1: Criar a Planilha do Google Sheets

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha
3. Dê um nome à planilha (ex: "VBP Paraná Analytics")
4. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/[ID_DA_PLANILHA]/edit
   ```
   Exemplo: Se a URL é `https://docs.google.com/spreadsheets/d/1abc123xyz/edit`, o ID é `1abc123xyz`

---

## 🔧 Passo 2: Configurar o Google Apps Script

1. Acesse [Google Apps Script](https://script.google.com)
2. Clique em **"Novo projeto"**
3. Dê um nome ao projeto (ex: "VBP Tracking API")
4. Cole o conteúdo do arquivo `google-apps-script-tracking.gs`
5. **IMPORTANTE**: Na linha 21, substitua `'SEU_SPREADSHEET_ID_AQUI'` pelo ID da planilha que você copiou:
   ```javascript
   const SPREADSHEET_ID = '1abc123xyz'; // Cole seu ID aqui
   ```
6. Clique em **"Salvar"** (ícone de disquete ou Ctrl+S)

---

## 🔑 Passo 3: Executar a Configuração Inicial

1. No Google Apps Script, selecione a função `setupSheet` no menu dropdown (próximo ao botão "Executar")
2. Clique em **"Executar"**
3. Na primeira execução, você precisará autorizar o script:
   - Clique em **"Revisar permissões"**
   - Escolha sua conta do Google
   - Clique em **"Avançado"** → **"Ir para [nome do projeto] (não seguro)"**
   - Clique em **"Permitir"**
4. Aguarde a execução terminar
5. Volte para sua planilha do Google Sheets - você verá uma nova aba chamada **"Tracking Data"** com todos os cabeçalhos das colunas

---

## 🌐 Passo 4: Implantar como Aplicativo Web

1. No Google Apps Script, clique em **"Implantar"** → **"Nova implantação"**
2. Clique no ícone de engrenagem ⚙️ ao lado de "Tipo" e selecione **"Aplicativo da Web"**
3. Configure:
   - **Descrição**: "VBP Tracking API"
   - **Executar como**: "Eu ([seu email])"
   - **Quem tem acesso**: "Qualquer pessoa"
4. Clique em **"Implantar"**
5. Copie a **URL do aplicativo da Web** (será algo como `https://script.google.com/macros/s/AKfy.../exec`)
6. Clique em **"Concluído"**

---

## 📝 Passo 5: Atualizar a URL no Dashboard

1. Abra o arquivo `dashboard/index.html`
2. Na linha 19, substitua a URL existente pela URL que você copiou no passo anterior:
   ```javascript
   const TRACKING_URL = 'https://script.google.com/macros/s/[SUA_URL_AQUI]/exec';
   ```
3. Salve o arquivo
4. Faça commit e deploy das alterações

---

## ✅ Passo 6: Testar o Tracking

1. Abra o dashboard no navegador
2. Abra o Console do navegador (F12 → Console)
3. Você verá mensagens de log do tracking:
   ```
   [VBP Tracking] Inicializando rastreamento
   [VBP Tracking] Novo sessionId criado: sess_xxxxx
   [VBP Tracking] Enviando dados: {objeto com todos os dados}
   [VBP Tracking] Requisição enviada com sucesso (no-cors - sem resposta)
   ```
4. Volte para a planilha do Google Sheets e verifique se uma nova linha foi adicionada com os dados

---

## 📊 Passo 7: Criar Dashboard de Visualização (Opcional)

1. No Google Apps Script, selecione a função `createDashboardSheet`
2. Clique em **"Executar"**
3. Volte para a planilha - uma nova aba **"Dashboard"** será criada com métricas resumidas:
   - Total de visitantes únicos
   - Total de page views
   - Distribuição Desktop vs Mobile vs Tablet
   - Preferência de tema (Dark vs Light)
   - Tempo médio de carregamento
   - Tempo médio First Contentful Paint

---

## 🔍 Funções Úteis do Apps Script

### `getStats()`
Execute para ver estatísticas rápidas no log:
- Total de registros
- Total de colunas
- Primeira e última entrada

### `setupSheet()`
Cria ou reconfigura a planilha de tracking com todos os cabeçalhos

### `createDashboardSheet()`
Cria uma aba com métricas resumidas e fórmulas automáticas

---

## 🔒 Privacidade e LGPD

Todos os dados coletados são:
- Anônimos (não coletamos informações pessoalmente identificáveis)
- Armazenados apenas na sua conta do Google Sheets
- Usados exclusivamente para análise de uso do dashboard
- Respeita a configuração "Do Not Track" do navegador
- Compatível com as diretrizes da LGPD

Campos que respeitam privacidade:
- `doNotTrack`: Indica se o usuário solicitou não ser rastreado
- Nenhum endereço IP é coletado
- Nenhum dado pessoal é coletado

---

## 📈 Análises Possíveis

Com estes dados você pode analisar:

1. **Performance**
   - Tempo de carregamento por dispositivo/navegador
   - Gargalos de performance (DNS, TCP, server response)
   - First Paint e First Contentful Paint

2. **Dispositivos**
   - Distribuição mobile vs desktop vs tablet
   - Resoluções de tela mais comuns
   - Capacidades do navegador (WebGL, Service Workers, etc.)

3. **Comportamento**
   - Páginas mais visitadas
   - Duração das sessões
   - Páginas por sessão

4. **Marketing**
   - Fontes de tráfego (UTM parameters)
   - Campanhas mais efetivas
   - Canais de aquisição

5. **Experiência do Usuário**
   - Preferências de tema (dark/light mode)
   - Preferências de acessibilidade (reduced motion, high contrast)
   - Qualidade da conexão dos usuários

---

## 🐛 Troubleshooting

### Os dados não estão sendo enviados
- Verifique se a URL do TRACKING_URL está correta
- Abra o Console do navegador e procure por erros
- Verifique se o DEBUG está como `true` na linha 20 do index.html

### Erro de permissão no Apps Script
- Reautorize o script seguindo o Passo 3
- Verifique se "Quem tem acesso" está configurado como "Qualquer pessoa"

### Colunas faltando na planilha
- Execute a função `setupSheet()` novamente
- Verifique se o SPREADSHEET_ID está correto

### Dados não aparecem na planilha
- Verifique os logs do Apps Script: Ver → Logs
- Teste a função `doGet()` para verificar se o script está funcionando

---

## 📞 Suporte

Para mais informações sobre o sistema de tracking:
- Consulte o código em `dashboard/index.html` (linhas 17-142)
- Consulte o código em `dashboard/google-apps-script-tracking.gs`

---

## 🔄 Atualizações

**Última atualização**: 2026-01-03
**Versão**: 2.1 (Sistema expandido com 85 campos)
**Campos totais**: 85 (anteriormente 30)
**Novas categorias**: Performance detalhada, preferências do usuário, marketing (UTM), hardware adicional, returning visitors
