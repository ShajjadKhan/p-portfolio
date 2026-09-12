"""
dwg_processor.py - High-Performance DWG & DXF CAD Processing Engine
Supports AutoCAD DWG (R12 - AutoCAD 2024) via LibreDWG and native DXF parsing.
"""

import json
import math
import os
import re
import subprocess
import tempfile
import uuid

# Map AutoCAD version string to human-readable name
AUTOCAD_VERSIONS = {
    "AC1032": "AutoCAD 2018 / 2021 / 2024",
    "AC1027": "AutoCAD 2013 / 2014 / 2015 / 2016 / 2017",
    "AC1024": "AutoCAD 2010 / 2011 / 2012",
    "AC1021": "AutoCAD 2007 / 2008 / 2009",
    "AC1018": "AutoCAD 2004 / 2005 / 2006",
    "AC1015": "AutoCAD 2000 / 2000i / 2002",
    "AC1014": "AutoCAD Release 14",
    "AC1012": "AutoCAD Release 13",
    "AC1009": "AutoCAD Release 11 / 12",
    "AC1006": "AutoCAD Release 10",
    "AC1004": "AutoCAD Release 9",
    "AC1002": "AutoCAD Release 2.5",
}

# Standard AutoCAD Color Index (ACI 1-255 common defaults)
ACI_COLORS = {
    1: "#ef4444",   # Red
    2: "#eab308",   # Yellow
    3: "#22c55e",   # Green
    4: "#06b6d4",   # Cyan
    5: "#3b82f6",   # Blue
    6: "#d946ef",   # Magenta
    7: "#ffffff",   # White / Black
    8: "#64748b",   # Dark Gray
    9: "#94a3b8",   # Light Gray
}

DEFAULT_PALETTE = [
    "#38bdf8", "#34d399", "#f59e0b", "#f43f5e",
    "#a855f7", "#ec4899", "#60a5fa", "#e2e8f0",
    "#fbbf24", "#4ade80", "#22d3ee", "#c084fc"
]


def get_libredwg_bin(name):
    """Find binary path for libredwg tools."""
    brew_path = f"/opt/homebrew/bin/{name}"
    if os.path.exists(brew_path):
        return brew_path
    usr_local = f"/usr/local/bin/{name}"
    if os.path.exists(usr_local):
        return usr_local
    return name


def aci_to_hex(aci):
    """Convert AutoCAD Color Index to hex string."""
    try:
        aci = int(aci)
        if aci in ACI_COLORS:
            return ACI_COLORS[aci]
        hue = ((aci * 137) % 360)
        return f"hsl({hue}, 70%, 60%)"
    except Exception:
        return "#38bdf8"


def parse_dwg_bytes(dwg_bytes, filename="drawing.dwg"):
    """
    Parse DWG bytes using libredwg (dwgread, dwglayers, dwg2dxf).
    Returns normalized CAD dictionary with extents, layers, entities, and stats.
    """
    header_str = dwg_bytes[:6].decode('latin1', errors='ignore')
    version_label = AUTOCAD_VERSIONS.get(header_str, f"AutoCAD DWG ({header_str})")

    with tempfile.TemporaryDirectory() as tmpdir:
        dwg_path = os.path.join(tmpdir, "input.dwg")
        dxf_path = os.path.join(tmpdir, "output.dxf")

        with open(dwg_path, "wb") as f:
            f.write(dwg_bytes)

        dwgread_bin = get_libredwg_bin("dwgread")
        dwglayers_bin = get_libredwg_bin("dwglayers")
        dwg2dxf_bin = get_libredwg_bin("dwg2dxf")

        # 1. Extract layer metadata
        layers_dict = {}
        try:
            res_layers = subprocess.run([dwglayers_bin, "-f", dwg_path], capture_output=True, text=True, timeout=12)
            idx = 0
            for line in res_layers.stdout.strip().splitlines():
                parts = line.strip().split()
                if not parts:
                    continue
                flags = parts[0] if len(parts) > 1 and len(parts[0]) <= 3 else ""
                layer_name = parts[-1]
                layers_dict[layer_name] = {
                    "name": layer_name,
                    "color": DEFAULT_PALETTE[idx % len(DEFAULT_PALETTE)] if layer_name != "0" else "#ffffff",
                    "visible": "-" not in flags,
                    "frozen": "f" in flags,
                    "locked": "l" in flags,
                    "count": 0
                }
                idx += 1
        except Exception:
            pass

        # 2. Extract geometry via GeoJSON
        entities = []
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = float('-inf'), float('-inf')
        stats = {"lines": 0, "circles": 0, "polylines": 0, "texts": 0, "arcs": 0, "total": 0}

        def update_bounds(x, y):
            nonlocal min_x, min_y, max_x, max_y
            if not math.isnan(x) and not math.isinf(x):
                min_x = min(min_x, x)
                max_x = max(max_x, x)
            if not math.isnan(y) and not math.isinf(y):
                min_y = min(min_y, y)
                max_y = max(max_y, y)

        palette_idx = 0
        try:
            res_json = subprocess.run([dwgread_bin, "-O", "GeoJSON", dwg_path], capture_output=True, text=True, timeout=18)
            stdout = res_json.stdout
            json_start = stdout.find('{')
            if json_start != -1:
                data = json.loads(stdout[json_start:])
                features = data.get("features", [])

                for feat in features:
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    layer_name = props.get("Layer", "0")

                    if layer_name not in layers_dict:
                        layers_dict[layer_name] = {
                            "name": layer_name,
                            "color": DEFAULT_PALETTE[palette_idx % len(DEFAULT_PALETTE)],
                            "visible": True,
                            "count": 0
                        }
                        palette_idx += 1

                    layers_dict[layer_name]["count"] += 1
                    layer_color = layers_dict[layer_name]["color"]

                    g_type = geom.get("type", "")
                    coords = geom.get("coordinates", [])

                    if g_type == "LineString" and len(coords) >= 2:
                        if len(coords) == 2:
                            stats["lines"] += 1
                            stats["total"] += 1
                            x1, y1 = coords[0][0], coords[0][1]
                            x2, y2 = coords[1][0], coords[1][1]
                            update_bounds(x1, y1)
                            update_bounds(x2, y2)
                            entities.append({
                                "type": "LINE",
                                "layer": layer_name,
                                "color": layer_color,
                                "start": [x1, y1],
                                "end": [x2, y2]
                            })
                        else:
                            stats["polylines"] += 1
                            stats["total"] += 1
                            pts = []
                            for c in coords:
                                update_bounds(c[0], c[1])
                                pts.append([c[0], c[1]])
                            entities.append({
                                "type": "POLYLINE",
                                "layer": layer_name,
                                "color": layer_color,
                                "points": pts,
                                "closed": False
                            })
                    elif g_type == "Polygon" and len(coords) > 0:
                        ring = coords[0]
                        stats["polylines"] += 1
                        stats["total"] += 1
                        pts = []
                        for c in ring:
                            update_bounds(c[0], c[1])
                            pts.append([c[0], c[1]])
                        entities.append({
                            "type": "POLYLINE",
                            "layer": layer_name,
                            "color": layer_color,
                            "points": pts,
                            "closed": True
                        })
                    elif g_type == "Point":
                        text_val = props.get("Text")
                        x, y = coords[0], coords[1]
                        update_bounds(x, y)
                        if text_val:
                            stats["texts"] += 1
                            stats["total"] += 1
                            entities.append({
                                "type": "TEXT",
                                "layer": layer_name,
                                "color": layer_color,
                                "point": [x, y],
                                "text": str(text_val),
                                "height": 3.5
                            })
                        else:
                            stats["total"] += 1
                            entities.append({
                                "type": "POINT",
                                "layer": layer_name,
                                "color": layer_color,
                                "point": [x, y]
                            })
        except Exception as e:
            print(f"Error parsing GeoJSON from DWG: {e}")

        # 3. Convert to DXF for export
        dxf_text = ""
        try:
            subprocess.run([dwg2dxf_bin, "-y", "-o", dxf_path, dwg_path], capture_output=True, text=True, timeout=18)
            if os.path.exists(dxf_path):
                with open(dxf_path, "r", errors="ignore") as f_dxf:
                    dxf_text = f_dxf.read()
        except Exception:
            pass

        # If GeoJSON produced 0 entities, fallback to parsing generated DXF
        if not entities and dxf_text:
            dxf_parsed = parse_dxf_text(dxf_text, filename)
            return dxf_parsed

        if min_x == float('inf') or max_x == float('-inf'):
            min_x, min_y, max_x, max_y = 0.0, 0.0, 100.0, 100.0

        width = max_x - min_x
        height = max_y - min_y
        if width <= 0: width = 10.0
        if height <= 0: height = 10.0

        return {
            "status": "success",
            "filename": filename,
            "format": "DWG",
            "version": version_label,
            "file_size": len(dwg_bytes),
            "extents": {
                "min_x": round(min_x, 4),
                "min_y": round(min_y, 4),
                "max_x": round(max_x, 4),
                "max_y": round(max_y, 4),
                "width": round(width, 4),
                "height": round(height, 4)
            },
            "layers": layers_dict,
            "entities": entities,
            "stats": stats,
            "dxf_available": bool(dxf_text),
            "dxf_content": dxf_text if len(dxf_text) < 1500000 else ""
        }


def parse_dxf_text(dxf_content, filename="drawing.dxf"):
    """
    Native Python DXF parser for ASCII AutoCAD DXF drawings.
    Extracts layers, lines, circles, arcs, lwpolylines, text, dimensions.
    """
    lines = dxf_content.splitlines()
    num_lines = len(lines)

    layers = {}
    entities = []
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')
    stats = {"lines": 0, "circles": 0, "polylines": 0, "texts": 0, "arcs": 0, "total": 0}
    version_code = "AC1015"

    def update_bounds(x, y):
        nonlocal min_x, min_y, max_x, max_y
        if not math.isnan(x) and not math.isinf(x):
            min_x = min(min_x, x)
            max_x = max(max_x, x)
        if not math.isnan(y) and not math.isinf(y):
            min_y = min(min_y, y)
            max_y = max(max_y, y)

    i = 0
    in_entities_section = False
    in_tables_section = False
    in_header_section = False
    current_table = None

    while i < num_lines - 1:
        code_str = lines[i].strip()
        val_str = lines[i + 1].strip()
        i += 2

        try:
            code = int(code_str)
        except ValueError:
            continue

        if code == 0 and val_str == "SECTION":
            if i < num_lines - 1:
                next_code = lines[i].strip()
                next_val = lines[i + 1].strip()
                if next_code == "2":
                    i += 2
                    in_header_section = (next_val == "HEADER")
                    in_tables_section = (next_val == "TABLES")
                    in_entities_section = (next_val == "ENTITIES")
            continue

        if code == 0 and val_str == "ENDSEC":
            in_header_section = False
            in_tables_section = False
            in_entities_section = False
            continue

        if in_header_section and code == 9 and val_str == "$ACADVER":
            if i < num_lines - 1 and lines[i].strip() == "1":
                version_code = lines[i + 1].strip()
                i += 2
            continue

        # Parse Layers in TABLES
        if in_tables_section:
            if code == 2 and val_str == "LAYER":
                current_table = "LAYER"
            elif current_table == "LAYER" and code == 0 and val_str == "LAYER":
                layer_name = "0"
                layer_color_aci = 7
                while i < num_lines - 1:
                    lcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    lval = lines[i + 1].strip()
                    if lcode == 0:
                        break
                    i += 2
                    if lcode == 2:
                        layer_name = lval
                    elif lcode == 62:
                        try:
                            layer_color_aci = abs(int(lval))
                        except ValueError:
                            pass
                layers[layer_name] = {
                    "name": layer_name,
                    "color": aci_to_hex(layer_color_aci),
                    "visible": True,
                    "count": 0
                }
            continue

        # Parse Entities
        if in_entities_section and code == 0:
            etype = val_str.upper()
            if etype == "LINE":
                ent = {"layer": "0", "x1": 0.0, "y1": 0.0, "x2": 0.0, "y2": 0.0, "color": None}
                while i < num_lines - 1:
                    pcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    pval = lines[i + 1].strip()
                    if pcode == 0:
                        break
                    i += 2
                    if pcode == 8: ent["layer"] = pval
                    elif pcode == 10: ent["x1"] = float(pval)
                    elif pcode == 20: ent["y1"] = float(pval)
                    elif pcode == 11: ent["x2"] = float(pval)
                    elif pcode == 21: ent["y2"] = float(pval)
                    elif pcode == 62: ent["color"] = aci_to_hex(pval)

                update_bounds(ent["x1"], ent["y1"])
                update_bounds(ent["x2"], ent["y2"])
                stats["lines"] += 1
                stats["total"] += 1
                layer_name = ent["layer"]
                if layer_name not in layers:
                    layers[layer_name] = {"name": layer_name, "color": ent["color"] or "#38bdf8", "visible": True, "count": 0}
                layers[layer_name]["count"] += 1

                entities.append({
                    "type": "LINE",
                    "layer": layer_name,
                    "color": ent["color"] or layers[layer_name]["color"],
                    "start": [ent["x1"], ent["y1"]],
                    "end": [ent["x2"], ent["y2"]]
                })

            elif etype == "CIRCLE":
                ent = {"layer": "0", "cx": 0.0, "cy": 0.0, "r": 1.0, "color": None}
                while i < num_lines - 1:
                    pcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    pval = lines[i + 1].strip()
                    if pcode == 0:
                        break
                    i += 2
                    if pcode == 8: ent["layer"] = pval
                    elif pcode == 10: ent["cx"] = float(pval)
                    elif pcode == 20: ent["cy"] = float(pval)
                    elif pcode == 40: ent["r"] = float(pval)
                    elif pcode == 62: ent["color"] = aci_to_hex(pval)

                cx, cy, r = ent["cx"], ent["cy"], ent["r"]
                update_bounds(cx - r, cy - r)
                update_bounds(cx + r, cy + r)
                stats["circles"] += 1
                stats["total"] += 1
                layer_name = ent["layer"]
                if layer_name not in layers:
                    layers[layer_name] = {"name": layer_name, "color": ent["color"] or "#34d399", "visible": True, "count": 0}
                layers[layer_name]["count"] += 1

                entities.append({
                    "type": "CIRCLE",
                    "layer": layer_name,
                    "color": ent["color"] or layers[layer_name]["color"],
                    "center": [cx, cy],
                    "radius": r
                })

            elif etype == "ARC":
                ent = {"layer": "0", "cx": 0.0, "cy": 0.0, "r": 1.0, "start": 0.0, "end": 360.0, "color": None}
                while i < num_lines - 1:
                    pcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    pval = lines[i + 1].strip()
                    if pcode == 0:
                        break
                    i += 2
                    if pcode == 8: ent["layer"] = pval
                    elif pcode == 10: ent["cx"] = float(pval)
                    elif pcode == 20: ent["cy"] = float(pval)
                    elif pcode == 40: ent["r"] = float(pval)
                    elif pcode == 50: ent["start"] = float(pval)
                    elif pcode == 51: ent["end"] = float(pval)
                    elif pcode == 62: ent["color"] = aci_to_hex(pval)

                cx, cy, r = ent["cx"], ent["cy"], ent["r"]
                update_bounds(cx - r, cy - r)
                update_bounds(cx + r, cy + r)
                stats["arcs"] += 1
                stats["total"] += 1
                layer_name = ent["layer"]
                if layer_name not in layers:
                    layers[layer_name] = {"name": layer_name, "color": ent["color"] or "#f59e0b", "visible": True, "count": 0}
                layers[layer_name]["count"] += 1

                entities.append({
                    "type": "ARC",
                    "layer": layer_name,
                    "color": ent["color"] or layers[layer_name]["color"],
                    "center": [cx, cy],
                    "radius": r,
                    "start_angle": ent["start"],
                    "end_angle": ent["end"]
                })

            elif etype in ("LWPOLYLINE", "POLYLINE"):
                ent = {"layer": "0", "closed": False, "points": [], "color": None}
                cur_x = 0.0
                while i < num_lines - 1:
                    pcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    pval = lines[i + 1].strip()
                    if pcode == 0:
                        break
                    i += 2
                    if pcode == 8: ent["layer"] = pval
                    elif pcode == 70: ent["closed"] = bool(int(pval) & 1)
                    elif pcode == 10: cur_x = float(pval)
                    elif pcode == 20:
                        cur_y = float(pval)
                        ent["points"].append([cur_x, cur_y])
                        update_bounds(cur_x, cur_y)
                    elif pcode == 62: ent["color"] = aci_to_hex(pval)

                if ent["points"]:
                    stats["polylines"] += 1
                    stats["total"] += 1
                    layer_name = ent["layer"]
                    if layer_name not in layers:
                        layers[layer_name] = {"name": layer_name, "color": ent["color"] or "#a855f7", "visible": True, "count": 0}
                    layers[layer_name]["count"] += 1

                    entities.append({
                        "type": "POLYLINE",
                        "layer": layer_name,
                        "color": ent["color"] or layers[layer_name]["color"],
                        "points": ent["points"],
                        "closed": ent["closed"]
                    })

            elif etype in ("TEXT", "MTEXT"):
                ent = {"layer": "0", "x": 0.0, "y": 0.0, "h": 2.5, "text": "", "color": None}
                while i < num_lines - 1:
                    pcode = int(lines[i].strip()) if lines[i].strip().isdigit() else -1
                    pval = lines[i + 1].strip()
                    if pcode == 0:
                        break
                    i += 2
                    if pcode == 8: ent["layer"] = pval
                    elif pcode == 10: ent["x"] = float(pval)
                    elif pcode == 20: ent["y"] = float(pval)
                    elif pcode == 40: ent["h"] = float(pval)
                    elif pcode in (1, 3): ent["text"] += pval
                    elif pcode == 62: ent["color"] = aci_to_hex(pval)

                clean_text = re.sub(r'\\P|\\~|\{[^}]*\}', ' ', ent["text"]).strip()
                if clean_text:
                    update_bounds(ent["x"], ent["y"])
                    stats["texts"] += 1
                    stats["total"] += 1
                    layer_name = ent["layer"]
                    if layer_name not in layers:
                        layers[layer_name] = {"name": layer_name, "color": ent["color"] or "#ffffff", "visible": True, "count": 0}
                    layers[layer_name]["count"] += 1

                    entities.append({
                        "type": "TEXT",
                        "layer": layer_name,
                        "color": ent["color"] or layers[layer_name]["color"],
                        "point": [ent["x"], ent["y"]],
                        "text": clean_text,
                        "height": ent["h"]
                    })

    if min_x == float('inf') or max_x == float('-inf'):
        min_x, min_y, max_x, max_y = 0.0, 0.0, 100.0, 100.0

    width = max_x - min_x
    height = max_y - min_y
    if width <= 0: width = 10.0
    if height <= 0: height = 10.0

    version_label = AUTOCAD_VERSIONS.get(version_code, f"AutoCAD DXF ({version_code})")

    return {
        "status": "success",
        "filename": filename,
        "format": "DXF",
        "version": version_label,
        "file_size": len(dxf_content),
        "extents": {
            "min_x": round(min_x, 4),
            "min_y": round(min_y, 4),
            "max_x": round(max_x, 4),
            "max_y": round(max_y, 4),
            "width": round(width, 4),
            "height": round(height, 4)
        },
        "layers": layers,
        "entities": entities,
        "stats": stats,
        "dxf_available": True,
        "dxf_content": dxf_content if len(dxf_content) < 1500000 else ""
    }


def get_sample_cad(sample_type="floorplan"):
    """
    Generate realistic built-in CAD drawings for immediate testing.
    """
    if sample_type == "mechanical":
        layers = {
            "M-OUTLINE": {"name": "M-OUTLINE", "color": "#38bdf8", "visible": True, "count": 12},
            "M-CENTER": {"name": "M-CENTER", "color": "#f59e0b", "visible": True, "count": 6},
            "M-BOLTHOLES": {"name": "M-BOLTHOLES", "color": "#34d399", "visible": True, "count": 8},
            "M-HATCH": {"name": "M-HATCH", "color": "#64748b", "visible": True, "count": 16},
            "M-DIMENSIONS": {"name": "M-DIMENSIONS", "color": "#ec4899", "visible": True, "count": 8}
        }
        entities = []
        entities.append({"type": "LINE", "layer": "M-CENTER", "color": "#f59e0b", "start": [-120, 0], "end": [120, 0]})
        entities.append({"type": "LINE", "layer": "M-CENTER", "color": "#f59e0b", "start": [0, -120], "end": [0, 120]})
        entities.append({"type": "CIRCLE", "layer": "M-CENTER", "color": "#f59e0b", "center": [0, 0], "radius": 75})
        entities.append({"type": "CIRCLE", "layer": "M-OUTLINE", "color": "#38bdf8", "center": [0, 0], "radius": 100})
        entities.append({"type": "CIRCLE", "layer": "M-OUTLINE", "color": "#38bdf8", "center": [0, 0], "radius": 35})
        entities.append({"type": "LINE", "layer": "M-OUTLINE", "color": "#38bdf8", "start": [-6, 35], "end": [-6, 42]})
        entities.append({"type": "LINE", "layer": "M-OUTLINE", "color": "#38bdf8", "start": [-6, 42], "end": [6, 42]})
        entities.append({"type": "LINE", "layer": "M-OUTLINE", "color": "#38bdf8", "start": [6, 42], "end": [6, 35]})
        for i in range(8):
            ang = i * (math.pi / 4)
            bx = round(75 * math.cos(ang), 3)
            by = round(75 * math.sin(ang), 3)
            entities.append({"type": "CIRCLE", "layer": "M-BOLTHOLES", "color": "#34d399", "center": [bx, by], "radius": 7})
        entities.append({"type": "CIRCLE", "layer": "M-OUTLINE", "color": "#38bdf8", "center": [0, 0], "radius": 55})
        for offset in range(-90, 95, 12):
            if abs(offset) > 35:
                half_chord = math.sqrt(max(0, 100**2 - offset**2))
                entities.append({"type": "LINE", "layer": "M-HATCH", "color": "#64748b", "start": [offset, -half_chord * 0.7], "end": [offset, half_chord * 0.7]})
        entities.append({"type": "TEXT", "layer": "M-DIMENSIONS", "color": "#ec4899", "point": [0, -115], "text": "PCD Ø150.0mm (8x M12 HOLES)", "height": 6})
        entities.append({"type": "TEXT", "layer": "M-DIMENSIONS", "color": "#ec4899", "point": [0, -130], "text": "HIGH-PRESSURE ADAPTER FLANGE - DIN 2501", "height": 7})
        entities.append({"type": "TEXT", "layer": "M-DIMENSIONS", "color": "#ec4899", "point": [-30, 48], "text": "KEYWAY 12x4.0", "height": 4.5})

        stats = {"lines": 20, "circles": 11, "polylines": 0, "texts": 3, "arcs": 0, "total": 34}
        extents = {"min_x": -130, "min_y": -140, "max_x": 130, "max_y": 130, "width": 260, "height": 270}
        filename = "mechanical_flange_sample.dwg"
        version_label = "AutoCAD 2021 Precision Standard (Metric)"

    elif sample_type == "schematic":
        layers = {
            "E-RAIL": {"name": "E-RAIL", "color": "#ef4444", "visible": True, "count": 6},
            "E-SIGNAL": {"name": "E-SIGNAL", "color": "#38bdf8", "visible": True, "count": 18},
            "E-COMPONENTS": {"name": "E-COMPONENTS", "color": "#22c55e", "visible": True, "count": 15},
            "E-LABELS": {"name": "E-LABELS", "color": "#eab308", "visible": True, "count": 12},
            "E-GROUND": {"name": "E-GROUND", "color": "#94a3b8", "visible": True, "count": 4}
        }
        entities = []
        entities.append({"type": "LINE", "layer": "E-RAIL", "color": "#ef4444", "start": [-100, 80], "end": [100, 80]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#ef4444", "point": [-115, 82], "text": "+5V VCC", "height": 5})
        entities.append({"type": "LINE", "layer": "E-GROUND", "color": "#94a3b8", "start": [-100, -60], "end": [100, -60]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#94a3b8", "point": [-115, -62], "text": "GND (0V)", "height": 5})
        entities.append({"type": "POLYLINE", "layer": "E-COMPONENTS", "color": "#22c55e", "points": [[-20, 30], [-20, -10], [20, 10]], "closed": True})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#ffffff", "point": [-10, 8], "text": "U1: LM358", "height": 4.5})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [-50, 20], "end": [-20, 20]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#ffffff", "point": [-18, 22], "text": "-", "height": 4})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [-50, 0], "end": [-20, 0]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#ffffff", "point": [-18, 2], "text": "+", "height": 4})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [20, 10], "end": [70, 10]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#38bdf8", "point": [75, 12], "text": "VOUT (SIGNAL)", "height": 5})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [40, 10], "end": [40, 50]})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [40, 50], "end": [15, 50]})
        entities.append({"type": "POLYLINE", "layer": "E-COMPONENTS", "color": "#22c55e", "points": [[15, 50], [10, 55], [5, 45], [0, 55], [-5, 45], [-10, 55], [-15, 50]], "closed": False})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [-15, 50], "end": [-35, 50]})
        entities.append({"type": "LINE", "layer": "E-SIGNAL", "color": "#38bdf8", "start": [-35, 50], "end": [-35, 20]})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#eab308", "point": [-5, 60], "text": "R1: 100kΩ (1%)", "height": 4.5})
        entities.append({"type": "POLYLINE", "layer": "E-COMPONENTS", "color": "#22c55e", "points": [[-50, 20], [-55, 25], [-60, 15], [-65, 25], [-70, 15], [-75, 25], [-80, 20]], "closed": False})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#eab308", "point": [-75, 30], "text": "R2: 10kΩ", "height": 4.5})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#38bdf8", "point": [-105, 22], "text": "VIN (AUDIO)", "height": 5})
        entities.append({"type": "POLYLINE", "layer": "E-RAIL", "color": "#ef4444", "points": [[-120, -75], [120, -75], [120, 95], [-120, 95]], "closed": True})
        entities.append({"type": "TEXT", "layer": "E-LABELS", "color": "#ffffff", "point": [20, -70], "text": "ANALOG PREAMPLIFIER SCHEMATIC v2.4", "height": 5.5})

        stats = {"lines": 14, "circles": 0, "polylines": 4, "texts": 8, "arcs": 0, "total": 26}
        extents = {"min_x": -125, "min_y": -80, "max_x": 125, "max_y": 100, "width": 250, "height": 180}
        filename = "analog_schematic_sample.dwg"
        version_label = "AutoCAD Electrical 2024 (ANSI Schematic)"

    else:
        layers = {
            "A-WALL-EXT": {"name": "A-WALL-EXT", "color": "#38bdf8", "visible": True, "count": 10},
            "A-WALL-INT": {"name": "A-WALL-INT", "color": "#60a5fa", "visible": True, "count": 12},
            "A-DOORS": {"name": "A-DOORS", "color": "#f59e0b", "visible": True, "count": 8},
            "A-WINDOWS": {"name": "A-WINDOWS", "color": "#22d3ee", "visible": True, "count": 6},
            "A-FURNITURE": {"name": "A-FURNITURE", "color": "#a855f7", "visible": True, "count": 14},
            "A-DIMENSIONS": {"name": "A-DIMENSIONS", "color": "#ec4899", "visible": True, "count": 10},
            "A-LABELS": {"name": "A-LABELS", "color": "#ffffff", "visible": True, "count": 7}
        }
        entities = []
        entities.append({"type": "POLYLINE", "layer": "A-WALL-EXT", "color": "#38bdf8", "points": [[0, 0], [120, 0], [120, 90], [0, 90]], "closed": True})
        entities.append({"type": "POLYLINE", "layer": "A-WALL-EXT", "color": "#38bdf8", "points": [[3, 3], [117, 3], [117, 87], [3, 87]], "closed": True})

        entities.append({"type": "LINE", "layer": "A-WALL-INT", "color": "#60a5fa", "start": [60, 3], "end": [60, 55]})
        entities.append({"type": "LINE", "layer": "A-WALL-INT", "color": "#60a5fa", "start": [3, 55], "end": [117, 55]})
        entities.append({"type": "LINE", "layer": "A-WALL-INT", "color": "#60a5fa", "start": [65, 55], "end": [65, 87]})
        entities.append({"type": "LINE", "layer": "A-WALL-INT", "color": "#60a5fa", "start": [40, 55], "end": [40, 87]})

        entities.append({"type": "LINE", "layer": "A-DOORS", "color": "#f59e0b", "start": [20, 3], "end": [20, 15]})
        entities.append({"type": "ARC", "layer": "A-DOORS", "color": "#f59e0b", "center": [20, 3], "radius": 12, "start_angle": 0, "end_angle": 90})
        entities.append({"type": "LINE", "layer": "A-DOORS", "color": "#f59e0b", "start": [25, 55], "end": [25, 45]})
        entities.append({"type": "ARC", "layer": "A-DOORS", "color": "#f59e0b", "center": [25, 55], "radius": 10, "start_angle": 270, "end_angle": 360})
        entities.append({"type": "LINE", "layer": "A-DOORS", "color": "#f59e0b", "start": [75, 55], "end": [75, 45]})
        entities.append({"type": "ARC", "layer": "A-DOORS", "color": "#f59e0b", "center": [75, 55], "radius": 10, "start_angle": 180, "end_angle": 270})

        entities.append({"type": "LINE", "layer": "A-WINDOWS", "color": "#22d3ee", "start": [75, 1.5], "end": [105, 1.5]})
        entities.append({"type": "LINE", "layer": "A-WINDOWS", "color": "#22d3ee", "start": [75, 3], "end": [105, 3]})
        entities.append({"type": "LINE", "layer": "A-WINDOWS", "color": "#22d3ee", "start": [80, 88.5], "end": [105, 88.5]})
        entities.append({"type": "LINE", "layer": "A-WINDOWS", "color": "#22d3ee", "start": [10, 88.5], "end": [30, 88.5]})

        entities.append({"type": "POLYLINE", "layer": "A-FURNITURE", "color": "#a855f7", "points": [[70, 15], [105, 15], [105, 25], [70, 25]], "closed": True})
        entities.append({"type": "POLYLINE", "layer": "A-FURNITURE", "color": "#a855f7", "points": [[78, 30], [97, 30], [97, 38], [78, 38]], "closed": True})
        entities.append({"type": "CIRCLE", "layer": "A-FURNITURE", "color": "#a855f7", "center": [25, 35], "radius": 10})
        entities.append({"type": "POLYLINE", "layer": "A-FURNITURE", "color": "#a855f7", "points": [[75, 62], [105, 62], [105, 82], [75, 82]], "closed": True})
        entities.append({"type": "POLYLINE", "layer": "A-FURNITURE", "color": "#a855f7", "points": [[8, 62], [32, 62], [32, 82], [8, 82]], "closed": True})

        entities.append({"type": "TEXT", "layer": "A-LABELS", "color": "#ffffff", "point": [75, 42], "text": "GREAT LIVING ROOM (5.8m x 5.2m)", "height": 4.5})
        entities.append({"type": "TEXT", "layer": "A-LABELS", "color": "#ffffff", "point": [12, 42], "text": "OPEN KITCHEN & DINING", "height": 4.5})
        entities.append({"type": "TEXT", "layer": "A-LABELS", "color": "#ffffff", "point": [78, 72], "text": "MASTER SUITE (5.2m x 3.2m)", "height": 4.5})
        entities.append({"type": "TEXT", "layer": "A-LABELS", "color": "#ffffff", "point": [10, 72], "text": "BEDROOM 2 (3.7m x 3.2m)", "height": 4.5})
        entities.append({"type": "TEXT", "layer": "A-LABELS", "color": "#ffffff", "point": [43, 72], "text": "BATH", "height": 3.8})

        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [0, -8], "end": [120, -8]})
        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [0, -12], "end": [0, -4]})
        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [120, -12], "end": [120, -4]})
        entities.append({"type": "TEXT", "layer": "A-DIMENSIONS", "color": "#ec4899", "point": [50, -14], "text": "TOTAL LENGTH: 12,000 mm", "height": 4.2})

        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [-8, 0], "end": [-8, 90]})
        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [-12, 0], "end": [-4, 0]})
        entities.append({"type": "LINE", "layer": "A-DIMENSIONS", "color": "#ec4899", "start": [-12, 90], "end": [-4, 90]})
        entities.append({"type": "TEXT", "layer": "A-DIMENSIONS", "color": "#ec4899", "point": [-22, 45], "text": "9,000 mm", "height": 4.2})

        stats = {"lines": 18, "circles": 1, "polylines": 6, "texts": 7, "arcs": 3, "total": 35}
        extents = {"min_x": -30, "min_y": -22, "max_x": 130, "max_y": 98, "width": 160, "height": 120}
        filename = "architectural_floorplan_sample.dwg"
        version_label = "AutoCAD 2024 Architectural (Metric mm)"

    return {
        "status": "success",
        "filename": filename,
        "format": "DWG",
        "version": version_label,
        "extents": extents,
        "layers": layers,
        "entities": entities,
        "stats": stats,
        "dxf_available": True
    }
