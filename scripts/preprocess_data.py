#!/usr/bin/env python3
"""
Script de preprocessamento dos dados VBP Paraná.
Converte os arquivos Excel para JSON otimizado para uso no dashboard React.
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
    "valor": "valor", "valor_rs": "valor", "vbp": "valor",
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

    # Garantir colunas finais
    required_cols = ["ano", "municipio", "municipio_oficial", "cod_ibge", "regional_idr",
                     "meso_idr", "produto", "produto_conciso", "cadeia", "subcadeia",
                     "unidade", "valor", "area", "producao"]
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
        "producao": "sum",
        "area": "sum"
    }).reset_index()
    time_series = time_series.sort_values("ano")

    # 2. Por cadeia
    by_cadeia = data.groupby("cadeia").agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

    # 3. Por subcadeia
    by_subcadeia = data.groupby(["cadeia", "subcadeia"]).agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

    # 4. Por produto
    by_produto = data.groupby(["produto_conciso", "cadeia", "subcadeia", "unidade"]).agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

    # 5. Por município
    by_municipio = data.groupby(["cod_ibge", "municipio_oficial", "regional_idr", "meso_idr"]).agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

    # 6. Por regional
    by_regional = data.groupby("regional_idr").agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

    # 7. Por mesorregião
    by_meso = data.groupby("meso_idr").agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index().sort_values("valor", ascending=False)

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
        "producao": "sum",
        "area": "sum"
    }).reset_index()

    # 12. Dados por ano-município (para o mapa temporal)
    by_ano_municipio = data.groupby(["ano", "cod_ibge", "municipio_oficial"]).agg({
        "valor": "sum",
        "producao": "sum",
        "area": "sum"
    }).reset_index()

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
            "producaoTotal": float(data["producao"].sum()),
            "areaTotal": float(data["area"].sum()),
        },
        "filters": {
            "anos": anos,
            "cadeias": cadeias,
            "subcadeias": subcadeias,
            "produtos": produtos,
            "regionais": regionais,
            "mesos": mesos,
            "municipios": municipios.to_dict(orient="records"),
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
        "producao": "sum",
        "area": "sum"
    }).reset_index()

    # Arredondar para reduzir tamanho
    by_ano_municipio["valor"] = by_ano_municipio["valor"].round(0).astype(int)
    by_ano_municipio["producao"] = by_ano_municipio["producao"].round(0).astype(int)
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
        "producao": "p",
        "area": "ar"
    })

    return {
        "mapData": by_ano_municipio.to_dict(orient="records"),
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
