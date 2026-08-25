#!/usr/bin/env python3
"""
Busca as áreas territoriais oficiais dos municípios do Paraná no IBGE
(SIDRA, tabela 4714 / variável 6318 — Área da unidade territorial, km²,
Censo 2022) e gera o JSON de referência consumido pela aba VBP/ha:

    dashboard/src/data/municipio_areas_ibge.json
        { "<cod_ibge 7 dígitos>": area_em_hectares, ... }

O VBP/ha do dashboard usa a ÁREA TERRITORIAL TOTAL do município (base
IBGE), não a área cultivada declarada no VBP. Rode este script apenas
quando o IBGE atualizar as áreas oficiais.

Uso:
    py -3 scripts/fetch_areas_ibge.py
"""

import json
import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
OUTPUT_PATH = BASE_DIR / "dashboard" / "src" / "data" / "municipio_areas_ibge.json"
GEO_MAP_PATH = BASE_DIR / "dashboard" / "public" / "data" / "geo_map.json"

SIDRA_URL = (
    "https://apisidra.ibge.gov.br/values/t/4714/n6/in%20n3%2041"
    "/v/6318/p/2022?formato=json"
)
KM2_TO_HA = 100.0


def main() -> int:
    with urllib.request.urlopen(SIDRA_URL, timeout=60) as resp:
        rows = json.load(resp)

    # Primeira linha é o cabeçalho descritivo do SIDRA.
    areas_ha = {}
    for row in rows[1:]:
        cod = str(row["D1C"]).zfill(7)
        areas_ha[cod] = round(float(row["V"]) * KM2_TO_HA, 1)

    if len(areas_ha) != 399:
        print(f"ERRO: esperados 399 municipios, obtidos {len(areas_ha)}", file=sys.stderr)
        return 1

    # Validar cobertura contra os códigos usados no dashboard (geo_map.json).
    if GEO_MAP_PATH.exists():
        with open(GEO_MAP_PATH, encoding="utf-8") as f:
            geo_map = json.load(f)
        dashboard_cods = {
            str(mun["cod_ibge"]).zfill(7)
            for meso in geo_map.values()
            for mun_list in meso.get("municipios", {}).values()
            for mun in mun_list
            if mun.get("cod_ibge")
        }
        missing = dashboard_cods - set(areas_ha)
        if missing:
            print(f"ERRO: sem area IBGE para {sorted(missing)}", file=sys.stderr)
            return 1
        print(f"Cobertura validada: {len(dashboard_cods)} codigos do dashboard presentes.")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(areas_ha, f, ensure_ascii=False, sort_keys=True)

    total_ha = sum(areas_ha.values())
    print(f"Salvo: {OUTPUT_PATH} ({len(areas_ha)} municipios, "
          f"total {total_ha/1e6:,.2f} mi ha)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
