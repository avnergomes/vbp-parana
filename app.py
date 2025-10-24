
import streamlit as st
import pandas as pd
import plotly.express as px
from pathlib import Path
import re
import unicodedata

st.set_page_config(page_title="VBP Paraná", layout="wide")
st.title("📊 VBP Paraná — Dashboard Histórico")

# Carrega dados
DATA_DIR = Path("data")


def normalize_column(name: str) -> str:
    """Padroniza nomes de colunas removendo acentos e caracteres especiais."""
    text = unicodedata.normalize("NFKD", str(name))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[\-/]", " ", text)
    text = re.sub(r"[^0-9a-zA-Z ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text.replace(" ", "_")


def coerce_year(series: pd.Series) -> pd.Series:
    """Converte diferentes formatos de ano em um inteiro de quatro dígitos."""
    numeric = pd.to_numeric(series, errors="coerce")
    if not numeric.isna().all():
        year = numeric.copy()
        # Safras como "2324" representam 2023/2024. Mantemos o último ano.
        mask = year > 2100
        year.loc[mask] = 2000 + (year.loc[mask] % 100)
    else:
        extracted = series.astype(str).str.extract(r"(\d{4})")[0]
        year = pd.to_numeric(extracted, errors="coerce")
    # Valores muito baixos (ex: 22) também são tratados como 2022.
    low_mask = year < 1900
    year.loc[low_mask] = 2000 + (year.loc[low_mask] % 100)
    return year.astype("Int64")


def load_vbp_frames():
    dfs = []
    skipped = []
    for f in sorted(DATA_DIR.glob("*.xls*")):
        try:
            raw_df = pd.read_excel(f)
        except Exception as exc:  # pragma: no cover - feedback visual
            st.warning(f"Erro ao ler {f.name}: {exc}")
            continue

        df = raw_df.copy()
        df.columns = [normalize_column(col) for col in df.columns]

        if "ano" not in df.columns:
            if "safra" in df.columns:
                df["ano"] = coerce_year(df["safra"])
                df.drop(columns=["safra"], inplace=True)
            else:
                skipped.append(f.name)
                continue
        else:
            df["ano"] = coerce_year(df["ano"])

        df = df[df["ano"].notna()]

        valor_aliases = ["valor", "valor_r", "valor_rs", "valor_r$", "vbp"]
        for alias in valor_aliases:
            if alias in df.columns:
                df["valor"] = pd.to_numeric(df[alias], errors="coerce")
                if alias != "valor":
                    df.drop(columns=[alias], inplace=True)
                break

        if "nr_seab" in df.columns:
            df.rename(columns={"nr_seab": "regional_idr"}, inplace=True)
        elif "nrseab" in df.columns:
            df.rename(columns={"nrseab": "regional_idr"}, inplace=True)

        if "municipio" in df.columns:
            df["municipio"] = (
                df["municipio"].astype(str).str.strip()
            )
            df = df[~df["municipio"].str.contains("fonte", case=False, na=False)]

        df["origem"] = f.name
        dfs.append(df)

    return dfs, skipped


dfs, skipped_files = load_vbp_frames()
if not dfs:
    st.error("Nenhum arquivo válido encontrado na pasta data/.")
    st.stop()

if skipped_files:
    st.info(
        "Arquivos ignorados (sem coluna de ano/safra): "
        + ", ".join(skipped_files)
    )

data = pd.concat(dfs, ignore_index=True)
data = data.loc[:, ~data.columns.duplicated()]
data.columns = [normalize_column(col) for col in data.columns]
if "ano" not in data.columns:
    st.error("Coluna 'ano' não encontrada após limpeza dos dados.")
    st.stop()

# Filtros
anos = sorted(data["ano"].dropna().unique())
ano_sel = st.sidebar.multiselect("Ano", anos, default=anos)
if "regional_idr" in data.columns:
    regs = sorted(data["regional_idr"].dropna().unique())
    reg_sel = st.sidebar.multiselect("Regional IDR", regs, default=regs)
else:
    reg_sel = []
if "cadeia" in data.columns:
    cadeias = sorted(data["cadeia"].dropna().unique())
    cad_sel = st.sidebar.multiselect("Cadeia", cadeias, default=cadeias)
else:
    cad_sel = []

filt = (data["ano"].isin(ano_sel))
if reg_sel:
    filt &= data["regional_idr"].isin(reg_sel)
if cad_sel:
    filt &= data["cadeia"].isin(cad_sel)

df = data[filt]

st.subheader("Séries Históricas de Valor (VBP)")
if "valor" in df.columns and "ano" in df.columns:
    vbps = df.groupby("ano")["valor"].sum().reset_index()
    fig = px.line(vbps, x="ano", y="valor", title="Evolução do Valor Bruto da Produção")
    st.plotly_chart(fig, use_container_width=True)
else:
    st.info("Colunas 'valor' e 'ano' necessárias para série histórica.")

st.subheader("Mapa (se houver lat/lon)")
if "lat" in df.columns and "lon" in df.columns:
    m = px.scatter_mapbox(df, lat="lat", lon="lon", color="valor",
                          size="valor", mapbox_style="carto-positron",
                          hover_name="municipio", zoom=5)
    st.plotly_chart(m, use_container_width=True)
else:
    st.info("Colunas de latitude/longitude não encontradas.")

st.write("Registros totais:", len(df))
