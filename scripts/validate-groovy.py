import base64
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

URL = os.environ.get("JENKINS_URL", "http://127.0.0.1").rstrip("/")
USER = os.environ.get("JENKINS_USER", "")
TOKEN = os.environ.get("JENKINS_TOKEN", "")
ROOT = Path(__file__).resolve().parent.parent

if not USER or not TOKEN:
    sys.exit("can JENKINS_USER va JENKINS_TOKEN")

AUTH = base64.b64encode(f"{USER}:{TOKEN}".encode()).decode()


def check(path):
    body = urllib.parse.urlencode({"jenkinsfile": path.read_text(encoding="utf-8")}).encode()
    request = urllib.request.Request(f"{URL}/pipeline-model-converter/validate", data=body)
    request.add_header("Authorization", f"Basic {AUTH}")
    return urllib.request.urlopen(request, timeout=30).read().decode(errors="replace").strip()


given = [Path(argument) for argument in sys.argv[1:]]
files = given or [ROOT / "Jenkinsfile"] + sorted((ROOT / "platform/pipeline-library/vars").glob("*.groovy"))
failed = 0

for path in files:
    result = check(path)
    if "successfully validated" in result:
        print(f"OK    {path.name}")
    else:
        failed += 1
        print(f"FAIL  {path.name}: {result}")

print(f"\n{len(files) - failed}/{len(files)} OK")
sys.exit(1 if failed else 0)
