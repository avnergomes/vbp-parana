
import streamlit as st
import pandas as pd
import plotly.express as px
from pathlib import Path
import numpy as np

st.set_page_config(page_title="VBP Paraná", layout="wide")
st.title("📊 VBP Paraná — Dashboard Histórico")

# Carrega dados
DATA_DIR = Path("data")
files = list(DATA_DIR.glob("*.xls*"))
dfs = []
for f in files:
    try:
        df = pd.read_excel(f)
        df["origem"] = f.name
        dfs.append(df)
    except Exception as e:
        st.warning(f"Erro ao ler {f.name}: {e}")
if not dfs:
    st.error("Nenhum arquivo encontrado na pasta data/.")
    st.stop()
data = pd.concat(dfs, ignore_index=True)

# Normaliza colunas
data.columns = [c.strip().lower().replace(" ", "_") for c in data.columns]
if "ano" not in data.columns:
    st.error("Coluna 'ano' não encontrada.")
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
