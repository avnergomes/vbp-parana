# VBP Paraná - Dashboard de Inteligência Territorial

Dashboard interativo para análise do **Valor Bruto da Produção Agropecuária** do estado do Paraná, Brasil (2012-2024).

![Dashboard Preview](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan) ![License](https://img.shields.io/badge/License-MIT-green)

## Visão Geral

Este dashboard permite explorar 13 anos de dados de produção agropecuária do Paraná, com visualizações interativas incluindo:

- **KPIs Principais**: Valor bruto, produção total e área cultivada
- **Evolução Temporal**: Séries históricas com múltiplas métricas
- **Análise por Cadeias**: Treemap, gráficos de pizza e barras
- **Ranking de Produtos**: Tabela ordenável com busca
- **Análise Regional**: Comparativo entre regionais IDR
- **Mapa Coroplético**: Visualização geográfica interativa

## Tecnologias

- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS (tema rural/natural customizado)
- **Gráficos**: Recharts
- **Mapas**: Leaflet + React-Leaflet
- **Ícones**: Lucide React

## Estrutura do Projeto

```
vbp-parana/
├── data/                      # Dados brutos (Excel)
│   ├── VBP2012.xlsx          # Dados VBP 2012
│   ├── ...                   # Anos 2013-2024
│   ├── lista_produtos_vbp_2012_2024.xlsx  # Catálogo de produtos
│   └── municipios_pr.xlsx    # Referência de municípios
├── dashboard/                 # Aplicação React
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/           # Utilitários
│   ├── public/data/         # JSONs processados
│   └── dist/                # Build de produção
├── scripts/
│   └── preprocess_data.py   # Script de processamento
├── mun_PR.json              # GeoJSON dos municípios
└── .github/workflows/       # CI/CD
```

## Instalação

### Pré-requisitos

- Node.js 18+
- Python 3.9+ (para preprocessamento)
- npm ou yarn

### Desenvolvimento Local

1. **Clone o repositório**
```bash
git clone https://github.com/avnergomes/vbp-parana.git
cd vbp-parana
```

2. **Processe os dados** (necessário apenas uma vez)
```bash
pip install pandas openpyxl
python scripts/preprocess_data.py
```

3. **Instale as dependências do dashboard**
```bash
cd dashboard
npm install
```

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

5. Acesse `http://localhost:5173/vbp-parana/`

### Build de Produção

```bash
cd dashboard
npm run build
```

Os arquivos serão gerados em `dashboard/dist/`.

## Deploy

O projeto usa GitHub Actions para deploy automático no GitHub Pages. Cada push na branch `main` dispara o workflow que:

1. Processa os dados Excel para JSON
2. Builda a aplicação React
3. Faz deploy no GitHub Pages

### Manual

Para deploy manual, após o build:

```bash
# Copie o conteúdo de dashboard/dist para seu servidor
```

## Dados

### Fontes

- **SEAB/IDR-Paraná**: Dados do Valor Bruto da Produção
- **IBGE**: Malhas municipais (GeoJSON)

### Cobertura

- **Período**: 2012 a 2024 (13 anos)
- **Municípios**: 399 municípios do Paraná
- **Produtos**: 200+ produtos agrícolas e pecuários
- **Cadeias**: 25 cadeias produtivas

### Estrutura dos Dados Processados

| Arquivo | Descrição | Tamanho |
|---------|-----------|---------|
| `aggregated.json` | Dados pré-agregados por dimensão | ~400 KB |
| `detailed.json` | Dados do mapa por ano/município | ~550 KB |
| `municipios.geojson` | Geometrias otimizadas | ~750 KB |
| `produto_map.json` | Hierarquia cadeia > subcadeia > produto | ~15 KB |
| `geo_map.json` | Hierarquia meso > regional > município | ~25 KB |

## Funcionalidades

### Filtros Interativos

- Período (ano inicial e final)
- Mesorregião IDR
- Regional IDR
- Município
- Cadeia produtiva
- Subcadeia
- Produto

### Visualizações

| Visualização | Descrição |
|--------------|-----------|
| KPIs | Cards com valor, produção e área |
| Série Temporal | Evolução de valor, produção e área |
| Cadeias (Barras) | Ranking de cadeias por valor |
| Cadeias (Treemap) | Hierarquia visual de produção |
| Cadeias (Pizza) | Distribuição percentual |
| Ranking Produtos | Tabela ordenável top N produtos |
| Ranking Municípios | Tabela ordenável top N municípios |
| Regional | Comparativo entre regionais |
| Evolução Empilhada | Área empilhada por cadeia |
| Variação Anual | Comparativo ano a ano |
| Mapa Coroplético | Valor/Produção/Área por município |

## Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Créditos

Desenvolvido com dados públicos do estado do Paraná, Brasil.

---

**VBP Paraná** - Inteligência Territorial da Produção Agropecuária
