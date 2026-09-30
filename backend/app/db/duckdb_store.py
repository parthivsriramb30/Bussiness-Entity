import os
import json
import duckdb
from pathlib import Path
from typing import List, Dict, Any, Optional

class DuckDBStore:
    """
    Disk-backed DuckDB engine for large dataset queries, fast server-side pagination,
    and querying run-level scored candidate pairs with 21 pairwise features.
    """
    
    @staticmethod
    def query_tsv(
        tsv_path: Path,
        search_query: Optional[str] = None,
        country_filter: Optional[str] = None,
        offset: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Query any TSV file (train/test source) with server-side filtering and pagination.
        """
        if not tsv_path.exists():
            return {"total": 0, "rows": []}
            
        con = duckdb.connect(database=":memory:")
        safe_path = str(tsv_path).replace("\\", "/")
        
        where_clauses = []
        params = []
        
        if search_query:
            where_clauses.append("(entity_id ILIKE ? OR business_name ILIKE ? OR business_address ILIKE ?)")
            q = f"%{search_query}%"
            params.extend([q, q, q])
            
        if country_filter and country_filter.upper() != "ALL":
            where_clauses.append("country = ?")
            params.append(country_filter)
            
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        
        count_query = f"SELECT count(*) FROM read_csv('{safe_path}', delim='\\t', header=true, all_varchar=true) {where_sql}"
        total = con.execute(count_query, params).fetchone()[0]
        
        data_query = f"""
            SELECT * FROM read_csv('{safe_path}', delim='\\t', header=true, all_varchar=true)
            {where_sql}
            LIMIT {limit} OFFSET {offset}
        """
        df = con.execute(data_query, params).fetchdf()
        con.close()
        
        return {
            "total": int(total),
            "rows": df.to_dict(orient="records")
        }

    @staticmethod
    def get_run_duckdb_path(run_dir: Path) -> Path:
        return run_dir / "scored_candidates.duckdb"

    @staticmethod
    def init_run_store(run_dir: Path) -> str:
        db_path = DuckDBStore.get_run_duckdb_path(run_dir)
        con = duckdb.connect(str(db_path))
        con.execute("""
            CREATE TABLE IF NOT EXISTS scored_candidates (
                s1_id VARCHAR,
                s1_name VARCHAR,
                s1_addr VARCHAR,
                s1_country VARCHAR,
                cand_id VARCHAR,
                cand_name VARCHAR,
                cand_addr VARCHAR,
                cand_country VARCHAR,
                score DOUBLE,
                threshold DOUBLE,
                is_match BOOLEAN,
                features_json VARCHAR
            );
            CREATE INDEX IF NOT EXISTS idx_scored_s1 ON scored_candidates(s1_id);
            CREATE INDEX IF NOT EXISTS idx_scored_match ON scored_candidates(is_match);
        """)
        con.close()
        return str(db_path)

    @staticmethod
    def insert_scored_batch(run_dir: Path, records: List[Dict[str, Any]]):
        if not records:
            return
        db_path = DuckDBStore.get_run_duckdb_path(run_dir)
        con = duckdb.connect(str(db_path))
        con.executemany("""
            INSERT INTO scored_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                r["s1_id"],
                r.get("s1_name", ""),
                r.get("s1_addr", ""),
                r.get("s1_country", ""),
                r["cand_id"],
                r.get("cand_name", ""),
                r.get("cand_addr", ""),
                r.get("cand_country", ""),
                float(r["score"]),
                float(r["threshold"]),
                bool(r["is_match"]),
                json.dumps(r.get("features", {}))
            )
            for r in records
        ])
        con.close()

    @staticmethod
    def query_comparison(run_dir: Path, s1_id: str) -> Dict[str, Any]:
        """
        Retrieve all scored candidates for a Source 1 entity with complete 21 features.
        """
        db_path = DuckDBStore.get_run_duckdb_path(run_dir)
        if not db_path.exists():
            return {"s1_id": s1_id, "candidates": []}
            
        con = duckdb.connect(str(db_path))
        rows = con.execute("""
            SELECT s1_id, s1_name, s1_addr, s1_country, cand_id, cand_name, cand_addr, cand_country,
                   score, threshold, is_match, features_json
            FROM scored_candidates
            WHERE s1_id = ?
            ORDER BY score DESC
        """, [s1_id]).fetchall()
        con.close()
        
        candidates = []
        s1_info = {"s1_id": s1_id, "name": "", "address": "", "country": ""}
        
        for r in rows:
            s1_info["name"] = r[1]
            s1_info["address"] = r[2]
            s1_info["country"] = r[3]
            feats = json.loads(r[11]) if r[11] else {}
            candidates.append({
                "cand_id": r[4],
                "cand_name": r[5],
                "cand_addr": r[6],
                "cand_country": r[7],
                "score": round(float(r[8]), 4),
                "threshold": round(float(r[9]), 4),
                "is_match": bool(r[10]),
                "features": feats
            })
            
        return {
            "s1": s1_info,
            "candidates": candidates
        }
