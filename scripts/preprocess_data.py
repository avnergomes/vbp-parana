#!/usr/bin/env python3
"""
Script de preprocessamento dos dados VBP Paraná.
Converte os arquivos Excel para JSON otimizado para uso no dashboard React.

Conversão de Unidades:
----------------------
Para garantir agregações corretas, todas as produções são convertidas para toneladas:
- TON: 1:1 (já está em toneladas)
- L: 0.001 (litros → toneladas, assumindo densidade ~1 kg/L para leite)
- MIL L: 1.0 (mil litros → toneladas, ~1000 kg = 1 ton)
- KG: 0.001 (quilogramas → toneladas)
- Unidades sem conversão (UN, CX, DZ, M³, M², VSO, MCO, CAB): 0.0 (não somadas)

Isso evita somar produções de diferentes unidades de medida (ex: toneladas + litros + unidades),
garantindo valores consistentes nos agregados e visualizações.
"""

import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple, Any
import pandas as pd
import numpy as np

# Diretórios
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "dashboard" / "public" / "data"

# Garantir que o diretório de saída existe
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_text(value: str) -> str:
    """Normaliza textos para comparações."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^0-9a-zA-Z ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def normalize_column(name: str) -> str:
    """Padroniza nomes de colunas."""
    text = unicodedata.normalize("NFKD", str(name))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[\-/]", " ", text)
    text = re.sub(r"[^0-9a-zA-Z ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text.replace(" ", "_")


COLUMN_ALIASES: Dict[str, str] = {
    "ano": "ano", "safra": "safra",
    "municipio": "municipio", "municipios": "municipio",
    "nr": "regional_idr", "nr_seab": "regional_idr", "nrseab": "regional_idr",
    "cultura": "produto", "produto": "produto",
    "unidade": "unidade",
    "area": "area", "area_ha": "area", "area_(ha)": "area",
    "producao": "producao", "quantidade": "producao",
    "abate": "abate", "abate_comercializacao": "abate",
    "valor": "valor", "valor_rs": "valor", "valor_r": "valor", "vbp": "valor",
}

MUNICIPIO_ALIASES: Dict[str, str] = {
    normalize_text("Santa Terezinha do Itaipu"): normalize_text("Santa Terezinha de Itaipu"),
    normalize_text("Itapejara do Oeste"): normalize_text("Itapejara d'Oeste"),
    normalize_text("Rancho Alegre do Oeste"): normalize_text("Rancho Alegre d'Oeste"),
    normalize_text("Sao Jorge do Oeste"): normalize_text("São Jorge d'Oeste"),
    normalize_text("Saudades do Iguacu"): normalize_text("Saudade do Iguaçu"),
    normalize_text("Perola do Oeste"): normalize_text("Pérola d'Oeste"),
    normalize_text("Santa Izabel do Ivai"): normalize_text("Santa Isabel do Ivaí"),
    normalize_text("Arapuan"): normalize_text("Arapuã"),
    normalize_text("Santa Cruz do Monte Castelo"): normalize_text("Santa Cruz de Monte Castelo"),
}

PRODUCT_ALIASES: Dict[str, str] = {
    normalize_text("Alho Porro"): normalize_text("Alho Poro"),
    normalize_text("Arroz de Sequeiro"): normalize_text("Arroz Sequeiro"),
    normalize_text("Brocolos"): normalize_text("Brócolis"),
}

# Tabela de conversão de unidades para toneladas
# Fator de conversão: quantidade_em_toneladas = quantidade_original * fator
UNIT_TO_TON_CONVERSION: Dict[str, float] = {
    "TON": 1.0,         # Tonelada → Tonelada (1:1)
    "T": 1.0,           # Tonelada → Tonelada (1:1)
    "KG": 0.001,        # Quilograma → Tonelada (1 kg = 0.001 ton)
    "L": 0.001,         # Litro → Tonelada (para leite: ~1 kg/L)
    "MIL L": 1.0,       # Mil litros → Tonelada (para leite: ~1000 kg = 1 ton)
    # Unidades sem conversão direta para massa:
    "UN": 0.0,          # Unidade (não converter)
    "CX": 0.0,          # Caixa (não converter)
    "DZ": 0.0,          # Dúzia (não converter)
    "M³": 0.0,          # Metro cúbico (não converter)
    "M²": 0.0,          # Metro quadrado (não converter)
    "VSO": 0.0,         # Vaso (não converter)
    "MCO": 0.0,         # Maço (não converter)
    "CAB": 0.0,         # Cabaço (não converter)
}


def convert_to_tons(producao: float, unidade: str) -> float:
    """
    Converte quantidade de produção para toneladas.

    Args:
        producao: Quantidade produzida na unidade original
        unidade: Unidade de medida (TON, L, KG, etc.)

    Returns:
        Quantidade em toneladas, ou 0.0 se não houver conversão definida
    """
    if pd.isna(producao) or producao == 0:
        return 0.0

    unidade_upper = str(unidade).upper().strip()
    fator = UNIT_TO_TON_CONVERSION.get(unidade_upper, 0.0)

    return producao * fator


def build_product_correction_map(
    produto_correcoes: pd.DataFrame, produto_catalogo: pd.DataFrame
) -> Dict[str, str]:
    """Cria mapa de correções alinhado ao catálogo de produtos."""

    if produto_correcoes.empty:
        return {}

    catalog_norms = set(produto_catalogo["produto_norm"].unique())
    correction_map: Dict[str, str] = {}

    for _, row in produto_correcoes.iterrows():
        corrected = row["produto_norm_corrigido"]
        # Priorizar forma corrigida informada na planilha; ajustar para o catálogo quando necessário
        target = corrected

        if corrected not in catalog_norms:
            alias_target = PRODUCT_ALIASES.get(corrected)
            singular = corrected[:-1] if corrected.endswith("s") else corrected

            if alias_target and alias_target in catalog_norms:
                target = alias_target
            elif singular in catalog_norms:
                target = singular

        correction_map[row["produto_norm_original"]] = target

    return correction_map


def coerce_year(series: pd.Series) -> pd.Series:
    """Converte diferentes formatos de ano/safra em inteiros."""
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


def load_reference_tables() -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    """Carrega tabelas de referência."""
    # Municípios
    municipios = pd.read_excel(DATA_DIR / "municipios_pr.xlsx")
    municipios = municipios.rename(columns={
        "Municipio": "municipio_oficial",
        "CodIbge": "cod_ibge",
        "RegIdr": "regional_idr",
        "CRegIdr": "regional_codigo",
        "MesoIdr": "meso_idr",
    })
    municipios["cod_ibge"] = municipios["cod_ibge"].astype(str).str.zfill(7)
    municipios["municipio_norm"] = municipios["municipio_oficial"].apply(normalize_text)

    # Produtos
    produtos_raw = pd.read_excel(DATA_DIR / "lista_produtos_vbp_2012_2024.xlsx", sheet_name="Produtos")
    produtos_raw = produtos_raw.rename(columns={
        "PRODUTO": "produto_conciso",
        "Cadeia": "cadeia",
        "Subcadeia": "subcadeia",
    })
    produtos_raw["produto_norm"] = produtos_raw["produto_conciso"].apply(normalize_text)
    produto_catalogo = produtos_raw[["produto_norm", "produto_conciso", "cadeia", "subcadeia"]].copy()
    produto_catalogo = produto_catalogo.dropna(subset=["produto_norm"])
    produto_catalogo = produto_catalogo.drop_duplicates("produto_norm", keep="first")
    produto_catalogo[["cadeia", "subcadeia"]] = produto_catalogo[["cadeia", "subcadeia"]].fillna("Não classificado")

    # Correções de produtos
    try:
        produto_correcoes = pd.read_excel(
            DATA_DIR / "lista_produtos_vbp_2012_2024.xlsx",
            sheet_name="Correcao_produtos",
            header=None,
            names=["produto_original", "produto_corrigido"],
        )
        produto_correcoes = produto_correcoes.dropna(subset=["produto_original", "produto_corrigido"])
        produto_correcoes["produto_norm_original"] = produto_correcoes["produto_original"].apply(normalize_text)
        produto_correcoes["produto_norm_corrigido"] = produto_correcoes["produto_corrigido"].apply(normalize_text)
    except:
        produto_correcoes = pd.DataFrame(columns=["produto_norm_original", "produto_norm_corrigido"])

    correction_map = build_product_correction_map(produto_correcoes, produto_catalogo)

    return municipios, produto_catalogo, correction_map


def rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Renomeia colunas usando aliases."""
    renamed = {}
    for col in df.columns:
        norm = normalize_column(col)
        target = COLUMN_ALIASES.get(norm)
        if target:
            renamed[col] = target
    if renamed:
        df = df.rename(columns=renamed)
    return df


def process_vbp_file(path: Path, municipios: pd.DataFrame,
                     produto_catalogo: pd.DataFrame,
                     correction_map: Dict[str, str]) -> pd.DataFrame:
    """Processa um arquivo VBP individual."""
    raw = pd.read_excel(path)
    df = raw.copy()
    df.columns = [normalize_column(col) for col in df.columns]
    df = rename_columns(df)

    # Processar ano
    if "ano" not in df.columns:
        if "safra" in df.columns:
            df["ano"] = coerce_year(df["safra"])
        else:
            return pd.DataFrame()
    else:
        df["ano"] = coerce_year(df["ano"])

    df = df[df["ano"].notna()]
    if df.empty or "municipio" not in df.columns:
        return pd.DataFrame()

    df["municipio"] = df["municipio"].astype(str).str.strip()

    if "produto" not in df.columns:
        return pd.DataFrame()

    # Garantir colunas numéricas
    for col in ["valor", "area", "producao", "abate"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            df[col] = 0.0

    if "unidade" not in df.columns:
        df["unidade"] = ""
    df["unidade"] = df["unidade"].astype(str).str.upper()
    # Normalizar unidades (padronizar variações)
    df["unidade"] = df["unidade"].replace({
        "T": "TON",
        "LIT": "L",
        "UNI": "UN",
        "M3": "M³",
        "M2": "M²",
        "MIL L": "MIL L",
        "MLT": "MIL L",
        "NAN": "",
        "NONE": "",
        "NA": "",
    })

    # Normalizar município
    df["municipio_norm"] = df["municipio"].apply(normalize_text)
    df["municipio_norm"] = df["municipio_norm"].replace(MUNICIPIO_ALIASES)

    # Normalizar produto
    df["produto_norm"] = df["produto"].apply(normalize_text)
    df["produto_norm"] = df["produto_norm"].replace(correction_map)
    df["produto_norm"] = df["produto_norm"].replace(PRODUCT_ALIASES)

    # Remover colunas regional_idr se existir (vamos usar do merge)
    if "regional_idr" in df.columns:
        df = df.drop(columns=["regional_idr"])

    # Merge com municípios
    mun_cols = municipios[["municipio_norm", "municipio_oficial", "cod_ibge", "regional_idr", "meso_idr"]].copy()
    df = df.merge(mun_cols, on="municipio_norm", how="left")
    df["municipio_oficial"] = df["municipio_oficial"].fillna(df["municipio"])
    df["regional_idr"] = df["regional_idr"].fillna("Não identificado")
    df["meso_idr"] = df["meso_idr"].fillna("Não identificado")
    df["cod_ibge"] = df["cod_ibge"].fillna("")

    # Merge com produtos
    df = df.merge(produto_catalogo, on="produto_norm", how="left")
    df["produto_conciso"] = df["produto_conciso"].fillna(df["produto"].str.upper())
    df["cadeia"] = df["cadeia"].fillna("Não classificado")
    df["subcadeia"] = df["subcadeia"].fillna("Não classificado")

    # Converter produção para toneladas
    df["producao_ton"] = df.apply(
        lambda row: convert_to_tons(row["producao"], row["unidade"]),
        axis=1
    )

    # Garantir colunas finais
    required_cols = ["ano", "municipio", "municipio_oficial", "cod_ibge", "regional_idr",
                     "meso_idr", "produto", "produto_conciso", "cadeia", "subcadeia",
                     "unidade", "valor", "area", "producao", "producao_ton"]
    for col in required_cols:
        if col not in df.columns:
            df[col] = ""

    return df[required_cols]


def load_all_vbp_data() -> pd.DataFrame:
    """Carrega todos os arquivos VBP."""
    municipios, produto_catalogo, correction_map = load_reference_tables()

    frames = []
    vbp_files = sorted(DATA_DIR.glob("*bp*.xlsx")) + sorted(DATA_DIR.glob("*BP*.xlsx"))
    vbp_files = [f for f in vbp_files if "lista_produtos" not in f.name.lower()]

    for path in vbp_files:
        print(f"Processando: {path.name}")
        df = process_vbp_file(path, municipios, produto_catalogo, correction_map)
        if not df.empty:
            frames.append(df)

    if not frames:
        return pd.DataFrame()

    data = pd.concat(frames, ignore_index=True)
    data = data.drop_duplicates()
    data["ano"] = data["ano"].astype(int)

    return data


def generate_aggregated_data(data: pd.DataFrame) -> Dict[str, Any]:
    """Gera dados agregados para o dashboard."""

    # 1. Série temporal
    time_series = data.groupby("ano").agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    time_series = time_series.rename(columns={"producao_ton": "producao"})
    time_series = time_series.sort_values("ano")

    # 2. Por cadeia
    by_cadeia = data.groupby("cadeia").agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_cadeia = by_cadeia.rename(columns={"producao_ton": "producao"})

    # 3. Por subcadeia
    by_subcadeia = data.groupby(["cadeia", "subcadeia"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_subcadeia = by_subcadeia.rename(columns={"producao_ton": "producao"})

    # 4. Por produto (agregado sem unidade para evitar duplicados)
    by_produto = data.groupby(["produto_conciso", "cadeia", "subcadeia"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_produto = by_produto.rename(columns={"producao_ton": "producao"})

    # 5. Por município
    by_municipio = data.groupby(["cod_ibge", "municipio_oficial", "regional_idr", "meso_idr"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_municipio = by_municipio.rename(columns={"producao_ton": "producao"})

    # 6. Por regional
    by_regional = data.groupby("regional_idr").agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_regional = by_regional.rename(columns={"producao_ton": "producao"})

    # 7. Por mesorregião
    by_meso = data.groupby("meso_idr").agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)
    by_meso = by_meso.rename(columns={"producao_ton": "producao"})

    # 8. Evolução por cadeia (ano x cadeia)
    evolution_cadeia = data.groupby(["ano", "cadeia"]).agg({
        "valor": "sum"
    }).reset_index().sort_values(["ano", "valor"], ascending=[True, False])

    # 9. Evolução por regional (ano x regional)
    evolution_regional = data.groupby(["ano", "regional_idr"]).agg({
        "valor": "sum"
    }).reset_index().sort_values(["ano", "valor"], ascending=[True, False])

    # 10. Top produtos por ano
    top_produtos_ano = data.groupby(["ano", "produto_conciso"]).agg({
        "valor": "sum"
    }).reset_index()
    top_produtos_ano = top_produtos_ano.sort_values(["ano", "valor"], ascending=[True, False])
    top_produtos_ano = top_produtos_ano.groupby("ano").head(10).reset_index(drop=True)

    # 11. Hierarquia completa (para sunburst/treemap)
    hierarchy = data.groupby(["cadeia", "subcadeia", "produto_conciso"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    hierarchy = hierarchy.rename(columns={"producao_ton": "producao"})

    # 12. Dados por ano-município (para o mapa temporal)
    by_ano_municipio = data.groupby(["ano", "cod_ibge", "municipio_oficial"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_municipio = by_ano_municipio.rename(columns={"producao_ton": "producao"})

    # 13. Dados por ano-cadeia-regional
    by_ano_cadeia_regional = data.groupby(["ano", "cadeia", "regional_idr"]).agg({
        "valor": "sum"
    }).reset_index()

    # Listas de filtros
    anos = sorted(data["ano"].unique().tolist())
    cadeias = sorted(data["cadeia"].dropna().unique().tolist())
    subcadeias = sorted(data["subcadeia"].dropna().unique().tolist())
    produtos = sorted(data["produto_conciso"].dropna().unique().tolist())
    regionais = sorted(data["regional_idr"].dropna().unique().tolist())
    mesos = sorted(data["meso_idr"].dropna().unique().tolist())
    municipios = data[["cod_ibge", "municipio_oficial", "regional_idr", "meso_idr"]].drop_duplicates()
    municipios = municipios.dropna(subset=["cod_ibge"]).sort_values("municipio_oficial")

    return {
        "metadata": {
            "anos": anos,
            "totalAnos": len(anos),
            "anoMin": min(anos),
            "anoMax": max(anos),
            "totalMunicipios": len(municipios),
            "totalProdutos": len(produtos),
            "totalCadeias": len(cadeias),
            "valorTotal": float(data["valor"].sum()),
            "producaoTotal": float(data["producao_ton"].sum()),
            "areaTotal": float(data["area"].sum()),
            "filters": {
                "anos": anos,
                "cadeias": cadeias,
                "subcadeias": subcadeias,
                "produtos": produtos,
                "regionais": regionais,
                "mesos": mesos,
                "municipios": municipios.to_dict(orient="records"),
            },
        },
        "timeSeries": time_series.to_dict(orient="records"),
        "byCadeia": by_cadeia.to_dict(orient="records"),
        "bySubcadeia": by_subcadeia.to_dict(orient="records"),
        "byProduto": by_produto.to_dict(orient="records"),
        "byMunicipio": by_municipio.to_dict(orient="records"),
        "byRegional": by_regional.to_dict(orient="records"),
        "byMeso": by_meso.to_dict(orient="records"),
        "evolutionCadeia": evolution_cadeia.to_dict(orient="records"),
        "evolutionRegional": evolution_regional.to_dict(orient="records"),
        "topProdutosAno": top_produtos_ano.to_dict(orient="records"),
        "hierarchy": hierarchy.to_dict(orient="records"),
    }


def generate_detailed_data(data: pd.DataFrame) -> Dict[str, Any]:
    """Gera dados detalhados para filtros dinâmicos (otimizado)."""

    # Dados por ano-município (para mapa interativo) - arredondar valores
    by_ano_municipio = data.groupby(["ano", "cod_ibge", "municipio_oficial", "regional_idr"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()

    # Arredondar para reduzir tamanho
    by_ano_municipio["valor"] = by_ano_municipio["valor"].round(0).astype(int)
    by_ano_municipio["producao_ton"] = by_ano_municipio["producao_ton"].round(0).astype(int)
    by_ano_municipio["area"] = by_ano_municipio["area"].round(0).astype(int)

    # Remover registros com cod_ibge vazio
    by_ano_municipio = by_ano_municipio[by_ano_municipio["cod_ibge"] != ""]

    # Usar códigos curtos para economizar espaço
    by_ano_municipio = by_ano_municipio.rename(columns={
        "municipio_oficial": "m",
        "cod_ibge": "c",
        "regional_idr": "r",
        "ano": "a",
        "valor": "v",
        "producao_ton": "p",
        "area": "ar"
    })

    # Dados por ano-cadeia (para filtrar gráficos de cadeia por ano)
    by_ano_cadeia = data.groupby(["ano", "cadeia"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_cadeia["valor"] = by_ano_cadeia["valor"].round(0).astype(int)
    by_ano_cadeia["producao_ton"] = by_ano_cadeia["producao_ton"].round(0).astype(int)
    by_ano_cadeia["area"] = by_ano_cadeia["area"].round(0).astype(int)
    by_ano_cadeia = by_ano_cadeia.rename(columns={
        "ano": "a", "cadeia": "c", "valor": "v", "producao_ton": "p", "area": "ar"
    })

    # Dados por ano-subcadeia
    by_ano_subcadeia = data.groupby(["ano", "cadeia", "subcadeia"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_subcadeia["valor"] = by_ano_subcadeia["valor"].round(0).astype(int)
    by_ano_subcadeia["producao_ton"] = by_ano_subcadeia["producao_ton"].round(0).astype(int)
    by_ano_subcadeia["area"] = by_ano_subcadeia["area"].round(0).astype(int)
    by_ano_subcadeia = by_ano_subcadeia.rename(columns={
        "ano": "a", "cadeia": "c", "subcadeia": "s", "valor": "v", "producao_ton": "p", "area": "ar"
    })

    # Dados por ano-produto
    by_ano_produto = data.groupby(["ano", "produto_conciso", "cadeia", "subcadeia"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_produto["valor"] = by_ano_produto["valor"].round(0).astype(int)
    by_ano_produto["producao_ton"] = by_ano_produto["producao_ton"].round(0).astype(int)
    by_ano_produto["area"] = by_ano_produto["area"].round(0).astype(int)
    by_ano_produto = by_ano_produto.rename(columns={
        "ano": "a", "produto_conciso": "n", "cadeia": "c", "subcadeia": "s",
        "valor": "v", "producao_ton": "p", "area": "ar"
    })

    # Dados por ano-regional
    by_ano_regional = data.groupby(["ano", "regional_idr", "meso_idr"]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_regional["valor"] = by_ano_regional["valor"].round(0).astype(int)
    by_ano_regional["producao_ton"] = by_ano_regional["producao_ton"].round(0).astype(int)
    by_ano_regional["area"] = by_ano_regional["area"].round(0).astype(int)
    by_ano_regional = by_ano_regional.rename(columns={
        "ano": "a", "regional_idr": "r", "meso_idr": "m",
        "valor": "v", "producao_ton": "p", "area": "ar"
    })

    # Dados por ano-produto-regional (TODAS AS DIMENSÕES CRUZADAS)
    by_ano_produto_regional = data.groupby([
        "ano", "produto_conciso", "cadeia", "subcadeia", "regional_idr", "meso_idr"
    ]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_produto_regional["valor"] = by_ano_produto_regional["valor"].round(0).astype(int)
    by_ano_produto_regional["producao_ton"] = by_ano_produto_regional["producao_ton"].round(0).astype(int)
    by_ano_produto_regional["area"] = by_ano_produto_regional["area"].round(0).astype(int)
    by_ano_produto_regional = by_ano_produto_regional.rename(columns={
        "ano": "a", "produto_conciso": "n", "cadeia": "c", "subcadeia": "s",
        "regional_idr": "r", "meso_idr": "m",
        "valor": "v", "producao_ton": "p", "area": "ar"
    })

    # Dados por ano-produto-município (para filtrar mapa por produto)
    by_ano_produto_municipio = data.groupby([
        "ano", "produto_conciso", "cadeia", "subcadeia", "cod_ibge", "municipio_oficial", "regional_idr"
    ]).agg({
        "valor": "sum",
        "producao_ton": "sum",
        "area": "sum"
    }).reset_index()
    by_ano_produto_municipio["valor"] = by_ano_produto_municipio["valor"].round(0).astype(int)
    by_ano_produto_municipio["producao_ton"] = by_ano_produto_municipio["producao_ton"].round(0).astype(int)
    by_ano_produto_municipio["area"] = by_ano_produto_municipio["area"].round(0).astype(int)
    # Remover registros com cod_ibge vazio
    by_ano_produto_municipio = by_ano_produto_municipio[by_ano_produto_municipio["cod_ibge"] != ""]
    by_ano_produto_municipio = by_ano_produto_municipio.rename(columns={
        "ano": "a", "produto_conciso": "n", "cadeia": "c", "subcadeia": "s",
        "cod_ibge": "cod", "municipio_oficial": "m", "regional_idr": "r",
        "valor": "v", "producao_ton": "p", "area": "ar"
    })

    return {
        "mapData": by_ano_municipio.to_dict(orient="records"),
        "byAnoCadeia": by_ano_cadeia.to_dict(orient="records"),
        "byAnoSubcadeia": by_ano_subcadeia.to_dict(orient="records"),
        "byAnoProduto": by_ano_produto.to_dict(orient="records"),
        "byAnoRegional": by_ano_regional.to_dict(orient="records"),
        "byAnoProdutoRegional": by_ano_produto_regional.to_dict(orient="records"),
        "byAnoProdutoMunicipio": by_ano_produto_municipio.to_dict(orient="records"),
    }


def generate_subcadeia_produto_map(data: pd.DataFrame) -> Dict[str, List[str]]:
    """Gera mapa de subcadeia -> produtos para filtros dinâmicos."""
    mapping = {}

    for cadeia in data["cadeia"].dropna().unique():
        cadeia_data = data[data["cadeia"] == cadeia]
        subcadeias_map = {}

        for subcadeia in cadeia_data["subcadeia"].dropna().unique():
            produtos = sorted(
                cadeia_data[cadeia_data["subcadeia"] == subcadeia]["produto_conciso"]
                .dropna().unique().tolist()
            )
            subcadeias_map[subcadeia] = produtos

        mapping[cadeia] = {
            "subcadeias": sorted(subcadeias_map.keys()),
            "produtos": subcadeias_map
        }

    return mapping


def generate_municipio_regional_map(data: pd.DataFrame) -> Dict[str, Any]:
    """Gera mapa de regional -> municípios para filtros."""
    df = data[["municipio_oficial", "cod_ibge", "regional_idr", "meso_idr"]].drop_duplicates()
    df = df.dropna(subset=["regional_idr"])

    by_meso = {}
    for meso in df["meso_idr"].dropna().unique():
        meso_data = df[df["meso_idr"] == meso]
        regionais = {}

        for regional in meso_data["regional_idr"].dropna().unique():
            municipios = meso_data[meso_data["regional_idr"] == regional][
                ["municipio_oficial", "cod_ibge"]
            ].to_dict(orient="records")
            regionais[regional] = municipios

        by_meso[meso] = {
            "regionais": sorted(regionais.keys()),
            "municipios": regionais
        }

    return by_meso


def copy_geojson():
    """Copia o GeoJSON para a pasta de dados do dashboard."""
    import shutil
    src = BASE_DIR / "mun_PR.json"
    dst = OUTPUT_DIR / "municipios.geojson"

    # Otimizar o GeoJSON (reduzir precisão das coordenadas)
    with open(src, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    # Função para reduzir precisão
    def reduce_precision(coords, precision=4):
        if isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        return [reduce_precision(c, precision) for c in coords]

    for feature in geojson["features"]:
        if "geometry" in feature and feature["geometry"]:
            feature["geometry"]["coordinates"] = reduce_precision(
                feature["geometry"]["coordinates"], 4
            )
        # Garantir que cod_ibge esteja padronizado
        if "properties" in feature:
            cod = feature["properties"].get("CodIbge", "")
            feature["properties"]["CodIbge"] = str(cod).zfill(7) if cod else ""

    with open(dst, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    print(f"GeoJSON otimizado salvo em: {dst}")


def main():
    """Função principal."""
    print("=" * 60)
    print("Preprocessamento de dados VBP Paraná")
    print("=" * 60)

    # Carregar dados
    print("\n1. Carregando dados VBP...")
    data = load_all_vbp_data()
    print(f"   Total de registros: {len(data):,}")
    print(f"   Anos: {sorted(data['ano'].unique())}")

    # Gerar dados agregados
    print("\n2. Gerando dados agregados...")
    aggregated = generate_aggregated_data(data)

    with open(OUTPUT_DIR / "aggregated.json", "w", encoding="utf-8") as f:
        json.dump(aggregated, f, ensure_ascii=False)
    print(f"   Salvo: aggregated.json")

    # Gerar dados detalhados
    print("\n3. Gerando dados detalhados...")
    detailed = generate_detailed_data(data)

    with open(OUTPUT_DIR / "detailed.json", "w", encoding="utf-8") as f:
        json.dump(detailed, f, ensure_ascii=False)
    print(f"   Salvo: detailed.json")

    # Gerar mapas de filtros
    print("\n4. Gerando mapas de filtros...")
    produto_map = generate_subcadeia_produto_map(data)
    with open(OUTPUT_DIR / "produto_map.json", "w", encoding="utf-8") as f:
        json.dump(produto_map, f, ensure_ascii=False)
    print(f"   Salvo: produto_map.json")

    geo_map = generate_municipio_regional_map(data)
    with open(OUTPUT_DIR / "geo_map.json", "w", encoding="utf-8") as f:
        json.dump(geo_map, f, ensure_ascii=False)
    print(f"   Salvo: geo_map.json")

    # Copiar GeoJSON
    print("\n5. Processando GeoJSON...")
    copy_geojson()

    # Resumo
    print("\n" + "=" * 60)
    print("Preprocessamento concluído!")
    print("=" * 60)
    print(f"\nArquivos gerados em: {OUTPUT_DIR}")

    # Mostrar tamanhos
    for f in OUTPUT_DIR.glob("*.json"):
        size_kb = f.stat().st_size / 1024
        if size_kb > 1024:
            print(f"   {f.name}: {size_kb/1024:.1f} MB")
        else:
            print(f"   {f.name}: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
