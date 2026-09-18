import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get("JENKINS_URL", "http://127.0.0.1").rstrip("/")
USER = os.environ.get("JENKINS_USER", "")
TOKEN = os.environ.get("JENKINS_TOKEN", "")
REPO = os.environ.get("PLATFORM_LIB_REPO", "https://github.com/lyduchuy1204/containerized-cicd-platform.git")
BRANCH = os.environ.get("PLATFORM_LIB_VERSION", "main")

NODE_NAME = os.environ.get("JENKINS_NODE_NAME", "executor-cluster-local")
NODE_REMOTE_FS = os.environ.get("JENKINS_NODE_REMOTE_FS", "/home/jenkins/agent")
NODE_EXECUTORS = os.environ.get("JENKINS_NODE_EXECUTORS", "3")

PROJECT = "product-media"
SERVICES = ["api", "portal", "worker"]
KINDS = [
    ("main", "Mainstream: trigger validate, ci, cd dev, promote, cd staging, cd prod."),
    ("ci", "Clone the service repo, build the image, push build tag and pointer tag."),
    ("promote", "Move a pointer tag to an existing build tag. No rebuild."),
    ("cd", "Deploy one environment of the service."),
]


def job_list():
    jobs = [("platform-validate", "Jenkinsfile",
             "Platform gate: render overlays, check manifest policy, server dry run.")]
    for service in SERVICES:
        for kind, description in KINDS:
            jobs.append((
                f"{PROJECT}-{service}-{kind}",
                f"projects/{PROJECT}/services/{service}/{kind}.Jenkinsfile",
                f"{service}: {description}",
            ))
    return jobs


JOBS = job_list()

CONFIG = """<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>{description}</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>{repo}</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/{branch}</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="empty-list"/>
      <extensions/>
    </scm>
    <scriptPath>{script}</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
"""


def call(path, data=None, content_type=None):
    if not USER or not TOKEN:
        sys.exit("can JENKINS_USER va JENKINS_TOKEN")
    auth = base64.b64encode(f"{USER}:{TOKEN}".encode()).decode()
    request = urllib.request.Request(URL + path, data=data)
    request.add_header("Authorization", "Basic " + auth)
    if content_type:
        request.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, response.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode(errors="replace")


def whoami():
    status, body = call("/whoAmI/api/json")
    if status != 200:
        print(f"auth that bai, http {status}")
        print(body[:300])
        return False
    data = json.loads(body)
    print(f"whoAmI: {data.get('name')} | authenticated={data.get('authenticated')}")
    return True


def existing():
    status, body = call("/api/json?tree=jobs[name]")
    if status != 200:
        return []
    return [job["name"] for job in json.loads(body).get("jobs", [])]


def build(name, params=None):
    job = urllib.parse.quote(name)
    attempts = []
    if params:
        attempts.append(f"/job/{job}/buildWithParameters?" + urllib.parse.urlencode(params))
        attempts.append(f"/job/{job}/build")
    else:
        attempts.append(f"/job/{job}/build")
        attempts.append(f"/job/{job}/buildWithParameters")

    for endpoint in attempts:
        status, body = call(endpoint, data=b"")
        if status in (200, 201, 302):
            mode = "voi tham so" if "buildWithParameters" in endpoint else "khong tham so"
            print(f"trigger {name}: http {status} ({mode})")
            return True
    print(f"trigger {name}: that bai, http {status}")
    return False


def result(name, number="lastBuild"):
    status, body = call(f"/job/{urllib.parse.quote(name)}/{number}/api/json?tree=number,result,building,displayName")
    if status != 200:
        print(f"  chua co build nao ({status})")
        return None
    data = json.loads(body)
    print(f"  build #{data['number']} {data.get('displayName', '')}: "
          f"building={data['building']} result={data.get('result')}")
    return data


def console(name, number="lastBuild", tail=60):
    status, body = call(f"/job/{urllib.parse.quote(name)}/{number}/consoleText")
    if status != 200:
        print(f"  khong lay duoc log ({status})")
        return
    lines = body.rstrip().split("\n")
    for line in lines[-tail:]:
        print("  " + line)


def create():
    present = existing()
    for name, script, description in JOBS:
        body = CONFIG.format(description=description, repo=REPO, branch=BRANCH, script=script).encode()
        if name in present:
            status, response = call(f"/job/{name}/config.xml", data=body, content_type="application/xml")
            action = "cap nhat"
        else:
            status, response = call(f"/createItem?name={urllib.parse.quote(name)}", data=body,
                                    content_type="application/xml")
            action = "tao moi"
        mark = "OK  " if status in (200, 302) else "FAIL"
        print(f"{mark} {action} {name}  (http {status})  scriptPath={script}")
        if status not in (200, 302):
            print("      " + response.strip().split("\n")[0][:200])


def node_exists():
    status, _ = call(f"/computer/{urllib.parse.quote(NODE_NAME)}/api/json?tree=displayName")
    return status == 200


def node_secret():
    status, body = call(f"/computer/{urllib.parse.quote(NODE_NAME)}/jenkins-agent.jnlp")
    if status != 200:
        print(f"  khong doc duoc secret ({status})")
        return None
    found = re.search(r"<argument>([0-9a-f]{64})</argument>", body)
    if not found:
        print("  khong tim thay secret trong jnlp")
        return None
    return found.group(1)


def node_create():
    payload = {
        "name": NODE_NAME,
        "nodeDescription": "Agent chay docker, kubectl, aws cli cho platform pipeline.",
        "numExecutors": NODE_EXECUTORS,
        "remoteFS": NODE_REMOTE_FS,
        "labelString": NODE_NAME,
        "mode": "EXCLUSIVE",
        "type": "hudson.slaves.DumbSlave",
        "retentionStrategy": {"stapler-class": "hudson.slaves.RetentionStrategy$Always"},
        "nodeProperties": {"stapler-class-bag": "true"},
        "launcher": {
            "stapler-class": "hudson.slaves.JNLPLauncher",
            "$class": "hudson.slaves.JNLPLauncher",
            "workDirSettings": {
                "disabled": False,
                "workDirPath": "",
                "internalDir": "remoting",
                "failIfWorkDirIsMissing": False,
            },
            "webSocket": True,
        },
    }
    form = urllib.parse.urlencode({
        "name": NODE_NAME,
        "type": "hudson.slaves.DumbSlave",
        "json": json.dumps(payload),
    }).encode()
    status, body = call("/computer/doCreateItem", data=form,
                        content_type="application/x-www-form-urlencoded")
    if status in (200, 302):
        print(f"OK   tao moi node {NODE_NAME} (http {status})")
        return True
    print(f"FAIL tao node {NODE_NAME} (http {status})")
    print("      " + body.strip().split("\n")[0][:200])
    return False


def node():
    if node_exists():
        print(f"node {NODE_NAME} da ton tai, bo qua buoc tao")
    elif not node_create():
        return False
    secret = node_secret()
    if not secret:
        return False
    print(f"  name   = {NODE_NAME}")
    print(f"  label  = {NODE_NAME}")
    print(f"  secret = {secret}")
    print("  ghi secret nay vao JENKINS_AGENT_SECRET trong file .env")
    return True


def show():
    for name in existing():
        status, body = call(f"/job/{urllib.parse.quote(name)}/api/json?tree=name,description")
        if status == 200:
            data = json.loads(body)
            print(f"  {data['name']}: {data.get('description', '')}")
        else:
            print(f"  {name}")


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "whoami"

    if action == "whoami":
        if whoami():
            print("job hien co:")
            show()
        return 0

    if action == "create":
        if not whoami():
            return 1
        create()
        return 0

    if action == "node":
        if not whoami():
            return 1
        return 0 if node() else 1

    if action == "list":
        show()
        return 0

    if action == "build":
        name = sys.argv[2]
        params = dict(pair.split("=", 1) for pair in sys.argv[3:])
        return 0 if build(name, params) else 1

    if action == "result":
        result(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "lastBuild")
        return 0

    if action == "log":
        console(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "lastBuild")
        return 0

    sys.exit(f"lenh khong biet: {action}. Dung whoami, node, create, list, build, result, log")


if __name__ == "__main__":
    sys.exit(main())
