import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(
    page_title="VBP Paraná",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for enhanced visual design
st.markdown("""
<style>
    /* Main theme colors */
    :root {
        --primary-color: #2E7D32;
        --secondary-color: #66BB6A;
        --accent-color: #FFA726;
        --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    /* Main title styling */
    h1 {
        background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700 !important;
        padding: 1rem 0;
        font-size: 2.5rem !important;
    }

    /* Subheader styling */
    h2, h3 {
        color: #2E7D32;
        font-weight: 600 !important;
        margin-top: 2rem !important;
        margin-bottom: 1rem !important;
        padding-bottom: 0.5rem;
        border-bottom: 3px solid #66BB6A;
    }

    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    }

    [data-testid="stSidebar"] > div:first-child {
        background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    }

    /* Sidebar header */
    [data-testid="stSidebar"] h2 {
        background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 600 !important;
        border-bottom: 2px solid #66BB6A;
        padding-bottom: 0.5rem;
    }

    /* Metric container styling */
    [data-testid="stMetric"] {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #2E7D32;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    [data-testid="stMetric"]:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    [data-testid="stMetric"] label {
        color: #2E7D32 !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
    }

    [data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: #1B5E20 !important;
        font-size: 2rem !important;
        font-weight: 700 !important;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: #f8f9fa;
        padding: 0.5rem;
        border-radius: 10px;
    }

    .stTabs [data-baseweb="tab"] {
        height: 50px;
        background-color: white;
        border-radius: 8px;
        color: #2E7D32;
        font-weight: 600;
        padding: 0 24px;
        border: 2px solid transparent;
        transition: all 0.3s;
    }

    .stTabs [data-baseweb="tab"]:hover {
        background-color: #e8f5e9;
        border-color: #66BB6A;
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%) !important;
        color: white !important;
        border-color: #2E7D32 !important;
    }

    /* Expander styling */
    .streamlit-expanderHeader {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;
        border-left: 4px solid #FFA726;
        font-weight: 600;
        color: #2E7D32;
    }

    .streamlit-expanderHeader:hover {
        background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
    }

    /* Button styling */
    .stButton > button {
        background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 2rem;
        font-weight: 600;
        transition: all 0.3s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    /* Selectbox and multiselect styling */
    .stSelectbox [data-baseweb="select"] > div,
    .stMultiSelect [data-baseweb="select"] > div {
        border-radius: 8px;
        border-color: #66BB6A;
    }

    /* Slider styling */
    .stSlider > div > div > div {
        background: linear-gradient(90deg, #2E7D32 0%, #66BB6A 100%);
    }

    /* Dataframe styling */
    [data-testid="stDataFrame"] {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Chart container */
    .js-plotly-plot {
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background: white;
        padding: 1rem;
    }

    /* Info/warning boxes */
    .stAlert {
        border-radius: 8px;
        border-left: 4px solid #FFA726;
    }

    /* Section divider */
    .section-divider {
        height: 3px;
        background: linear-gradient(90deg, #2E7D32 0%, #66BB6A 50%, transparent 100%);
        margin: 2rem 0;
        border-radius: 2px;
    }

    /* Caption styling */
    .stCaptionContainer {
        color: #666;
        font-style: italic;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 3px solid #66BB6A;
        margin-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

st.title("📊 VBP Paraná — Inteligência Territorial da Produção")

# Introduction section
st.markdown("""
<div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            padding: 1.5rem;
            border-radius: 12px;
            border-left: 6px solid #2E7D32;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h3 style="color: #1B5E20; margin-top: 0; font-size: 1.3rem;">
        🌱 Bem-vindo ao Sistema de Inteligência Territorial da Produção
    </h3>
    <p style="color: #2E7D32; font-size: 1rem; line-height: 1.6; margin-bottom: 0;">
        Esta plataforma oferece análises detalhadas do <b>Valor Bruto da Produção (VBP)</b> do estado do Paraná,
        permitindo explorar dados por município, regional, cadeia produtiva e produto.
        Utilize os filtros na barra lateral para personalizar sua análise e descobrir insights territoriais.
    </p>
</div>
""", unsafe_allow_html=True)

DATA_DIR = Path("data")
MAP_FILE = Path("mun_PR.json")
PRODUCT_LIST_FILE = DATA_DIR / "lista_produtos_vbp_2012_2024.xlsx"
REFERENCE_FILES = {"municipios_pr.xlsx", PRODUCT_LIST_FILE.name}

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Observabilidade de arquivos de dados
# ---------------------------------------------------------------------------


def build_data_manifest() -> List[Tuple[str, int, int]]:
    """Lista arquivos de dados com metadados para controle de cache."""

    manifest: List[Tuple[str, int, int]] = []
    for path in sorted(DATA_DIR.glob("*.xls*")):
        if path.name.lower() in {name.lower() for name in REFERENCE_FILES}:
            continue
        stat = path.stat()
        manifest.append((path.name, int(stat.st_mtime_ns), stat.st_size))
    return manifest


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def normalize_column(name: str) -> str:
    """Padroniza nomes de colunas removendo acentos e caracteres especiais."""
    text = unicodedata.normalize("NFKD", str(name))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[\-/]", " ", text)
    text = re.sub(r"[^0-9a-zA-Z ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text.replace(" ", "_")


def normalize_text(value: str) -> str:
    """Normaliza textos para permitir comparações mais robustas."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^0-9a-zA-Z ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\b(\d+)[ao]\b", r"\1", text)
    return text.strip().lower()


def coerce_year(series: pd.Series) -> pd.Series:
    """Converte diferentes formatos de ano/safra em inteiros de quatro dígitos."""
    numeric = pd.to_numeric(series, errors="coerce")
    if not numeric.isna().all():
        year = numeric.copy()
        mask = year > 2100
        year.loc[mask] = 2000 + (year.loc[mask] % 100)
    else:
        extracted = series.astype(str).str.extract(r"(\d{4})")[0]
        year = pd.to_numeric(extracted, errors="coerce")
    low_mask = year < 1900
    year.loc[low_mask] = 2000 + (year.loc[low_mask] % 100)
    return year.astype("Int64")


def format_currency(value: float) -> str:
    return _format_compact_value(value, currency=True)


def format_number(value: float) -> str:
    return _format_compact_value(value)


def _format_compact_value(value: float, *, currency: bool = False) -> str:
    if pd.isna(value):
        return "-"

    sign = "-" if value < 0 else ""
    abs_value = abs(value)
    thresholds = [
        (1_000_000_000_000, " tri"),
        (1_000_000_000, " bi"),
        (1_000_000, " mi"),
        (1_000, " mil"),
    ]

    for threshold, suffix in thresholds:
        if abs_value >= threshold:
            scaled = abs_value / threshold
            formatted = f"{scaled:.1f}".rstrip("0").rstrip(".")
            formatted = formatted.replace(".", ",")
            prefix = "R$ " if currency else ""
            return f"{sign}{prefix}{formatted}{suffix}"

    formatted = f"{abs_value:,.0f}".replace(",", ".")
    prefix = "R$ " if currency else ""
    return f"{sign}{prefix}{formatted}"


def sort_unique(values: Any) -> List[Any]:
    """Retorna valores únicos ordenados tratando nulos e tipos heterogêneos."""

    if isinstance(values, pd.Series):
        clean = values.dropna()
    else:
        clean = pd.Series(values).dropna()

    if clean.empty:
        return []

    uniques = pd.unique(clean)
    return sorted(uniques, key=lambda item: str(item).casefold())


COLUMN_ALIASES: Dict[str, str] = {
    "ano": "ano",
    "safra": "safra",
    "municipio": "municipio",
    "municipios": "municipio",
    "municipio_ibge": "municipio",
    "municipio_nome": "municipio",
    "nr": "regional_idr",
    "nr_seab": "regional_idr",
    "nrseab": "regional_idr",
    "nr_seab_": "regional_idr",
    "nr_idr": "regional_idr",
    "regiao": "regional_idr",
    "regional": "regional_idr",
    "cultura": "produto",
    "produto": "produto",
    "produto_agregado": "produto",
    "unidade": "unidade",
    "area": "area",
    "area_ha": "area",
    "area_(ha)": "area",
    "area_colhida": "area",
    "producao": "producao",
    "quantidade": "producao",
    "abate": "abate",
    "abate_comercializacao": "abate",
    "abate_comercializacao_": "abate",
    "valor": "valor",
    "valor_rs": "valor",
    "valor_r": "valor",
    "valor_r$": "valor",
    "valor_reais": "valor",
    "vbp": "valor",
}


MUNICIPIO_ALIASES: Dict[str, str] = {
    normalize_text("Santa Terezinha do Itaipu"): normalize_text(
        "Santa Terezinha de Itaipu"
    ),
    normalize_text("Itapejara do Oeste"): normalize_text("Itapejara d'Oeste"),
    normalize_text("Rancho Alegre do Oeste"): normalize_text("Rancho Alegre d'Oeste"),
    normalize_text("Sao Jorge do Oeste"): normalize_text("São Jorge d'Oeste"),
    normalize_text("Saudades do Iguacu"): normalize_text("Saudade do Iguaçu"),
    normalize_text("Perola do Oeste"): normalize_text("Pérola d'Oeste"),
    normalize_text("Santa Izabel do Ivai"): normalize_text("Santa Isabel do Ivaí"),
    normalize_text("Arapuan"): normalize_text("Arapuã"),
    normalize_text("Santa Cruz do Monte Castelo"): normalize_text(
        "Santa Cruz de Monte Castelo"
    ),
}


PRODUCT_ALIASES: Dict[str, str] = {
    normalize_text("Alho Porro"): normalize_text("Alho Poro"),
    normalize_text("Arroz de Sequeiro"): normalize_text("Arroz Sequeiro"),
    normalize_text("Brocolos"): normalize_text("Brócolis"),
    normalize_text("Caranguejo"): normalize_text("Carangueijo"),
    normalize_text("Milho Safra Normal"): normalize_text("Milho 1 Safra"),
    normalize_text("Milho Safrinha"): normalize_text("Milho 2 Safra"),
    normalize_text("Soja Safra Normal"): normalize_text("Soja 1 Safra"),
    normalize_text("Soja Safrinha"): normalize_text("Soja 2 Safra"),
    normalize_text("Amendoim Safra das Aguas"): normalize_text("Amendoim 1 Safra"),
}


PRODUCT_SUPPLEMENTS: List[Dict[str, str]] = [
    {
        "produto_norm": normalize_text("Algodão (Pluma)"),
        "produto_conciso": "ALGODÃO (PLUMA)",
        "cadeia": "ALGODÃO",
        "subcadeia": "ALGODÃO",
    },
    {
        "produto_norm": normalize_text("Amendoim 1 Safra"),
        "produto_conciso": "AMENDOIM (1ª SAFRA)",
        "cadeia": "GRÃOS",
        "subcadeia": "AMENDOIM",
    },
    {
        "produto_norm": normalize_text("Batata da Seca"),
        "produto_conciso": "BATATA DA SECA",
        "cadeia": "OLERICULTURA",
        "subcadeia": "TUBERCULOS",
    },
    {
        "produto_norm": normalize_text("Batata das Aguas"),
        "produto_conciso": "BATATA DAS ÁGUAS",
        "cadeia": "OLERICULTURA",
        "subcadeia": "TUBERCULOS",
    },
    {
        "produto_norm": normalize_text("Feijao Safra das Aguas"),
        "produto_conciso": "FEIJÃO SAFRA DAS ÁGUAS",
        "cadeia": "GRÃOS",
        "subcadeia": "FEIJÃO",
    },
    {
        "produto_norm": normalize_text("Feijao Safra da Seca"),
        "produto_conciso": "FEIJÃO SAFRA DA SECA",
        "cadeia": "GRÃOS",
        "subcadeia": "FEIJÃO",
    },
    {
        "produto_norm": normalize_text("Feijao Safra de Inverno"),
        "produto_conciso": "FEIJÃO SAFRA DE INVERNO",
        "cadeia": "GRÃOS",
        "subcadeia": "FEIJÃO",
    },
    {
        "produto_norm": normalize_text("Aveia Preta"),
        "produto_conciso": "AVEIA PRETA (GRÃO)",
        "cadeia": "GRÃOS",
        "subcadeia": "MALTES",
    },
    {
        "produto_norm": normalize_text("Mandioca Industria Consumo Animal"),
        "produto_conciso": "MANDIOCA INDÚSTRIA/CONSUMO ANIMAL",
        "cadeia": "OLERICULTURA",
        "subcadeia": "TUBERCULOS",
    },
    {
        "produto_norm": normalize_text("Mata Nativa"),
        "produto_conciso": "MATA NATIVA",
        "cadeia": "FLORESTAL",
        "subcadeia": "FLORESTA NATIVA",
    },
    {
        "produto_norm": normalize_text("Sorgo"),
        "produto_conciso": "SORGO (GRANÍFERO)",
        "cadeia": "GRÃOS",
        "subcadeia": "MALTES",
    },
]


# ---------------------------------------------------------------------------
# Carregamento de dados (cacheado)
# ---------------------------------------------------------------------------


@st.cache_data(show_spinner="Carregando catálogos auxiliares...")
def load_reference_tables() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    municipios = pd.read_excel(DATA_DIR / "municipios_pr.xlsx")
    municipios = municipios.rename(
        columns={
            "Municipio": "municipio_oficial",
            "CodIbge": "cod_ibge",
            "RegIdr": "regional_idr",
            "CRegIdr": "regional_codigo",
            "MesoIdr": "meso_idr",
        }
    )
    municipios["cod_ibge"] = municipios["cod_ibge"].astype(str).str.zfill(7)
    municipios["municipio_norm"] = municipios["municipio_oficial"].apply(normalize_text)
    municipios = municipios[
        [
            "municipio_norm",
            "municipio_oficial",
            "cod_ibge",
            "regional_idr",
            "regional_codigo",
            "meso_idr",
        ]
    ]

    produtos_raw = pd.read_excel(PRODUCT_LIST_FILE, sheet_name="Produtos")
    produtos_raw = produtos_raw.rename(
        columns={
            "PRODUTO": "produto_conciso",
            "Cadeia": "cadeia",
            "Subcadeia": "subcadeia",
        }
    )
    produtos_raw["produto_norm"] = produtos_raw["produto_conciso"].apply(normalize_text)
    produto_catalogo = produtos_raw[["produto_norm", "produto_conciso", "cadeia", "subcadeia"]]
    produto_catalogo = produto_catalogo.dropna(subset=["produto_norm"])

    suplementos_df = pd.DataFrame(PRODUCT_SUPPLEMENTS)
    if not suplementos_df.empty:
        suplementos_df["produto_norm"] = suplementos_df["produto_norm"].apply(normalize_text)
        produto_catalogo = pd.concat([produto_catalogo, suplementos_df], ignore_index=True)

    if PRODUCT_ALIASES:
        produto_catalogo["produto_norm"] = produto_catalogo["produto_norm"].replace(
            PRODUCT_ALIASES
        )

    produto_catalogo[["cadeia", "subcadeia"]] = produto_catalogo[
        ["cadeia", "subcadeia"]
    ].fillna("Não classificado")

    produto_catalogo = produto_catalogo.sort_values(["produto_norm", "produto_conciso"])
    produto_catalogo = produto_catalogo.drop_duplicates("produto_norm", keep="first")

    produto_correcoes = pd.read_excel(
        PRODUCT_LIST_FILE,
        sheet_name="Correcao_produtos",
        header=None,
        names=["produto_original", "produto_corrigido"],
    )
    produto_correcoes = produto_correcoes.dropna(subset=["produto_original", "produto_corrigido"])
    produto_correcoes["produto_norm_original"] = produto_correcoes["produto_original"].apply(
        normalize_text
    )
    produto_correcoes["produto_norm_corrigido"] = produto_correcoes[
        "produto_corrigido"
    ].apply(normalize_text)

    return municipios, produto_catalogo, produto_correcoes


def rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    renamed = {}
    for col in df.columns:
        norm = normalize_column(col)
        target = COLUMN_ALIASES.get(norm)
        if target:
            renamed[col] = target
    if renamed:
        df = df.rename(columns=renamed)
    return df


def enrich_with_catalogues(
    df: pd.DataFrame,
    municipios: pd.DataFrame,
    produto_catalogo: pd.DataFrame,
    produto_correcoes: pd.DataFrame,
) -> Tuple[pd.DataFrame, List[str], List[str]]:
    municipio_lookup = municipios.set_index("municipio_norm")[
        "municipio_oficial"
    ]
    df["municipio_norm"] = df["municipio"].apply(normalize_text)
    if MUNICIPIO_ALIASES:
        df["municipio_norm"] = df["municipio_norm"].replace(MUNICIPIO_ALIASES)
        alias_targets = set(MUNICIPIO_ALIASES.values())
        alias_mask = df["municipio_norm"].isin(alias_targets)
        df.loc[alias_mask, "municipio"] = df.loc[alias_mask, "municipio_norm"].map(
            municipio_lookup
        ).fillna(df.loc[alias_mask, "municipio"])

    df["produto_norm_raw"] = df["produto"].apply(normalize_text)
    if PRODUCT_ALIASES:
        df["produto_norm_raw"] = df["produto_norm_raw"].replace(PRODUCT_ALIASES)

    if not produto_correcoes.empty:
        correction_map = dict(
            zip(
                produto_correcoes["produto_norm_original"],
                produto_correcoes["produto_corrigido"],
            )
        )
        df["produto_corrigido"] = df["produto_norm_raw"].map(correction_map).fillna(
            df["produto"]
        )
    else:
        df["produto_corrigido"] = df["produto"]

    df["produto_norm"] = df["produto_corrigido"].apply(normalize_text)

    merged = df.merge(municipios, on="municipio_norm", how="left")

    merged = merged.merge(produto_catalogo, on="produto_norm", how="left")

    merged["produto"] = merged.get("produto_corrigido", merged.get("produto"))
    merged["produto_conciso"] = merged["produto_conciso"].fillna(
        merged["produto_corrigido"]
    )
    merged["cadeia"] = merged["cadeia"].fillna("Não classificado")
    merged["subcadeia"] = merged["subcadeia"].fillna("Não classificado")

    missing_municipios = (
        merged.loc[merged["cod_ibge"].isna(), "municipio"]
        .dropna()
        .sort_values()
        .unique()
        .tolist()
    )
    missing_produtos = (
        merged.loc[merged["cadeia"] == "Não classificado", "produto_corrigido"]
        .dropna()
        .sort_values()
        .unique()
        .tolist()
    )

    return merged, missing_municipios, missing_produtos


def read_single_file(
    path: Path,
    municipios: pd.DataFrame,
    produto_catalogo: pd.DataFrame,
    produto_correcoes: pd.DataFrame,
) -> Tuple[pd.DataFrame, List[str], List[str]]:
    raw = pd.read_excel(path)
    df = raw.copy()
    df.columns = [normalize_column(col) for col in df.columns]
    df = rename_columns(df)

    if "ano" not in df.columns:
        if "safra" in df.columns:
            df["ano"] = coerce_year(df["safra"])
        else:
            return pd.DataFrame(), [], []
    else:
        df["ano"] = coerce_year(df["ano"])

    df = df[df["ano"].notna()]
    if df.empty or "municipio" not in df.columns:
        return pd.DataFrame(), [], []

    df["municipio"] = df["municipio"].astype(str).str.strip()

    if "produto" not in df.columns:
        return pd.DataFrame(), [], []

    if "unidade" not in df.columns:
        df["unidade"] = ""
    df["unidade"] = df["unidade"].astype(str).str.upper()

    for col in ["valor", "area", "producao", "abate"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            df[col] = float("nan")

    if "regional_idr" in df.columns:
        df["regional_idr_origem"] = df["regional_idr"]
    else:
        df["regional_idr_origem"] = pd.Series([pd.NA] * len(df), dtype="string")

    enriched, missing_municipios, missing_produtos = enrich_with_catalogues(
        df, municipios, produto_catalogo, produto_correcoes
    )
    enriched["origem"] = path.name

    keep_columns = [
        "ano",
        "municipio",
        "municipio_oficial",
        "cod_ibge",
        "regional_codigo",
        "regional_idr",
        "meso_idr",
        "produto",
        "produto_conciso",
        "cadeia",
        "subcadeia",
        "unidade",
        "area",
        "producao",
        "abate",
        "valor",
        "origem",
    ]
    for col in keep_columns:
        if col not in enriched.columns:
            enriched[col] = pd.NA

    result = enriched[keep_columns].copy()
    result["municipio_oficial"] = result["municipio_oficial"].fillna(
        result["municipio"]
    )
    result["regional_idr"] = result["regional_idr"].combine_first(
        df.get("regional_idr_origem")
    )

    return result, missing_municipios, missing_produtos


@st.cache_data(show_spinner="Processando base histórica do VBP...")
def load_vbp_data(
    manifest: List[Tuple[str, int, int]]
) -> Tuple[pd.DataFrame, Dict[str, List[str]]]:
    municipios, produto_catalogo, produto_correcoes = load_reference_tables()

    frames: List[pd.DataFrame] = []
    missing_municipios: set[str] = set()
    missing_produtos: set[str] = set()

    for file_name, _, _ in manifest:
        path = DATA_DIR / file_name
        if not path.exists():
            continue

        df, miss_mun, miss_prod = read_single_file(
            path, municipios, produto_catalogo, produto_correcoes
        )
        if df.empty:
            continue
        frames.append(df)
        missing_municipios.update(miss_mun)
        missing_produtos.update(miss_prod)

    if not frames:
        return pd.DataFrame(), {"municipios": [], "produtos": []}

    data = pd.concat(frames, ignore_index=True)
    data = data.drop_duplicates()
    data["ano"] = data["ano"].astype(int)
    data["cod_ibge"] = data["cod_ibge"].where(data["cod_ibge"].notna())
    data.loc[data["cod_ibge"].notna(), "cod_ibge"] = (
        data.loc[data["cod_ibge"].notna(), "cod_ibge"].astype(str).str.zfill(7)
    )

    diagnostics = {
        "municipios": sorted(missing_municipios),
        "produtos": sorted(missing_produtos),
    }
    return data, diagnostics


@st.cache_data(show_spinner="Carregando malha territorial...")
def load_geojson() -> Dict:
    with MAP_FILE.open("r", encoding="utf-8") as fp:
        return json.load(fp)


# ---------------------------------------------------------------------------
# Carrega e valida dados
# ---------------------------------------------------------------------------

manifest = build_data_manifest()
data, diagnostics = load_vbp_data(manifest)
if data.empty:
    st.error("Nenhum arquivo válido encontrado na pasta data/.")
    st.stop()

anos_disponiveis = sort_unique(data["ano"])
min_year, max_year = int(min(anos_disponiveis)), int(max(anos_disponiveis))

st.sidebar.header("🎯 Filtros analíticos")
year_range = st.sidebar.slider(
    "Período (ano)",
    min_value=min_year,
    max_value=max_year,
    value=(min_year, max_year),
)

mesos = sort_unique(data["meso_idr"])
regional_options = sort_unique(data["regional_idr"])
cadeias = sort_unique(data["cadeia"])
subcadeias = sort_unique(data["subcadeia"])
produtos = sort_unique(data["produto_conciso"])
municipios_options = sort_unique(data["municipio_oficial"])

selected_mesos = st.sidebar.multiselect(
    "Mesorregião IDR",
    options=mesos,
    default=mesos,
)

selected_regionais = st.sidebar.multiselect(
    "Regional IDR",
    options=regional_options,
    default=regional_options,
)

selected_municipios = st.sidebar.multiselect(
    "Município",
    options=municipios_options,
    default=municipios_options,
)

selected_cadeias = st.sidebar.multiselect(
    "Cadeia produtiva",
    options=cadeias,
    default=cadeias,
)

filtered_subcadeias = (
    sort_unique(data[data["cadeia"].isin(selected_cadeias)]["subcadeia"])
    if selected_cadeias
    else subcadeias
)
selected_subcadeias = st.sidebar.multiselect(
    "Subcadeia",
    options=filtered_subcadeias,
    default=filtered_subcadeias,
)

if selected_subcadeias:
    produto_base = data[data["subcadeia"].isin(selected_subcadeias)]
elif selected_cadeias:
    produto_base = data[data["cadeia"].isin(selected_cadeias)]
else:
    produto_base = data

filtered_produtos = sort_unique(produto_base["produto_conciso"])
selected_produtos = st.sidebar.multiselect(
    "Produto",
    options=filtered_produtos,
    default=filtered_produtos,
)

metric_map = {
    "valor": "Valor bruto da produção (R$)",
    "producao": "Quantidade produzida",
    "area": "Área cultivada (ha)",
}
map_metric = st.sidebar.selectbox(
    "Métrica para mapa",
    options=list(metric_map.keys()),
    format_func=lambda key: metric_map[key],
)


mask = (data["ano"].between(year_range[0], year_range[1]))
if selected_mesos:
    mask &= data["meso_idr"].isin(selected_mesos)
if selected_regionais:
    mask &= data["regional_idr"].isin(selected_regionais)
if selected_municipios:
    mask &= data["municipio_oficial"].isin(selected_municipios)
if selected_cadeias:
    mask &= data["cadeia"].isin(selected_cadeias)
if selected_subcadeias:
    mask &= data["subcadeia"].isin(selected_subcadeias)
if selected_produtos:
    mask &= data["produto_conciso"].isin(selected_produtos)

filtered_df = data[mask].copy()

if filtered_df.empty:
    st.warning("Nenhum dado encontrado para os filtros selecionados.")
    st.stop()


# Diagnósticos de cobertura
with st.expander("ℹ️ Diagnósticos de cobertura", expanded=False):
    if diagnostics["municipios"]:
        st.markdown(
            "**Municípios sem correspondência no mapa:** "
            + ", ".join(diagnostics["municipios"])
        )
    else:
        st.markdown("Todos os municípios foram vinculados ao mapa territorial.")

    if diagnostics["produtos"]:
        st.markdown(
            "**Produtos sem classificação (cadeia/subcadeia):** "
            + ", ".join(diagnostics["produtos"])
        )
    else:
        st.markdown("Todos os produtos foram classificados em cadeias e subcadeias.")


# ---------------------------------------------------------------------------
# Visão geral e métricas
# ---------------------------------------------------------------------------

st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)
with col1:
    total_valor = filtered_df["valor"].sum()
    st.metric("💰 Valor bruto da produção", format_currency(total_valor))
with col2:
    total_producao = filtered_df["producao"].sum()
    st.metric("📦 Produção total", format_number(total_producao))
with col3:
    total_area = filtered_df["area"].sum()
    st.metric("🌾 Área cultivada (ha)", format_number(total_area))

st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Visualizações em abas
# ---------------------------------------------------------------------------

tab_overview, tab_cadeias, tab_produtos, tab_mapa = st.tabs(
    ["📈 Visão Geral", "🔗 Cadeias Produtivas", "🏆 Produtos", "🗺️ Mapa Territorial"]
)

with tab_overview:
    st.subheader("📈 Evolução temporal das principais variáveis")
    time_series = (
        filtered_df.groupby("ano")[list(metric_map.keys())]
        .sum()
        .reset_index()
        .sort_values("ano")
    )
    time_series["valor_formatado"] = time_series["valor"].apply(format_currency)
    time_series["area_formatada"] = time_series["area"].apply(format_number)
    time_series["producao_formatada"] = time_series["producao"].apply(format_number)

    valor_fig = px.line(
        time_series,
        x="ano",
        y="valor",
        markers=True,
        title="💰 Valor bruto da produção (R$)",
        custom_data=["valor_formatado"],
    )
    valor_fig.update_layout(
        margin=dict(l=10, r=10, t=60, b=10),
        title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
        plot_bgcolor='rgba(248, 249, 250, 0.5)',
        paper_bgcolor='white',
        font=dict(family="Arial, sans-serif", size=12, color="#333"),
    )
    valor_fig.update_traces(
        hovertemplate="<b>Ano %{x}</b><br>Valor: %{customdata[0]}<extra></extra>",
        mode="lines+markers+text",
        text=time_series["valor_formatado"],
        textposition="top center",
        line=dict(color="#2E7D32", width=3),
        marker=dict(size=10, color="#66BB6A", line=dict(color="#2E7D32", width=2)),
        textfont=dict(size=10, color="#2E7D32", family="Arial, sans-serif"),
    )
    valor_fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
    valor_fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
    st.plotly_chart(valor_fig, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        area_fig = px.line(
            time_series,
            x="ano",
            y="area",
            markers=True,
            title="🌾 Área cultivada (ha)",
            custom_data=["area_formatada"],
        )
        area_fig.update_layout(
            margin=dict(l=10, r=10, t=60, b=10),
            title_font=dict(size=18, color="#2E7D32", family="Arial, sans-serif"),
            plot_bgcolor='rgba(248, 249, 250, 0.5)',
            paper_bgcolor='white',
            font=dict(family="Arial, sans-serif", size=12, color="#333"),
        )
        area_fig.update_traces(
            hovertemplate="<b>Ano %{x}</b><br>Área: %{customdata[0]}<extra></extra>",
            mode="lines+markers+text",
            text=time_series["area_formatada"],
            textposition="top center",
            line=dict(color="#8E24AA", width=3),
            marker=dict(size=10, color="#BA68C8", line=dict(color="#8E24AA", width=2)),
            textfont=dict(size=9, color="#8E24AA", family="Arial, sans-serif"),
        )
        area_fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
        area_fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
        st.plotly_chart(area_fig, use_container_width=True)

    with col_b:
        prod_fig = px.line(
            time_series,
            x="ano",
            y="producao",
            markers=True,
            title="📦 Quantidade produzida",
            custom_data=["producao_formatada"],
        )
        prod_fig.update_layout(
            margin=dict(l=10, r=10, t=60, b=10),
            title_font=dict(size=18, color="#2E7D32", family="Arial, sans-serif"),
            plot_bgcolor='rgba(248, 249, 250, 0.5)',
            paper_bgcolor='white',
            font=dict(family="Arial, sans-serif", size=12, color="#333"),
        )
        prod_fig.update_traces(
            hovertemplate="<b>Ano %{x}</b><br>Quantidade: %{customdata[0]}<extra></extra>",
            mode="lines+markers+text",
            text=time_series["producao_formatada"],
            textposition="top center",
            line=dict(color="#F57C00", width=3),
            marker=dict(size=10, color="#FFB74D", line=dict(color="#F57C00", width=2)),
            textfont=dict(size=9, color="#F57C00", family="Arial, sans-serif"),
        )
        prod_fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
        prod_fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
        st.plotly_chart(prod_fig, use_container_width=True)

    st.subheader("🔗 Participação das principais cadeias no período selecionado")
    cadeias_agg = (
        filtered_df.groupby("cadeia")["valor"].sum().reset_index().sort_values("valor", ascending=False)
    )
    cadeias_agg["valor_formatado"] = cadeias_agg["valor"].apply(format_currency)
    cadeias_fig = px.bar(
        cadeias_agg,
        x="cadeia",
        y="valor",
        title="💰 Valor bruto da produção por cadeia",
        custom_data=["valor_formatado"],
        text="valor_formatado",
        color="valor",
        color_continuous_scale=["#81C784", "#66BB6A", "#4CAF50", "#43A047", "#2E7D32"],
    )
    cadeias_fig.update_layout(
        xaxis_title="Cadeia",
        yaxis_title="Valor (R$)",
        margin=dict(l=10, r=10, t=60, b=10),
        title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
        plot_bgcolor='rgba(248, 249, 250, 0.5)',
        paper_bgcolor='white',
        font=dict(family="Arial, sans-serif", size=12, color="#333"),
        showlegend=False,
    )
    cadeias_fig.update_traces(
        textposition="outside",
        hovertemplate="<b>%{x}</b><br>Valor: %{customdata[0]}<extra></extra>",
        marker=dict(line=dict(color="#2E7D32", width=1)),
        textfont=dict(size=11, color="#2E7D32", family="Arial, sans-serif"),
    )
    cadeias_fig.update_xaxes(showgrid=False)
    cadeias_fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
    st.plotly_chart(cadeias_fig, use_container_width=True)


with tab_cadeias:
    st.subheader("🌳 Hierarquia de cadeias e subcadeias")
    hierarchy = (
        filtered_df.groupby(["cadeia", "subcadeia", "produto_conciso"])["valor"].sum().reset_index()
    )
    hierarchy["valor_formatado"] = hierarchy["valor"].apply(format_currency)
    sunburst_fig = px.sunburst(
        hierarchy,
        path=["cadeia", "subcadeia", "produto_conciso"],
        values="valor",
        color="cadeia",
        title="🎯 Distribuição de valor por cadeia, subcadeia e produto",
        custom_data=["valor_formatado"],
        color_discrete_sequence=px.colors.qualitative.Set3,
    )
    sunburst_fig.update_layout(
        margin=dict(l=0, r=0, t=60, b=0),
        title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
        paper_bgcolor='white',
        font=dict(family="Arial, sans-serif", size=12, color="#333"),
    )
    sunburst_fig.update_traces(
        hovertemplate="<b>%{label}</b><br>Valor: %{customdata[0]}<extra></extra>",
        marker=dict(line=dict(color='white', width=2)),
    )
    st.plotly_chart(sunburst_fig, use_container_width=True)

    st.subheader("📍 Cadeia por regional IDR")
    cadeia_regional = (
        filtered_df.groupby(["regional_idr", "cadeia"])["valor"].sum().reset_index()
    )
    cadeia_regional = cadeia_regional.sort_values("valor", ascending=False)
    cadeia_regional["valor_formatado"] = cadeia_regional["valor"].apply(format_currency)
    cadeia_region_fig = px.bar(
        cadeia_regional,
        x="regional_idr",
        y="valor",
        color="cadeia",
        title="📊 Distribuição do valor por cadeia e regional",
        custom_data=["valor_formatado"],
        text="valor_formatado",
        color_discrete_sequence=px.colors.qualitative.Set2,
    )
    cadeia_region_fig.update_layout(
        xaxis_title="Regional IDR",
        yaxis_title="Valor (R$)",
        margin=dict(l=10, r=10, t=60, b=10),
        legend_title="Cadeia",
        barmode="stack",
        title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
        plot_bgcolor='rgba(248, 249, 250, 0.5)',
        paper_bgcolor='white',
        font=dict(family="Arial, sans-serif", size=12, color="#333"),
        legend=dict(
            bgcolor="rgba(255, 255, 255, 0.9)",
            bordercolor="#2E7D32",
            borderwidth=1
        ),
    )
    cadeia_region_fig.update_traces(
        textposition="inside",
        hovertemplate="<b>Regional: %{x}</b><br>Cadeia: %{fullData.name}<br>Valor: %{customdata[0]}<extra></extra>",
        textfont=dict(size=10, family="Arial, sans-serif"),
    )
    cadeia_region_fig.update_xaxes(showgrid=False)
    cadeia_region_fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
    st.plotly_chart(cadeia_region_fig, use_container_width=True)


with tab_produtos:
    st.subheader("🏆 Produtos líderes por regional")
    prod_regional = (
        filtered_df.groupby(["regional_idr", "produto_conciso"])["valor"].sum().reset_index()
    )
    top_prod = (
        prod_regional.sort_values("valor", ascending=False).groupby("regional_idr").head(5)
    )
    top_prod["valor_formatado"] = top_prod["valor"].apply(format_currency)
    top_prod_fig = px.bar(
        top_prod,
        x="valor",
        y="produto_conciso",
        color="regional_idr",
        orientation="h",
        title="🥇 Top 5 produtos por regional (valor)",
        custom_data=["valor_formatado"],
        text="valor_formatado",
        color_discrete_sequence=px.colors.qualitative.Bold,
    )
    top_prod_fig.update_layout(
        xaxis_title="Valor (R$)",
        yaxis_title="Produto",
        margin=dict(l=10, r=10, t=60, b=10),
        legend_title="Regional IDR",
        title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
        plot_bgcolor='rgba(248, 249, 250, 0.5)',
        paper_bgcolor='white',
        font=dict(family="Arial, sans-serif", size=12, color="#333"),
        legend=dict(
            bgcolor="rgba(255, 255, 255, 0.9)",
            bordercolor="#2E7D32",
            borderwidth=1
        ),
        height=600,
    )
    top_prod_fig.update_traces(
        textposition="outside",
        hovertemplate="<b>Regional: %{fullData.name}</b><br>Produto: %{y}<br>Valor: %{customdata[0]}<extra></extra>",
        marker=dict(line=dict(color='white', width=1)),
        textfont=dict(size=10, family="Arial, sans-serif"),
    )
    top_prod_fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(200, 200, 200, 0.3)')
    top_prod_fig.update_yaxes(showgrid=False)
    st.plotly_chart(top_prod_fig, use_container_width=True)

    st.subheader("📋 Tabela analítica de produtos")
    produto_tabela = (
        filtered_df.groupby(["produto_conciso", "unidade"])
        .agg(
            valor_total=("valor", "sum"),
            quantidade_total=("producao", "sum"),
            area_total=("area", "sum"),
        )
        .reset_index()
        .sort_values("valor_total", ascending=False)
    )
    produto_tabela_display = produto_tabela.assign(
        valor=produto_tabela["valor_total"].apply(format_currency),
        quantidade=produto_tabela["quantidade_total"].apply(format_number),
        area=produto_tabela["area_total"].apply(format_number),
    )
    st.dataframe(
        produto_tabela_display[
            ["produto_conciso", "unidade", "valor", "quantidade", "area"]
        ],
        width="stretch",
        hide_index=True,
        column_config={
            "valor": st.column_config.Column("Valor (R$)"),
            "quantidade": st.column_config.Column("Quantidade"),
            "area": st.column_config.Column("Área (ha)"),
        },
    )


with tab_mapa:
    st.subheader("🗺️ Mapa temático por município")
    geojson = load_geojson()
    mapa_metrics = ["valor", "producao", "area"]
    mapa_base = (
        filtered_df.groupby(["cod_ibge", "municipio_oficial", "regional_idr"])[
            mapa_metrics
        ]
        .sum()
        .reset_index()
    )
    mapa_base = mapa_base[mapa_base[map_metric].notna()]
    mapa_base["valor_formatado"] = mapa_base["valor"].apply(format_currency)
    mapa_base["producao_formatada"] = mapa_base["producao"].apply(format_number)
    mapa_base["area_formatada"] = mapa_base["area"].apply(format_number)

    if mapa_base.empty:
        st.info("Sem dados para exibir no mapa com os filtros atuais.")
    else:
        color_title = metric_map[map_metric]
        mapa_fig = px.choropleth_mapbox(
            mapa_base,
            geojson=geojson,
            locations="cod_ibge",
            featureidkey="properties.CodIbge",
            color=map_metric,
            hover_data={
                "municipio_oficial": True,
                "regional_idr": True,
                "valor_formatado": True,
                "producao_formatada": True,
                "area_formatada": True,
                "valor": False,
                "producao": False,
                "area": False,
            },
            color_continuous_scale=["#81C784", "#66BB6A", "#4CAF50", "#388E3C", "#2E7D32", "#1B5E20"],
            mapbox_style="carto-positron",
            zoom=5.2,
            center={"lat": -24.7, "lon": -51.9},
            opacity=0.75,
            title=f"📍 {color_title} por município",
        )
        mapa_fig.update_layout(
            margin=dict(l=0, r=0, t=60, b=0),
            title_font=dict(size=20, color="#2E7D32", family="Arial, sans-serif"),
            font=dict(family="Arial, sans-serif", size=12, color="#333"),
            coloraxis_colorbar=dict(
                title=dict(font=dict(size=14, color="#2E7D32")),
                thickness=20,
                len=0.7,
                bgcolor="rgba(255, 255, 255, 0.8)",
                bordercolor="#2E7D32",
                borderwidth=2,
            ),
        )
        st.plotly_chart(mapa_fig, use_container_width=True)

    st.markdown("""
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #66BB6A;
                margin-top: 1rem;">
        <p style="color: #666; font-style: italic; margin: 0;">
            💡 <b>Dica:</b> Os valores apresentados correspondem ao somatório do período filtrado.
            Utilize os filtros para analisar um único ano ou intervalos personalizados.
        </p>
    </div>
    """, unsafe_allow_html=True)
