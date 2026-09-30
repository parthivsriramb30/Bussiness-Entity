import os
import sys
import zipfile
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any

from app.config import settings


class ExportService:
    @staticmethod
    def validate_run_outputs(
        matching_path: Path,
        candidate_path: Optional[Path],
        test_dir: Path,
        check_ids: bool = False
    ) -> Dict[str, Any]:
        """
        Run the challenge validator utils/validate_submission.py.
        """
        if not matching_path.exists():
            return {
                "passed": False,
                "exit_code": 1,
                "stdout": "",
                "stderr": f"Matching results file not found: {matching_path}",
                "errors": [f"Matching file missing: {matching_path}"],
                "warnings": []
            }

        cmd = [
            sys.executable,
            str(settings.VALIDATOR_PATH),
            "--matching", str(matching_path),
            "--test-dir", str(test_dir)
        ]
        if candidate_path and candidate_path.exists():
            cmd.extend(["--candidate", str(candidate_path)])
        if check_ids:
            cmd.append("--check-ids")

        proc = subprocess.run(
            cmd,
            cwd=str(settings.BASE_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        passed = (proc.returncode == 0)
        output = proc.stdout + "\n" + proc.stderr

        errors = []
        warnings = []
        for line in output.splitlines():
            line_str = line.strip()
            if line_str.startswith("FAIL"):
                errors.append(line_str)
            elif line_str.startswith("WARNING:"):
                warnings.append(line_str.replace("WARNING:", "").strip())
            elif line_str.startswith(("1.", "2.", "3.", "4.", "5.")):
                errors.append(line_str)

        return {
            "passed": passed,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "errors": errors,
            "warnings": warnings
        }

    @staticmethod
    def create_submission_archive(
        run_dir: Path,
        team_name: str = "EntityMatchTeam",
        dest_zip: Optional[Path] = None
    ) -> Path:
        """
        Package <team_name>_submission.zip according to the exact competition structure.
        """
        matching_file = run_dir / "matching_results.tsv"
        candidate_file = run_dir / "candidate_pairs.tsv"

        if not matching_file.exists():
            raise FileNotFoundError(f"Missing matching_results.tsv in {run_dir}")
        if not candidate_file.exists():
            raise FileNotFoundError(f"Missing candidate_pairs.tsv in {run_dir}")

        zip_name = f"{team_name}_submission.zip"
        target_zip = dest_zip or (run_dir / zip_name)

        src_dir = settings.ML_CODE_DIR / "src"

        with zipfile.ZipFile(target_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            # 1. Output files
            zf.write(matching_file, "output/matching_results.tsv")
            zf.write(candidate_file, "output/candidate_pairs.tsv")

            # 2. Reusable code & requirements
            readme_path = settings.ML_CODE_DIR / "README.md"
            reqs_path = settings.ML_CODE_DIR / "requirements.txt"
            if readme_path.exists():
                zf.write(readme_path, "code/business_entity_resolution/README.md")
            if reqs_path.exists():
                zf.write(reqs_path, "code/business_entity_resolution/requirements.txt")

            # 3. Model checkpoint
            model_path = settings.DEFAULT_MODEL_PATH
            if model_path.exists():
                zf.write(model_path, "code/business_entity_resolution/matcher_model.pkl")

            # 4. Source directory
            if src_dir.exists():
                for root, dirs, files in os.walk(src_dir):
                    if "__pycache__" in root:
                        continue
                    for file in files:
                        if file.endswith((".pyc", ".pyo")):
                            continue
                        f_path = Path(root) / file
                        arcname = Path("code/business_entity_resolution/src") / f_path.relative_to(src_dir)
                        zf.write(f_path, str(arcname).replace("\\", "/"))

            # 5. Standalone runner
            runner_script = settings.ML_CODE_DIR / "run_saved_model.py"
            if runner_script.exists():
                zf.write(runner_script, "code/business_entity_resolution/run_saved_model.py")

            # 6. Documentation Template
            doc_template = settings.DOCUMENTATION_TEMPLATE_PATH
            if doc_template.exists():
                zf.write(doc_template, "Documentation_template.md")

        return target_zip
