#!/usr/bin/env python3
"""
Fatiamento do detailed.json (83 MB) em arquivos menores, DERIVANDO do JSON
local (nao reprocessa Excel). Gera:

  - detailed_regional.json  = {mapData, byAnoProdutoRegional}
      cobre TODOS os filtros exceto o recorte municipal por produto.
      Descarta as 4 chaves mortas (byAnoCadeia/byAnoSubcadeia/byAnoProduto/
      byAnoRegional), que o frontend nao consome.

  - detailed_municipio_<ano>.json = array puro de byAnoProdutoMunicipio
      fatiado por ano (dimensao sempre presente no filtro). Uma fatia por ano.

Verificacao de integridade embutida: contagens e somas (v/p/ar) das fatias,
lidas de volta do disco, precisam bater EXATAMENTE com o byAnoProdutoMunicipio
original; a soma global de v e cruzada contra aggregated metadata.valorTotal
com tolerancia relativa 1e-6 (o detailed arredonda para int). Qualquer
divergencia => exit code 1 (standalone) sem escrever um frontend inconsistente.

Uso:
    py -3 scripts/split_detailed.py
"""

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Tuple

BASE_DIR = Path(__file__).parent.parent
OUTPUT_DIR = BASE_DIR / "dashboard" / "public" / "data"

REL_TOL = 1e-6  # tolerancia relativa para o cross-check com aggregated


def _sum_fields(records) -> Tuple[int, float, float, float]:
    """Retorna (contagem, soma_v, soma_p, soma_ar) de uma lista de registros."""
    n = 0
    sv = sp = sar = 0.0
    for r in records:
        n += 1
        sv += r["v"]
        sp += r["p"]
        sar += r["ar"]
    return n, sv, sp, sar


def split_detailed(
    detailed_dict: Dict[str, Any],
    output_dir: Path,
    aggregated_valor_total: float | None = None,
    verbose: bool = True,
) -> Tuple[bool, Dict[str, Any]]:
    """
    Escreve detailed_regional.json + detailed_municipio_<ano>.json a partir do
    dict detailed em memoria e roda a verificacao de integridade lendo os
    arquivos de volta do disco.

    Returns (ok, report). ok=False se qualquer contagem/soma divergir.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    map_data = detailed_dict.get("mapData", [])
    by_regional = detailed_dict.get("byAnoProdutoRegional", [])
    by_municipio = detailed_dict.get("byAnoProdutoMunicipio", [])

    # --- Referencias independentes calculadas do ORIGINAL em memoria ---
    orig_n, orig_v, orig_p, orig_ar = _sum_fields(by_municipio)
    reg_n, reg_v, _, _ = _sum_fields(by_regional)
    map_n, map_v, _, _ = _sum_fields(map_data)

    # --- 1. Arquivo regional (mapData + byAnoProdutoRegional) ---
    regional_path = output_dir / "detailed_regional.json"
    with open(regional_path, "w", encoding="utf-8") as f:
        json.dump(
            {"mapData": map_data, "byAnoProdutoRegional": by_regional},
            f,
            ensure_ascii=False,
        )

    # --- 2. Fatias municipais por ano ---
    groups = defaultdict(list)
    for rec in by_municipio:
        groups[rec["a"]].append(rec)

    years = sorted(groups.keys())
    for year in years:
        slice_path = output_dir / f"detailed_municipio_{year}.json"
        with open(slice_path, "w", encoding="utf-8") as f:
            json.dump(groups[year], f, ensure_ascii=False)

    # --- 3. Verificacao: reler as fatias do disco e re-somar ---
    per_year = {}
    read_n = 0
    read_v = read_p = read_ar = 0.0
    for year in years:
        slice_path = output_dir / f"detailed_municipio_{year}.json"
        with open(slice_path, "r", encoding="utf-8") as f:
            recs = json.load(f)
        n, sv, sp, sar = _sum_fields(recs)
        per_year[year] = {"n": n, "v": sv, "p": sp, "ar": sar}
        read_n += n
        read_v += sv
        read_p += sp
        read_ar += sar

    # Reler o regional do disco (garante round-trip / encoding)
    with open(regional_path, "r", encoding="utf-8") as f:
        regional_disk = json.load(f)
    disk_map_n, disk_map_v, _, _ = _sum_fields(regional_disk.get("mapData", []))
    disk_reg_n, disk_reg_v, _, _ = _sum_fields(
        regional_disk.get("byAnoProdutoRegional", [])
    )

    # --- 4. Checagens ---
    checks = []

    def check(name: str, condition: bool, detail: str = ""):
        checks.append((name, bool(condition), detail))

    # Contagens municipais: fatias == original
    check(
        "municipio: contagem fatias == original",
        read_n == orig_n,
        f"fatias={read_n:,} original={orig_n:,}",
    )
    # Somas municipais exatas (v/p/ar sao ints no detailed)
    check(
        "municipio: soma v fatias == original",
        read_v == orig_v,
        f"fatias={read_v:,.0f} original={orig_v:,.0f}",
    )
    check(
        "municipio: soma p fatias == original",
        read_p == orig_p,
        f"fatias={read_p:,.0f} original={orig_p:,.0f}",
    )
    check(
        "municipio: soma ar fatias == original",
        read_ar == orig_ar,
        f"fatias={read_ar:,.0f} original={orig_ar:,.0f}",
    )
    # Regional round-trip
    check(
        "regional: mapData round-trip",
        disk_map_n == map_n and disk_map_v == map_v,
        f"disco n={disk_map_n:,} v={disk_map_v:,.0f} / mem n={map_n:,} v={map_v:,.0f}",
    )
    check(
        "regional: byAnoProdutoRegional round-trip",
        disk_reg_n == reg_n and disk_reg_v == reg_v,
        f"disco n={disk_reg_n:,} v={disk_reg_v:,.0f} / mem n={reg_n:,} v={reg_v:,.0f}",
    )

    # Cross-check das tres visoes de v (municipio vs regional vs mapData):
    # devem coincidir a menos de arredondamento a int (tolerancia relativa).
    base = max(abs(orig_v), 1.0)
    check(
        "cross: v municipio ~= v regional",
        abs(orig_v - reg_v) / base <= REL_TOL,
        f"mun={orig_v:,.0f} reg={reg_v:,.0f} diff={orig_v - reg_v:,.0f}",
    )
    check(
        "cross: v municipio ~= v mapData",
        abs(orig_v - map_v) / base <= REL_TOL,
        f"mun={orig_v:,.0f} map={map_v:,.0f} diff={orig_v - map_v:,.0f}",
    )

    # Cross-check com aggregated metadata.valorTotal
    if aggregated_valor_total is not None:
        diff = abs(orig_v - aggregated_valor_total)
        check(
            "cross: v municipio ~= aggregated valorTotal",
            diff / max(abs(aggregated_valor_total), 1.0) <= REL_TOL,
            f"mun={orig_v:,.0f} agg={aggregated_valor_total:,.2f} diff={diff:,.2f}",
        )

    ok = all(c[1] for c in checks)

    # --- 5. Relatorio ---
    if verbose:
        print("=" * 68)
        print("Fatiamento detailed.json -> regional + fatias municipais por ano")
        print("=" * 68)
        print(f"detailed_regional.json: mapData={map_n:,} regs, "
              f"byAnoProdutoRegional={reg_n:,} regs")
        print(f"fatias municipais: {len(years)} anos "
              f"({years[0] if years else '-'}..{years[-1] if years else '-'})")
        print("-" * 68)
        print(f"{'ano':>6} {'registros':>12} {'soma v':>22}")
        print("-" * 68)
        for year in years:
            d = per_year[year]
            print(f"{year:>6} {d['n']:>12,} {d['v']:>22,.0f}")
        print("-" * 68)
        print(f"{'TOTAL':>6} {read_n:>12,} {read_v:>22,.0f}")
        print("=" * 68)

        # Amostra de encoding (municipios acentuados)
        sample = []
        for year in years:
            with open(output_dir / f"detailed_municipio_{year}.json",
                      "r", encoding="utf-8") as f:
                recs = json.load(f)
            for r in recs:
                nome = r.get("m", "")
                if any(ch in nome for ch in "ãâáàçéêíóôõúÃÂÁÀÇÉÊÍÓÔÕÚ"):
                    sample.append(nome)
                    break
            if len(sample) >= 3:
                break
        if sample:
            print("Amostra UTF-8 (municipios acentuados):", ", ".join(sample))
            print("=" * 68)

        print("\nVerificacao de integridade:")
        for name, passed, detail in checks:
            status = "OK  " if passed else "FALHA"
            line = f"  [{status}] {name}"
            if detail:
                line += f"  ({detail})"
            print(line)
        print()
        print("RESULTADO:", "INTEGRIDADE OK" if ok else "INTEGRIDADE FALHOU")

    report = {
        "ok": ok,
        "years": years,
        "per_year": per_year,
        "totals": {"n": read_n, "v": read_v, "p": read_p, "ar": read_ar},
        "regional": {"mapData_n": map_n, "byAnoProdutoRegional_n": reg_n},
        "checks": checks,
    }
    return ok, report


def main() -> int:
    detailed_path = OUTPUT_DIR / "detailed.json"
    aggregated_path = OUTPUT_DIR / "aggregated.json"

    if not detailed_path.exists():
        print(f"ERRO: nao encontrei {detailed_path}", file=sys.stderr)
        return 1

    with open(detailed_path, "r", encoding="utf-8") as f:
        detailed = json.load(f)

    valor_total = None
    if aggregated_path.exists():
        with open(aggregated_path, "r", encoding="utf-8") as f:
            agg = json.load(f)
        valor_total = agg.get("metadata", {}).get("valorTotal")

    ok, _ = split_detailed(detailed, OUTPUT_DIR, valor_total, verbose=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
