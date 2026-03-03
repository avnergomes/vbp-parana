# VBP Paraná — Valor Bruto da Produção Agropecuária

Dashboard interativo do Valor Bruto da Produção Agropecuária do Paraná, cobrindo o período de 2012 a 2024. Permite explorar a evolução do VBP por cadeia produtiva, regional IDR e município.

**🔗 [Acessar dashboard](https://avnergomes.github.io/vbp-parana/)**

Parte do ecossistema **[Datageo Paraná](https://datageoparana.github.io)**.

## Sobre

O Valor Bruto da Produção Agropecuária (VBP) é um dos principais indicadores da agropecuária paranaense, estimando a receita bruta gerada por lavouras e pecuária no estado. Este dashboard transforma os dados tabulares da SEAB/IDR-Paraná em visualizações interativas, facilitando a análise temporal e espacial da produção agropecuária.

A ferramenta permite filtrar por período (2012–2024), por cadeia produtiva e por regional IDR, exibindo KPIs de VBP total, produção e área cultivada. O mapa coroplético de municípios e os gráficos de ranking, sunburst e radar complementam a análise com diferentes perspectivas sobre os dados.

Os dados brutos são fornecidos em arquivos Excel (VBP2012.xlsx a vbp2024.xlsx) e processados automaticamente por um pipeline Python antes de serem publicados no dashboard.

## Fonte de Dados

- **SEAB/IDR-Paraná** — Secretaria da Agricultura e do Abastecimento do Paraná / Instituto de Desenvolvimento Rural do Paraná
- Período: 2012–2024
- Arquivos brutos: planilhas Excel anuais em `/data/`

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Gráficos | Recharts, D3.js |
| Mapas | Leaflet, React-Leaflet |
| Pipeline | Python (Pandas) |
| Deploy | GitHub Pages via GitHub Actions |
| Tracking | LGPD-compliant (19 métricas anônimas) |

## Estrutura do Projeto

```
vbp-parana/
├── dashboard/          # Aplicação React
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/ # 15 componentes
│   │   └── hooks/      # useData.js
│   ├── public/
│   │   └── data/       # JSONs processados
│   └── index.html
├── scripts/            # Pipeline de dados (Python)
│   └── preprocess_data.py
├── data/               # Dados brutos (Excel VBP2012–VBP2024)
├── .github/workflows/  # CI/CD
│   ├── data-pipeline.yml
│   └── deploy.yml
└── README.md
```

## Funcionalidades

- Filtros por período, cadeia produtiva e regional IDR
- Mapa coroplético interativo de municípios paranaenses
- Gráficos de evolução temporal do VBP
- Ranking dos municípios por produção
- Sunburst por cadeia produtiva
- Radar dos top municípios produtores
- KPIs de VBP total, produção total e área cultivada
- Tracking LGPD-compliant com variável de ambiente `VITE_TRACKING_URL`

## Desenvolvimento Local

```bash
# Clone
git clone https://github.com/avnergomes/vbp-parana.git
cd vbp-parana/dashboard

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Pipeline de Dados

O script `scripts/preprocess_data.py` lê os arquivos Excel anuais em `/data/`, consolida e agrega os dados via Pandas e gera os JSONs em `dashboard/public/data/` (`aggregated.json`, `detailed.json`, `geo_map.json`, `produto_map.json`). O workflow `data-pipeline.yml` executa esse processamento automaticamente no GitHub Actions, e o `deploy.yml` realiza o build da aplicação React e a publicação no GitHub Pages.

## Licença

Dados públicos. Dashboard desenvolvido por [Avner Gomes](https://avnergomes.github.io/portfolio/).
