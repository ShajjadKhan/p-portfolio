#!/bin/bash
# run_dwg_viewer.sh - Launch the DWG File Viewer App
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -f "$DIR/venv/bin/python3" ]; then
    "$DIR/venv/bin/python3" "$DIR/dwg_standalone_app.py" "$@"
else
    python3 "$DIR/dwg_standalone_app.py" "$@"
fi
