import json
import mimetypes
import sys
import uuid
from pathlib import Path
from typing import Dict, List, Tuple
from urllib import error, parse, request

BASE_DIR = Path(__file__).resolve().parent
API_BASE_URL = "http://localhost:8000"
PREDICT_URL = f"{API_BASE_URL}/predict/"
PREDICT_BOTH_URL = f"{API_BASE_URL}/predict/both/"
DEBUG_URL = f"{API_BASE_URL}/debug/pneumonia/"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
SOURCE_OPTIONS = {"1": "dataset", "2": "internet", "dataset": "dataset", "internet": "internet"}
MODEL_OPTIONS = {
    "1": "tb",
    "2": "pneumonia",
    "3": "both",
    "4": "debug",
    "tb": "tb",
    "pneumonia": "pneumonia",
    "both": "both",
    "debug": "debug",
}


def ask_choice(prompt: str, options: Dict[str, str]) -> str:
    while True:
        raw = input(prompt).strip().lower()
        if raw in options:
            return options[raw]
        print("Invalid selection. Please try again.")


def infer_actual_from_name(filename: str) -> str:
    lower = filename.lower()
    if lower.startswith("tb-"):
        return "tb"
    if lower.startswith("pneumonia-"):
        return "pneumonia"
    if lower.startswith("normal-"):
        return "normal"
    return "unknown"


def load_images(source_dir: Path, selected_model: str) -> List[Path]:
    files: List[Path] = []
    for item in sorted(source_dir.iterdir()):
        if not item.is_file() or item.suffix.lower() not in VALID_EXTENSIONS:
            continue

        actual = infer_actual_from_name(item.name)

        # Debug mode loads pneumonia + normal images only
        if selected_model == "debug" and actual not in {"pneumonia", "normal"}:
            continue
        if selected_model == "tb" and actual not in {"tb", "normal"}:
            continue
        if selected_model == "pneumonia" and actual not in {"pneumonia", "normal"}:
            continue
        if selected_model == "both" and actual not in {"tb", "pneumonia", "normal"}:
            continue

        files.append(item)
    return files


def build_multipart(file_path: Path, field_name: str = "file") -> Tuple[bytes, str]:
    boundary = f"----SehatBoundary{uuid.uuid4().hex}"
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()

    head = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"{field_name}\"; filename=\"{file_path.name}\"\r\n"
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    body = head + file_bytes + tail
    return body, boundary


def post_image(url: str, image_path: Path) -> Dict:
    body, boundary = build_multipart(image_path)
    req = request.Request(url=url, method="POST", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    req.add_header("Content-Length", str(len(body)))

    with request.urlopen(req, timeout=90) as resp:
        payload = resp.read().decode("utf-8")
        return json.loads(payload)


def call_single_model(image_path: Path, model: str) -> Tuple[str, float]:
    url = f"{PREDICT_URL}?{parse.urlencode({'model': model})}"
    data = post_image(url, image_path)
    result = str(data.get("result", "")).lower()
    confidence = float(data.get("confidence", 0.0))
    predicted = "normal" if result == "normal" else model
    return predicted, confidence


def call_both_model(image_path: Path) -> Tuple[str, float, str]:
    data = post_image(PREDICT_BOTH_URL, image_path)

    tb_data = data.get("tb", {})
    pn_data = data.get("pneumonia", {})

    tb_res = str(tb_data.get("result", "")).lower()
    pn_res = str(pn_data.get("result", "")).lower()
    tb_conf = float(tb_data.get("confidence", 0.0))
    pn_conf = float(pn_data.get("confidence", 0.0))

    if tb_res == "positive" and pn_res != "positive":
        return "tb", tb_conf, "tb"
    if pn_res == "positive" and tb_res != "positive":
        return "pneumonia", pn_conf, "pneumonia"
    if tb_res == "normal" and pn_res == "normal":
        return "normal", max(tb_conf, pn_conf), "normal"

    if tb_conf >= pn_conf:
        return "tb", tb_conf, "both-positive"
    return "pneumonia", pn_conf, "both-positive"


def call_debug(image_path: Path) -> Dict:
    """Call /debug/pneumonia/ and return raw score data."""
    data = post_image(DEBUG_URL, image_path)
    if not isinstance(data, dict):
        raise ValueError(f"Unexpected debug response type: {type(data).__name__}")
    return data


# ── Rendering ────────────────────────────────────────────────────────────────

def render_table(rows: List[Dict[str, str]]) -> None:
    headers = ["#", "File", "Model", "Actual", "Predicted", "Confidence", "Correct", "Notes"]
    col_widths = [len(h) for h in headers]

    str_rows = []
    for row in rows:
        vals = [
            str(row["index"]),
            row["file"],
            row["model"],
            row["actual"],
            row["predicted"],
            row["confidence"],
            row["correct"],
            row["notes"],
        ]
        str_rows.append(vals)
        for i, val in enumerate(vals):
            col_widths[i] = max(col_widths[i], len(val))

    def fmt_line(values: List[str]) -> str:
        return " | ".join(v.ljust(col_widths[i]) for i, v in enumerate(values))

    divider = "-+-".join("-" * w for w in col_widths)
    print("\n" + fmt_line(headers))
    print(divider)
    for vals in str_rows:
        print(fmt_line(vals))


def render_debug_table(rows: List[Dict[str, str]]) -> None:
    """Render debug-specific table with raw score and threshold columns."""
    headers = ["#", "File", "Actual", "Raw Score", "Threshold", "Decision", "Correct", "Diagnosis"]
    col_widths = [len(h) for h in headers]

    str_rows = []
    for row in rows:
        vals = [
            str(row["index"]),
            row["file"],
            row["actual"],
            row["raw_score"],
            row["threshold"],
            row["decision"],
            row["correct"],
            row["diagnosis"],
        ]
        str_rows.append(vals)
        for i, val in enumerate(vals):
            col_widths[i] = max(col_widths[i], len(val))

    def fmt_line(values: List[str]) -> str:
        return " | ".join(v.ljust(col_widths[i]) for i, v in enumerate(values))

    divider = "-+-".join("-" * w for w in col_widths)
    print("\n" + fmt_line(headers))
    print(divider)
    for vals in str_rows:
        print(fmt_line(vals))


def diagnose_score(raw_score: float, threshold: float, actual: str) -> str:
    """
    Give a human-readable diagnosis of why a prediction may be wrong.
    Helps identify whether the issue is threshold, domain shift, or correct.
    """
    expected_positive = actual == "pneumonia"
    is_positive = raw_score >= threshold

    if expected_positive and not is_positive:
        # Should be pneumonia but predicted normal
        if raw_score >= 0.45:
            return "threshold too high — lower it"
        elif raw_score >= 0.30:
            return "weak signal — domain shift likely"
        else:
            return "very low score — strong domain shift"
    elif not expected_positive and is_positive:
        # Should be normal but predicted pneumonia
        if raw_score <= 0.80:
            return "threshold too low for this image"
        else:
            return "false positive — model over-triggers"
    else:
        return "correct"


def render_debug_summary(rows: List[Dict[str, str]], threshold: float) -> None:
    """Print threshold calibration advice based on collected raw scores."""
    pneumonia_rows = [r for r in rows if r["actual"] == "pneumonia" and r["raw_score"] != "ERROR"]
    normal_rows = [r for r in rows if r["actual"] == "normal" and r["raw_score"] != "ERROR"]

    def safe_scores(subset):
        scores = []
        for r in subset:
            try:
                scores.append(float(r["raw_score"]))
            except ValueError:
                pass
        return scores

    pn_scores = safe_scores(pneumonia_rows)
    nm_scores = safe_scores(normal_rows)

    print("\n── Threshold Calibration Insight ──────────────────────────────────")
    print(f"  Current threshold : {threshold:.4f}")

    if pn_scores:
        print(f"  Pneumonia images  : n={len(pn_scores)}, "
              f"min={min(pn_scores):.4f}, max={max(pn_scores):.4f}, "
              f"avg={sum(pn_scores)/len(pn_scores):.4f}")

    if nm_scores:
        print(f"  Normal images     : n={len(nm_scores)}, "
              f"min={min(nm_scores):.4f}, max={max(nm_scores):.4f}, "
              f"avg={sum(nm_scores)/len(nm_scores):.4f}")

    # Simple suggestion: ideal threshold sits between avg normal and avg pneumonia scores
    if pn_scores and nm_scores:
        avg_pn = sum(pn_scores) / len(pn_scores)
        avg_nm = sum(nm_scores) / len(nm_scores)
        suggested = round((avg_pn + avg_nm) / 2, 3)
        print(f"\n  Suggested threshold (midpoint): {suggested}")
        print(f"  → Update best_threshold in model_config.json to {suggested}")
    elif pn_scores:
        avg_pn = sum(pn_scores) / len(pn_scores)
        print(f"\n  Only pneumonia samples tested. Avg score = {avg_pn:.4f}")
        print(f"  → If these are being missed, try threshold = {round(avg_pn * 0.85, 3)}")

    # Count threshold-related misses
    threshold_misses = [r for r in rows if "threshold too high" in r.get("diagnosis", "")]
    domain_misses = [r for r in rows if "domain shift" in r.get("diagnosis", "")]

    if threshold_misses:
        print(f"\n  ⚠️  {len(threshold_misses)} image(s) missed due to threshold being too high")
    if domain_misses:
        print(f"  ⚠️  {len(domain_misses)} image(s) show possible domain shift (low raw scores)")
    print("────────────────────────────────────────────────────────────────────")


def count_labels(rows: List[Dict[str, str]], key: str) -> Dict[str, int]:
    counts = {"normal": 0, "tb": 0, "pneumonia": 0, "error": 0}
    for row in rows:
        value = row.get(key, "").lower()
        if value in counts:
            counts[value] += 1
    return counts


# ── Main ─────────────────────────────────────────────────────────────────────

def run_debug_mode(images: List[Path], source: str) -> None:
    """Run debug mode — calls /debug/pneumonia/ and renders raw score table."""
    print(f"\nRunning DEBUG on {len(images)} image(s) from '{source}'...")
    print("Calls /debug/pneumonia/ — no DB saves, no validator, raw scores only.\n")

    rows: List[Dict[str, str]] = []
    last_threshold = 0.70  # fallback if API doesn't return it

    for idx, image_path in enumerate(images, start=1):
        actual = infer_actual_from_name(image_path.name)

        try:
            data = call_debug(image_path)

            raw_score = float(data.get("raw_score", 0.0))
            threshold = float(data.get("threshold", 0.70))
            decision = str(data.get("decision", "UNKNOWN")).upper()
            last_threshold = threshold

            # Map decision to comparable label
            predicted = "pneumonia" if decision == "PNEUMONIA" else "normal"
            is_correct = predicted == actual

            diagnosis = diagnose_score(raw_score, threshold, actual)

            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "actual": actual,
                "raw_score": f"{raw_score:.4f}",
                "threshold": f"{threshold:.4f}",
                "decision": decision,
                "correct": "YES" if is_correct else "NO",
                "diagnosis": diagnosis,
            })

        except error.HTTPError as e:
            try:
                body = e.read().decode("utf-8", errors="ignore")
            except Exception:
                body = str(e)
            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "actual": actual,
                "raw_score": "ERROR",
                "threshold": f"{last_threshold:.4f}",
                "decision": "ERROR",
                "correct": "NO",
                "diagnosis": f"HTTP {e.code}: {body[:60]}",
            })
        except Exception as e:
            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "actual": actual,
                "raw_score": "ERROR",
                "threshold": f"{last_threshold:.4f}",
                "decision": "ERROR",
                "correct": "NO",
                "diagnosis": f"Error: {str(e)[:60]}",
            })

    render_debug_table(rows)

    # Summary
    total = len(rows)
    correct = sum(1 for r in rows if r["correct"] == "YES")
    accuracy = (correct / total * 100) if total else 0.0

    print(f"\nSummary")
    print(f"Source          : {source}")
    print(f"Total tested    : {total}")
    print(f"Correct         : {correct}")
    print(f"Accuracy        : {accuracy:.2f}%")

    render_debug_summary(rows, last_threshold)


def run_normal_mode(images: List[Path], selected_model: str, source: str) -> None:
    """Run normal prediction mode (tb / pneumonia / both)."""
    print(f"\nRunning tests on {len(images)} image(s) from '{source}' with selection '{selected_model}'...")

    rows: List[Dict[str, str]] = []
    total = 0
    correct = 0

    for idx, image_path in enumerate(images, start=1):
        actual = infer_actual_from_name(image_path.name)
        total += 1

        try:
            if selected_model in {"tb", "pneumonia"}:
                predicted, conf = call_single_model(image_path, selected_model)
                note = ""
                model_used = selected_model
            else:
                predicted, conf, note = call_both_model(image_path)
                model_used = "both"

            is_correct = predicted == actual
            if is_correct:
                correct += 1

            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "model": model_used,
                "actual": actual,
                "predicted": predicted,
                "confidence": f"{conf * 100:.2f}%",
                "correct": "YES" if is_correct else "NO",
                "notes": note,
            })

        except error.HTTPError as e:
            try:
                body = e.read().decode("utf-8", errors="ignore")
            except Exception:
                body = str(e)
            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "model": selected_model,
                "actual": actual,
                "predicted": "ERROR",
                "confidence": "0.00%",
                "correct": "NO",
                "notes": f"HTTP {e.code}: {body[:80]}",
            })
        except Exception as e:
            rows.append({
                "index": str(idx),
                "file": image_path.name,
                "model": selected_model,
                "actual": actual,
                "predicted": "ERROR",
                "confidence": "0.00%",
                "correct": "NO",
                "notes": f"Error: {str(e)[:80]}",
            })

    render_table(rows)

    accuracy = (correct / total) * 100 if total else 0.0
    actual_counts = count_labels(rows, "actual")
    predicted_counts = count_labels(rows, "predicted")

    print("\nSummary")
    print(f"Selected source      : {source}")
    print(f"Selected model       : {selected_model}")
    print(f"Total images tested  : {total}")
    print(f"Correct predictions  : {correct}")
    print(f"Actual percentage    : {accuracy:.2f}%")
    print(f"Normal count         : actual={actual_counts['normal']} | predicted={predicted_counts['normal']}")
    print(f"Actual count         : tb={actual_counts['tb']}, pneumonia={actual_counts['pneumonia']}, normal={actual_counts['normal']}")
    print(f"Predicted count      : tb={predicted_counts['tb']}, pneumonia={predicted_counts['pneumonia']}, normal={predicted_counts['normal']}, error={predicted_counts['error']}")


def main() -> None:
    print("Select test image source:")
    print("1) dataset")
    print("2) internet")
    source = ask_choice("Enter choice (1/2 or name): ", SOURCE_OPTIONS)

    print("\nSelect model test type:")
    print("1) tb")
    print("2) pneumonia")
    print("3) both")
    print("4) debug  ← raw scores, threshold calibration, no DB saves")
    selected_model = ask_choice("Enter choice (1/2/3/4 or name): ", MODEL_OPTIONS)

    source_dir = BASE_DIR / source
    if not source_dir.exists() or not source_dir.is_dir():
        print(f"Source directory not found: {source_dir}")
        sys.exit(1)

    images = load_images(source_dir, selected_model)
    if not images:
        print(f"No matching images found in {source_dir} for model selection '{selected_model}'.")
        print("For debug mode, images must be named: pneumonia-*.jpg or normal-*.jpg")
        sys.exit(1)

    if selected_model == "debug":
        run_debug_mode(images, source)
    else:
        run_normal_mode(images, selected_model, source)


if __name__ == "__main__":
    main()

# import json
# import mimetypes
# import sys
# import uuid
# from pathlib import Path
# from typing import Dict, List, Tuple
# from urllib import error, parse, request

# BASE_DIR = Path(__file__).resolve().parent
# API_BASE_URL = "http://localhost:8000"
# PREDICT_URL = f"{API_BASE_URL}/predict/"
# PREDICT_BOTH_URL = f"{API_BASE_URL}/predict/both/"

# VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
# SOURCE_OPTIONS = {"1": "dataset", "2": "internet", "dataset": "dataset", "internet": "internet"}
# MODEL_OPTIONS = {"1": "tb", "2": "pneumonia", "3": "both", "tb": "tb", "pneumonia": "pneumonia", "both": "both"}


# def ask_choice(prompt: str, options: Dict[str, str]) -> str:
#     while True:
#         raw = input(prompt).strip().lower()
#         if raw in options:
#             return options[raw]
#         print("Invalid selection. Please try again.")


# def infer_actual_from_name(filename: str) -> str:
#     lower = filename.lower()
#     if lower.startswith("tb-"):
#         return "tb"
#     if lower.startswith("pneumonia-"):
#         return "pneumonia"
#     if lower.startswith("normal-"):
#         return "normal"
#     return "unknown"


# def load_images(source_dir: Path, selected_model: str) -> List[Path]:
#     files: List[Path] = []
#     for item in sorted(source_dir.iterdir()):
#         if not item.is_file() or item.suffix.lower() not in VALID_EXTENSIONS:
#             continue

#         actual = infer_actual_from_name(item.name)
#         if selected_model == "tb" and actual not in {"tb", "normal"}:
#             continue
#         if selected_model == "pneumonia" and actual not in {"pneumonia", "normal"}:
#             continue
#         if selected_model == "both" and actual not in {"tb", "pneumonia", "normal"}:
#             continue

#         files.append(item)
#     return files


# def build_multipart(file_path: Path, field_name: str = "file") -> Tuple[bytes, str]:
#     boundary = f"----SehatBoundary{uuid.uuid4().hex}"
#     mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
#     file_bytes = file_path.read_bytes()

#     head = (
#         f"--{boundary}\r\n"
#         f"Content-Disposition: form-data; name=\"{field_name}\"; filename=\"{file_path.name}\"\r\n"
#         f"Content-Type: {mime_type}\r\n\r\n"
#     ).encode("utf-8")
#     tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
#     body = head + file_bytes + tail
#     return body, boundary


# def post_image(url: str, image_path: Path) -> Dict:
#     body, boundary = build_multipart(image_path)
#     req = request.Request(url=url, method="POST", data=body)
#     req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
#     req.add_header("Content-Length", str(len(body)))

#     with request.urlopen(req, timeout=90) as resp:
#         payload = resp.read().decode("utf-8")
#         return json.loads(payload)


# def call_single_model(image_path: Path, model: str) -> Tuple[str, float]:
#     url = f"{PREDICT_URL}?{parse.urlencode({'model': model})}"
#     data = post_image(url, image_path)
#     result = str(data.get("result", "")).lower()
#     confidence = float(data.get("confidence", 0.0))
#     predicted = "normal" if result == "normal" else model
#     return predicted, confidence


# def call_both_model(image_path: Path) -> Tuple[str, float, str]:
#     data = post_image(PREDICT_BOTH_URL, image_path)

#     tb_data = data.get("tb", {})
#     pn_data = data.get("pneumonia", {})

#     tb_res = str(tb_data.get("result", "")).lower()
#     pn_res = str(pn_data.get("result", "")).lower()
#     tb_conf = float(tb_data.get("confidence", 0.0))
#     pn_conf = float(pn_data.get("confidence", 0.0))

#     if tb_res == "positive" and pn_res != "positive":
#         return "tb", tb_conf, "tb"
#     if pn_res == "positive" and tb_res != "positive":
#         return "pneumonia", pn_conf, "pneumonia"
#     if tb_res == "normal" and pn_res == "normal":
#         return "normal", max(tb_conf, pn_conf), "normal"

#     if tb_conf >= pn_conf:
#         return "tb", tb_conf, "both-positive"
#     return "pneumonia", pn_conf, "both-positive"


# def render_table(rows: List[Dict[str, str]]) -> None:
#     headers = ["#", "File", "Model", "Actual", "Predicted", "Confidence", "Correct", "Notes"]
#     col_widths = [len(h) for h in headers]

#     str_rows = []
#     for row in rows:
#         vals = [
#             str(row["index"]),
#             row["file"],
#             row["model"],
#             row["actual"],
#             row["predicted"],
#             row["confidence"],
#             row["correct"],
#             row["notes"],
#         ]
#         str_rows.append(vals)
#         for i, val in enumerate(vals):
#             col_widths[i] = max(col_widths[i], len(val))

#     def fmt_line(values: List[str]) -> str:
#         return " | ".join(v.ljust(col_widths[i]) for i, v in enumerate(values))

#     divider = "-+-".join("-" * w for w in col_widths)
#     print("\n" + fmt_line(headers))
#     print(divider)
#     for vals in str_rows:
#         print(fmt_line(vals))


# def count_labels(rows: List[Dict[str, str]], key: str) -> Dict[str, int]:
#     counts = {"normal": 0, "tb": 0, "pneumonia": 0, "error": 0}
#     for row in rows:
#         value = row.get(key, "").lower()
#         if value in counts:
#             counts[value] += 1
#     return counts


# def main() -> None:
#     print("Select test image source:")
#     print("1) dataset")
#     print("2) internet")
#     source = ask_choice("Enter choice (1/2 or name): ", SOURCE_OPTIONS)

#     print("\nSelect model test type:")
#     print("1) tb")
#     print("2) pneumonia")
#     print("3) both")
#     selected_model = ask_choice("Enter choice (1/2/3 or name): ", MODEL_OPTIONS)

#     source_dir = BASE_DIR / source
#     if not source_dir.exists() or not source_dir.is_dir():
#         print(f"Source directory not found: {source_dir}")
#         sys.exit(1)

#     images = load_images(source_dir, selected_model)
#     if not images:
#         print(f"No matching images found in {source_dir} for model selection '{selected_model}'.")
#         sys.exit(1)

#     print(f"\nRunning tests on {len(images)} image(s) from '{source}' with selection '{selected_model}'...")

#     rows: List[Dict[str, str]] = []
#     total = 0
#     correct = 0

#     for idx, image_path in enumerate(images, start=1):
#         actual = infer_actual_from_name(image_path.name)
#         total += 1

#         try:
#             if selected_model in {"tb", "pneumonia"}:
#                 predicted, conf = call_single_model(image_path, selected_model)
#                 note = ""
#                 model_used = selected_model
#             else:
#                 predicted, conf, note = call_both_model(image_path)
#                 model_used = "both"

#             is_correct = predicted == actual
#             if is_correct:
#                 correct += 1

#             rows.append(
#                 {
#                     "index": str(idx),
#                     "file": image_path.name,
#                     "model": model_used,
#                     "actual": actual,
#                     "predicted": predicted,
#                     "confidence": f"{conf * 100:.2f}%",
#                     "correct": "YES" if is_correct else "NO",
#                     "notes": note,
#                 }
#             )
#         except error.HTTPError as e:
#             try:
#                 body = e.read().decode("utf-8", errors="ignore")
#             except Exception:
#                 body = str(e)
#             rows.append(
#                 {
#                     "index": str(idx),
#                     "file": image_path.name,
#                     "model": selected_model,
#                     "actual": actual,
#                     "predicted": "ERROR",
#                     "confidence": "0.00%",
#                     "correct": "NO",
#                     "notes": f"HTTP {e.code}: {body[:80]}",
#                 }
#             )
#         except Exception as e:
#             rows.append(
#                 {
#                     "index": str(idx),
#                     "file": image_path.name,
#                     "model": selected_model,
#                     "actual": actual,
#                     "predicted": "ERROR",
#                     "confidence": "0.00%",
#                     "correct": "NO",
#                     "notes": f"Error: {str(e)[:80]}",
#                 }
#             )

#     render_table(rows)

#     accuracy = (correct / total) * 100 if total else 0.0
#     actual_counts = count_labels(rows, "actual")
#     predicted_counts = count_labels(rows, "predicted")

#     print("\nSummary")
#     print(f"Selected source      : {source}")
#     print(f"Selected model       : {selected_model}")
#     print(f"Total images tested  : {total}")
#     print(f"Correct predictions  : {correct}")
#     print(f"Actual percentage    : {accuracy:.2f}%")
#     print(
#         f"Normal count         : actual={actual_counts['normal']} | predicted={predicted_counts['normal']}"
#     )
#     print(
#         f"Actual count         : tb={actual_counts['tb']}, pneumonia={actual_counts['pneumonia']}, normal={actual_counts['normal']}"
#     )
#     print(
#         f"Predicted count      : tb={predicted_counts['tb']}, pneumonia={predicted_counts['pneumonia']}, normal={predicted_counts['normal']}, error={predicted_counts['error']}"
#     )


# if __name__ == "__main__":
#     main()
