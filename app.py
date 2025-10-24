import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import plotly.express as px
import streamlit as st

st.set_page_config(
    page_title="VBP Paraná",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📊 VBP Paraná — Inteligência Territorial da Produção")

DATA_DIR = Path("data")
MAP_FILE = Path("mun_PR.json")
PRODUCT_MAP_FILE = Path("mapa_produtos_completo.xlsx")
PRODUCT_STANDARD_FILE = Path("padronização produtos.xlsx")


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
    if pd.isna(value):
        return "-"
    return f"R$ {value:,.0f}".replace(",", ".")


def format_number(value: float) -> str:
    if pd.isna(value):
        return "-"
    if abs(value) >= 1_000_000:
        return f"{value/1_000_000:.1f} mi"
    if abs(value) >= 1_000:
        return f"{value/1_000:.1f} mil"
    return f"{value:,.0f}".replace(",", ".")


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


# ---------------------------------------------------------------------------
# Carregamento de dados (cacheado)
# ---------------------------------------------------------------------------


@st.cache_data(show_spinner="Carregando catálogos auxiliares...")
def load_reference_tables() -> Tuple[pd.DataFrame, pd.DataFrame]:
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

    produto_ref = pd.read_excel(PRODUCT_MAP_FILE)
    produto_ref = produto_ref.rename(
        columns={
            "Produto_Conciso": "produto_conciso",
            "Cadeia": "cadeia",
            "Subcadeia": "subcadeia",
        }
    )
    produto_ref["produto_norm"] = produto_ref["produto_norm"].apply(normalize_text)

    padron = pd.read_excel(PRODUCT_STANDARD_FILE)
    padron = padron.rename(
        columns={
            "PRODUTO": "produto_conciso",
            "Cadeia": "cadeia",
            "Subcadeia": "subcadeia",
        }
    )
    padron["produto_norm"] = padron["produto_conciso"].apply(normalize_text)
    padron = padron[["produto_norm", "produto_conciso", "cadeia", "subcadeia"]]

    produto_catalogo = pd.concat(
        [
            produto_ref[["produto_norm", "produto_conciso", "cadeia", "subcadeia"]],
            padron,
        ],
        ignore_index=True,
    )
    produto_catalogo = produto_catalogo.dropna(subset=["produto_norm"])
    produto_catalogo = produto_catalogo.sort_values("produto_conciso")
    produto_catalogo = produto_catalogo.drop_duplicates("produto_norm", keep="first")

    return municipios, produto_catalogo


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
) -> Tuple[pd.DataFrame, List[str], List[str]]:
    df["municipio_norm"] = df["municipio"].apply(normalize_text)
    merged = df.merge(municipios, on="municipio_norm", how="left")

    merged["produto_norm"] = merged["produto"].apply(normalize_text)
    merged = merged.merge(produto_catalogo, on="produto_norm", how="left")

    merged["produto_conciso"] = merged["produto_conciso"].fillna(merged["produto"])
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
        merged.loc[merged["cadeia"] == "Não classificado", "produto"]
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
        df, municipios, produto_catalogo
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
def load_vbp_data() -> Tuple[pd.DataFrame, Dict[str, List[str]]]:
    municipios, produto_catalogo = load_reference_tables()

    frames: List[pd.DataFrame] = []
    missing_municipios: set[str] = set()
    missing_produtos: set[str] = set()

    for path in sorted(DATA_DIR.glob("*.xls*")):
        if path.name.lower() == "municipios_pr.xlsx":
            continue

        df, miss_mun, miss_prod = read_single_file(path, municipios, produto_catalogo)
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

data, diagnostics = load_vbp_data()
if data.empty:
    st.error("Nenhum arquivo válido encontrado na pasta data/.")
    st.stop()

anos_disponiveis = sorted(data["ano"].unique())
min_year, max_year = int(min(anos_disponiveis)), int(max(anos_disponiveis))

st.sidebar.header("🎯 Filtros analíticos")
year_range = st.sidebar.slider(
    "Período (ano)",
    min_value=min_year,
    max_value=max_year,
    value=(min_year, max_year),
)

mesos = sorted(data["meso_idr"].dropna().unique())
regional_options = sorted(data["regional_idr"].dropna().unique())
cadeias = sorted(data["cadeia"].dropna().unique())
subcadeias = sorted(data["subcadeia"].dropna().unique())
produtos = sorted(data["produto_conciso"].dropna().unique())

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

selected_cadeias = st.sidebar.multiselect(
    "Cadeia produtiva",
    options=cadeias,
    default=cadeias,
)

filtered_subcadeias = (
    data[data["cadeia"].isin(selected_cadeias)]["subcadeia"].dropna().unique()
    if selected_cadeias
    else subcadeias
)
filtered_subcadeias = sorted(filtered_subcadeias)
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

filtered_produtos = sorted(produto_base["produto_conciso"].dropna().unique())
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

col1, col2, col3 = st.columns(3)
with col1:
    total_valor = filtered_df["valor"].sum()
    st.metric("Valor bruto da produção", format_currency(total_valor))
with col2:
    total_producao = filtered_df["producao"].sum()
    st.metric("Produção total", format_number(total_producao))
with col3:
    total_area = filtered_df["area"].sum()
    st.metric("Área cultivada", format_number(total_area))


# ---------------------------------------------------------------------------
# Visualizações em abas
# ---------------------------------------------------------------------------

tab_overview, tab_cadeias, tab_produtos, tab_mapa = st.tabs(
    ["Visão geral", "Cadeias", "Produtos", "Mapa"]
)

with tab_overview:
    st.subheader("Evolução temporal das principais variáveis")
    time_series = (
        filtered_df.groupby("ano")[list(metric_map.keys())]
        .sum()
        .reset_index()
        .sort_values("ano")
    )

    valor_fig = px.line(
        time_series,
        x="ano",
        y="valor",
        markers=True,
        title="Valor bruto da produção (R$)",
    )
    valor_fig.update_layout(margin=dict(l=10, r=10, t=60, b=10))
    valor_fig.update_traces(hovertemplate="Ano %{x}<br>Valor %{y:,.0f}<extra></extra>")
    st.plotly_chart(valor_fig, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        area_fig = px.line(
            time_series,
            x="ano",
            y="area",
            markers=True,
            title="Área cultivada (ha)",
        )
        area_fig.update_layout(margin=dict(l=10, r=10, t=60, b=10))
        area_fig.update_traces(hovertemplate="Ano %{x}<br>Área %{y:,.0f}<extra></extra>")
        st.plotly_chart(area_fig, use_container_width=True)

    with col_b:
        prod_fig = px.line(
            time_series,
            x="ano",
            y="producao",
            markers=True,
            title="Quantidade produzida",
        )
        prod_fig.update_layout(margin=dict(l=10, r=10, t=60, b=10))
        prod_fig.update_traces(hovertemplate="Ano %{x}<br>Quantidade %{y:,.0f}<extra></extra>")
        st.plotly_chart(prod_fig, use_container_width=True)

    st.subheader("Participação das principais cadeias no período selecionado")
    cadeias_agg = (
        filtered_df.groupby("cadeia")["valor"].sum().reset_index().sort_values("valor", ascending=False)
    )
    cadeias_fig = px.bar(
        cadeias_agg,
        x="cadeia",
        y="valor",
        title="Valor bruto da produção por cadeia",
        text_auto=".2s",
    )
    cadeias_fig.update_layout(xaxis_title="Cadeia", yaxis_title="Valor (R$)", margin=dict(l=10, r=10, t=60, b=10))
    st.plotly_chart(cadeias_fig, use_container_width=True)


with tab_cadeias:
    st.subheader("Hierarquia de cadeias e subcadeias")
    hierarchy = (
        filtered_df.groupby(["cadeia", "subcadeia", "produto_conciso"])["valor"].sum().reset_index()
    )
    sunburst_fig = px.sunburst(
        hierarchy,
        path=["cadeia", "subcadeia", "produto_conciso"],
        values="valor",
        color="cadeia",
        title="Distribuição de valor por cadeia, subcadeia e produto",
    )
    sunburst_fig.update_layout(margin=dict(l=0, r=0, t=60, b=0))
    st.plotly_chart(sunburst_fig, use_container_width=True)

    st.subheader("Cadeia por regional IDR")
    cadeia_regional = (
        filtered_df.groupby(["regional_idr", "cadeia"])["valor"].sum().reset_index()
    )
    cadeia_regional = cadeia_regional.sort_values("valor", ascending=False)
    cadeia_region_fig = px.bar(
        cadeia_regional,
        x="regional_idr",
        y="valor",
        color="cadeia",
        title="Distribuição do valor por cadeia e regional",
        text_auto=".2s",
    )
    cadeia_region_fig.update_layout(
        xaxis_title="Regional IDR",
        yaxis_title="Valor (R$)",
        margin=dict(l=10, r=10, t=60, b=10),
        legend_title="Cadeia",
        barmode="stack",
    )
    st.plotly_chart(cadeia_region_fig, use_container_width=True)


with tab_produtos:
    st.subheader("Produtos líderes por regional")
    prod_regional = (
        filtered_df.groupby(["regional_idr", "produto_conciso"])["valor"].sum().reset_index()
    )
    top_prod = (
        prod_regional.sort_values("valor", ascending=False).groupby("regional_idr").head(5)
    )
    top_prod_fig = px.bar(
        top_prod,
        x="valor",
        y="produto_conciso",
        color="regional_idr",
        orientation="h",
        title="Top 5 produtos por regional (valor)",
        text_auto=".2s",
    )
    top_prod_fig.update_layout(
        xaxis_title="Valor (R$)",
        yaxis_title="Produto",
        margin=dict(l=10, r=10, t=60, b=10),
        legend_title="Regional IDR",
    )
    st.plotly_chart(top_prod_fig, use_container_width=True)

    st.subheader("Tabela analítica de produtos")
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
    st.dataframe(
        produto_tabela,
        use_container_width=True,
        hide_index=True,
        column_config={
            "valor_total": st.column_config.NumberColumn("Valor (R$)", format="%0.0f"),
            "quantidade_total": st.column_config.NumberColumn("Quantidade", format="%0.0f"),
            "area_total": st.column_config.NumberColumn("Área (ha)", format="%0.0f"),
        },
    )


with tab_mapa:
    st.subheader("Mapa temático por município")
    geojson = load_geojson()
    mapa_base = (
        filtered_df.groupby(["cod_ibge", "municipio_oficial", "regional_idr"])[
            [map_metric, "valor", "producao", "area"]
        ]
        .sum()
        .reset_index()
    )
    mapa_base = mapa_base[mapa_base[map_metric].notna()]

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
                "valor": True,
                "producao": True,
                "area": True,
            },
            color_continuous_scale="Viridis",
            mapbox_style="carto-positron",
            zoom=5.2,
            center={"lat": -24.7, "lon": -51.9},
            opacity=0.7,
            title=f"{color_title} por município",
        )
        mapa_fig.update_layout(margin=dict(l=0, r=0, t=60, b=0))
        st.plotly_chart(mapa_fig, use_container_width=True)

    st.caption(
        "Os valores apresentados correspondem ao somatório do período filtrado. "
        "Utilize os filtros para analisar um único ano (incluindo 2020 e 2023) "
        "ou intervalos personalizados."
    )
