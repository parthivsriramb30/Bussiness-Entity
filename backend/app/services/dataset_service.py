import os
import csv
import json
import uuid
import hashlib
import zipfile
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

from app.config import settings
from app.db.database import get_db_ctx
from app.schemas.dataset import DatasetValidationResult, TSVFileStats, DatasetInfo

EXPECTED_FILES = {
    "train_source1": ("train/train_source1.tsv", ["entity_id", "business_name", "business_address", "country"]),
    "train_source2": ("train/train_source2.tsv", ["entity_id", "business_name", "business_address", "country"]),
    "train_source3": ("train/train_source3.tsv", ["entity_id", "business_name", "business_address", "country"]),
    "train_ground_truth": ("train/train_ground_truth.tsv", ["source1_entity_id", "matched_entity_ids"]),
    "test_source1": ("test/test_source1.tsv", ["entity_id", "business_name", "business_address", "country"]),
    "test_source2": ("test/test_source2.tsv", ["entity_id", "business_name", "business_address", "country"]),
    "test_source3": ("test/test_source3.tsv", ["entity_id", "business_name", "business_address", "country"]),
}


class DatasetService:
    @staticmethod
    def inspect_tsv_file(file_path: Path, expected_cols: List[str]) -> TSVFileStats:
        """
        Inspect a single TSV file for size, header correctness, row count, and placeholder status.
        """
        if not file_path.exists():
            return TSVFileStats(
                name=file_path.name,
                exists=False,
                size_bytes=0,
                size_mb=0.0,
                row_count=0,
                is_placeholder=False,
                missing_fields_count=0,
                has_valid_header=False,
                sample_preview=[]
            )

        size_bytes = file_path.stat().st_size
        size_mb = round(size_bytes / (1024 * 1024), 2)
        
        # Check header and scan first rows
        has_valid_header = False
        row_count = 0
        missing_count = 0
        samples = []
        is_placeholder = False

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                header_line = f.readline().strip()
                if header_line:
                    cols = [c.strip().lower() for c in header_line.split("\t")]
                    has_valid_header = (cols == [c.lower() for c in expected_cols])
                
                reader = csv.reader(f, delimiter="\t")
                for row in reader:
                    if not row or not any(row):
                        continue
                    row_count += 1
                    if len(row) < len(expected_cols) or any(not c.strip() for c in row):
                        missing_count += 1
                    if len(samples) < 5:
                        sample_dict = {}
                        for i, col in enumerate(expected_cols):
                            sample_dict[col] = row[i] if i < len(row) else ""
                        samples.append(sample_dict)

                    if row_count >= 1000:
                        break

            if row_count >= 1000:
                # Fast binary newline count for entire file
                with open(file_path, "rb") as bf:
                    buf_size = 2 * 1024 * 1024
                    lines = sum(chunk.count(b"\n") for chunk in iter(lambda: bf.read(buf_size), b""))
                    row_count = max(0, lines - 1)

            # Placeholder detection rule:
            # If 0 data rows or file size < 150 bytes, it is a header-only placeholder!
            if row_count == 0 or size_bytes < 150:
                is_placeholder = True

        except Exception as e:
            print(f"Error inspecting {file_path}: {e}")
            if size_bytes < 150:
                is_placeholder = True

        return TSVFileStats(
            name=file_path.name,
            exists=True,
            size_bytes=size_bytes,
            size_mb=size_mb,
            row_count=row_count,
            is_placeholder=is_placeholder,
            missing_fields_count=missing_count,
            has_valid_header=has_valid_header,
            sample_preview=samples
        )

    @staticmethod
    def validate_dataset_directory(dir_path: Path) -> DatasetValidationResult:
        """
        Validate all 7 TSV files in a dataset directory.
        Detects header-only placeholders, schema anomalies, and country distribution.
        """
        files_stats: Dict[str, TSVFileStats] = {}
        errors: List[str] = []
        warnings: List[str] = []
        is_placeholder_detected = False
        total_train = 0
        total_test = 0
        countries_detected = set()

        # Search for files directly under dir_path or under nested folders
        for key, (rel_path, expected_cols) in EXPECTED_FILES.items():
            candidate = dir_path / rel_path
            if not candidate.exists():
                # Try finding in root or subdirectories
                matches = list(dir_path.rglob(Path(rel_path).name))
                if matches:
                    candidate = matches[0]
            
            stats = DatasetService.inspect_tsv_file(candidate, expected_cols)
            files_stats[key] = stats
            
            if not stats.exists:
                errors.append(f"Missing required file: {rel_path}")
            elif stats.is_placeholder:
                is_placeholder_detected = True
                errors.append(f"Header-only placeholder detected in {rel_path} ({stats.size_bytes} bytes). Real data required.")
            elif not stats.has_valid_header:
                errors.append(f"Invalid schema/header in {rel_path}. Expected: {expected_cols}")
            
            if "train" in key and stats.exists and not stats.is_placeholder:
                if "source1" in key:
                    total_train = stats.row_count
            elif "test" in key and stats.exists and not stats.is_placeholder:
                if "source1" in key:
                    total_test = stats.row_count

        # Check country coverage in test_source1 and train_source1
        for key in ["train_source1", "test_source1"]:
            stats = files_stats.get(key)
            if stats and stats.exists and not stats.is_placeholder:
                sample_file = dir_path / EXPECTED_FILES[key][0]
                if not sample_file.exists():
                    matches = list(dir_path.rglob(Path(EXPECTED_FILES[key][0]).name))
                    if matches:
                        sample_file = matches[0]
                try:
                    with open(sample_file, "r", encoding="utf-8", errors="replace") as f:
                        reader = csv.reader(f, delimiter="\t")
                        next(reader, None)
                        for i, r in enumerate(reader):
                            if len(r) >= 4 and r[3].strip():
                                countries_detected.add(r[3].strip())
                            if i > 5000:
                                break
                except Exception:
                    pass

        has_france = "France" in countries_detected or "FRANCE" in countries_detected or "france" in countries_detected

        if is_placeholder_detected:
            status = "placeholder"
            message = "Dataset missing: Header-only placeholders detected. Real dataset files required."
        elif errors:
            status = "incomplete"
            message = f"Dataset validation failed: {len(errors)} error(s) found."
        else:
            status = "ready"
            message = "Dataset validated successfully. All 7 files present with valid schemas and data."

        return DatasetValidationResult(
            status=status,
            message=message,
            is_placeholder_detected=is_placeholder_detected,
            files=files_stats,
            total_train_rows=total_train,
            total_test_rows=total_test,
            countries_detected=sorted(list(countries_detected)),
            has_france=has_france,
            warnings=warnings,
            errors=errors
        )

    @staticmethod
    def register_directory(dir_path: Path, name: str = None) -> DatasetInfo:
        """
        Register a dataset folder into the database after validating.
        """
        if not dir_path.exists():
            raise FileNotFoundError(f"Path does not exist: {dir_path}")

        res = DatasetService.validate_dataset_directory(dir_path)
        ds_id = str(uuid.uuid4())[:8]
        ds_name = name or dir_path.name
        
        record_counts = {k: v.row_count for k, v in res.files.items()}
        country_counts = {c: 1 for c in res.countries_detected}

        with get_db_ctx() as conn:
            # Set other datasets inactive if this is ready
            is_active = 1 if res.status == "ready" else 0
            if is_active:
                conn.execute("UPDATE datasets SET is_active = 0")
                
            conn.execute("""
                INSERT INTO datasets (
                    id, name, path, status, train_records, test_records,
                    record_counts_json, country_counts_json, validation_errors_json, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ds_id, ds_name, str(dir_path.resolve()), res.status,
                res.total_train_rows, res.total_test_rows,
                json.dumps(record_counts), json.dumps(country_counts),
                json.dumps(res.errors), is_active
            ))

        return DatasetInfo(
            id=ds_id,
            name=ds_name,
            path=str(dir_path.resolve()),
            status=res.status,
            train_records=res.total_train_rows,
            test_records=res.total_test_rows,
            record_counts=record_counts,
            country_counts=country_counts,
            validation_errors=res.errors,
            is_active=bool(is_active)
        )

    @staticmethod
    def get_all_datasets() -> List[DatasetInfo]:
        with get_db_ctx() as conn:
            rows = conn.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
            datasets = []
            for r in rows:
                datasets.append(DatasetInfo(
                    id=r["id"],
                    name=r["name"],
                    path=r["path"],
                    status=r["status"],
                    checksum=r["checksum"],
                    train_records=r["train_records"],
                    test_records=r["test_records"],
                    record_counts=json.loads(r["record_counts_json"] or "{}"),
                    country_counts=json.loads(r["country_counts_json"] or "{}"),
                    validation_errors=json.loads(r["validation_errors_json"] or "[]"),
                    is_active=bool(r["is_active"]),
                    created_at=str(r["created_at"])
                ))
            return datasets

    @staticmethod
    def get_active_dataset() -> Optional[DatasetInfo]:
        datasets = DatasetService.get_all_datasets()
        for d in datasets:
            if d.is_active:
                return d
        return datasets[0] if datasets else None

    @staticmethod
    def set_active_dataset(dataset_id: str) -> bool:
        with get_db_ctx() as conn:
            conn.execute("UPDATE datasets SET is_active = 0")
            cur = conn.execute("UPDATE datasets SET is_active = 1 WHERE id = ?", (dataset_id,))
            return cur.rowcount > 0
